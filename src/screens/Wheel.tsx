import { useEffect, useRef, useState } from "preact/hooks";
import { play, sfx, stopVoice } from "../audio/engine.ts";
import { inkFor } from "../core/colours.ts";
import { prize, type Prize } from "../core/prizes.ts";
import { planSpin, spinAngle } from "../core/spin.ts";
import { mediaKey, type Wheel as WheelData } from "../core/types.ts";
import { activeWheel, addRep, centreKey, colourOf, has, media, progress, repsToday, today, winPrize } from "../store/store.ts";
import { Bar, NotReady } from "../ui/Bar.tsx";
import { useAlive } from "../ui/hooks.ts";
import { Muted, Speaker, Spin, Talking } from "../ui/icons.tsx";
import { cased, MutedBadge } from "../ui/LetterTile.tsx";
import { Picture } from "../ui/Picture.tsx";
import { Track } from "../ui/Track.tsx";
import { Unlock } from "../ui/Unlock.tsx";

/** Mode 3: this week's practice wheel. */
export function Wheel() {
  const wheel = activeWheel.value;
  if (!wheel || wheel.items.length === 0) return <NotReady picture="🎡">Grown-up: choose this week’s wheel and give it some pictures (gear, then Wheels).</NotReady>;
  return <WheelGame key={wheel.id} wheel={wheel} />;
}

const SLICES = ["#f7c52b", "#6cc5f3", "#f291b8", "#93e3c1", "#ff9d85", "#bda8ee"];
/** With an odd count, make sure the last slice never matches the first. */
const sliceColour = (i: number, n: number) => (i === n - 1 && i % SLICES.length === 0 && n > 1 ? SLICES[3] : SLICES[i % SLICES.length]);
const TAU = Math.PI * 2;
/** One tap per attempt: ignore a burst of taps. */
const COOLDOWN = 1100;

function WheelGame({ wheel }: { wheel: WheelData }) {
  const alive = useAlive();
  const n = wheel.items.length;
  const disc = useRef<HTMLDivElement>(null);
  const pictures = useRef<(HTMLElement | null)[]>([]);
  const pointer = useRef<HTMLElement>(null);
  const sparks = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const frame = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [cool, setCool] = useState(false);
  const [won, setWon] = useState<{ prize: Prize | null } | null>(null);
  const busy = useRef(false);
  void media.value;

  const draw = () => {
    if (disc.current) disc.current.style.transform = `rotate(${angle.current}deg)`;
    for (const el of pictures.current) if (el) el.style.transform = `rotate(${-angle.current}deg)`;
  };
  useEffect(() => {
    draw();
    return () => {
      cancelAnimationFrame(frame.current);
      stopVoice();
    };
  }, []);

  // ---- Spinning ----
  const pegs = n * Math.max(1, Math.round(18 / n));
  const lastPeg = useRef(0);
  const lastTick = useRef(0);
  const tickPast = (now: number) => {
    const peg = Math.floor(angle.current / (360 / pegs));
    if (peg === lastPeg.current) return;
    const way = peg > lastPeg.current ? 1 : -1;
    lastPeg.current = peg;
    if (now - lastTick.current < 34) return;
    lastTick.current = now;
    sfx.tick();
    pointer.current?.animate([{ transform: `rotate(${-16 * way}deg)` }, { transform: "rotate(0)" }], { duration: 110, easing: "ease-out" });
  };

  const spin = (speed: number) => {
    if (busy.current) return;
    busy.current = true;
    stopVoice();
    setSpinning(true);
    setLanded(false);
    setCurrent(null);
    setReady(false);
    const plan = planSpin(angle.current, speed, n);
    const began = performance.now();
    let nextSpark = 0;
    const step = (now: number) => {
      const t = (now - began) / 1000;
      angle.current = spinAngle(plan, t);
      draw();
      tickPast(now);
      if (t < plan.seconds * 0.8 && now > nextSpark) {
        nextSpark = now + 90;
        spark();
      }
      if (t < plan.seconds) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      angle.current = ((plan.to % 360) + 360) % 360;
      lastPeg.current = Math.floor(angle.current / (360 / pegs));
      draw();
      busy.current = false;
      if (!alive.current) return;
      setSpinning(false);
      setCurrent(plan.lands);
      setLanded(true);
      sfx.land();
    };
    frame.current = requestAnimationFrame(step);
  };

  const effect = prize(progress.value.chosen.spin);
  const spark = () => {
    if (effect.id === "sp-plain" || !sparks.current) return;
    const el = document.createElement("i");
    el.textContent = effect.emoji;
    const a = Math.random() * TAU;
    el.style.left = `${50 + 48 * Math.cos(a)}%`;
    el.style.top = `${50 + 48 * Math.sin(a)}%`;
    sparks.current.append(el);
    const go = el.animate(
      [{ transform: "translate(-50%,-50%) scale(.4)", opacity: 1 }, { transform: `translate(calc(-50% + ${70 * Math.cos(a)}px), calc(-50% + ${70 * Math.sin(a)}px)) scale(1.2)`, opacity: 0 }],
      { duration: 900, easing: "ease-out" },
    );
    go.onfinish = () => el.remove();
    setTimeout(() => el.remove(), 1200);
  };

  // ---- Swipe to spin; tap a picture to hear it ----
  const grab = useRef<{ id: number; a0: number; from: number; x: number; y: number; moved: boolean; trail: [number, number][] } | null>(null);
  const angleOf = (e: PointerEvent) => {
    const r = disc.current!.parentElement!.getBoundingClientRect();
    return (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180) / Math.PI;
  };
  const down = (e: PointerEvent) => {
    if (busy.current || grab.current) return;
    grab.current = { id: e.pointerId, a0: angleOf(e), from: angle.current, x: e.clientX, y: e.clientY, moved: false, trail: [] };
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* the touch has already ended */
    }
  };
  const move = (e: PointerEvent) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    const a = angleOf(e);
    if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 14) {
      g.moved = true;
      g.a0 = a;
    }
    if (!g.moved) return;
    let turn = a - g.a0;
    turn -= 360 * Math.round(turn / 360);
    g.a0 = a;
    g.from += turn;
    angle.current = g.from;
    const now = performance.now();
    g.trail.push([now, g.from]);
    while (g.trail.length > 2 && now - g.trail[0][0] > 110) g.trail.shift();
    draw();
    tickPast(now);
  };
  const up = (e: PointerEvent, cancelled = false) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    grab.current = null;
    if (!alive.current || !disc.current) return;
    if (g.moved) {
      const first = g.trail[0];
      const last = g.trail[g.trail.length - 1];
      const dt = first && last ? (last[0] - first[0]) / 1000 : 0;
      const speed = dt > 0.01 ? (last[1] - first[1]) / dt : 0;
      spin(Math.abs(speed) < 40 ? 260 * (speed < 0 ? -1 : 1) : speed * 1.15);
      return;
    }
    if (cancelled) return;
    // A tap: which slice is under the finger?
    const r = disc.current!.parentElement!.getBoundingClientRect();
    const far = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) / (r.width / 2);
    if (far > 1.02) return;
    const slice = 360 / n;
    const at = ((Math.round((angleOf(e) + 90 - angle.current) / slice) % n) + n) % n;
    if (current !== at) setLanded(false);
    say(at);
  };

  const say = (i: number) => {
    if (busy.current) return;
    setCurrent(i);
    setReady(true);
    play(mediaKey.wheelItem(wheel.items[i].id));
  };

  const said = () => {
    if (cool) return;
    setCool(true);
    setTimeout(() => alive.current && setCool(false), COOLDOWN);
    const wins = addRep();
    sfx.rep(Math.min(1, repsToday.value / wheel.target));
    if (wins) setTimeout(() => alive.current && setWon({ prize: winPrize() }), 900);
  };

  const item = current === null ? null : wheel.items[current];
  const itemHeard = item ? has(mediaKey.wheelItem(item.id)) : false;
  const middle = centreKey(wheel);
  const colour = wheel.phonemeId ? colourOf(wheel.phonemeId) : "#fffaf0";
  const R = 100;
  const at = (deg: number, r: number) => `${(r * Math.sin((deg * Math.PI) / 180)).toFixed(3)} ${(-r * Math.cos((deg * Math.PI) / 180)).toFixed(3)}`;
  const slice = 360 / n;

  return (
    <main class="screen wheel-screen">
      <Bar />
      <div class="wheel-main">
        <div class={`wheel-wrap ${spinning ? "spinning" : ""}`}>
          <div class="wheel" onPointerDown={down} onPointerMove={move} onPointerUp={e => up(e)} onPointerCancel={e => up(e, true)} onLostPointerCapture={e => up(e, true)}>
            <div class="disc" ref={disc}>
              <svg viewBox="-104 -104 208 208" aria-hidden="true">
                <circle r="103" fill="#1b2238" />
                {n === 1 ? <circle r={R - 1} fill={SLICES[0]} /> : wheel.items.map((i, k) => (
                  <path key={i.id} d={`M0 0L${at((k - 0.5) * slice, R - 1)}A${R - 1} ${R - 1} 0 ${slice > 180 ? 1 : 0} 1 ${at((k + 0.5) * slice, R - 1)}z`} fill={sliceColour(k, n)} stroke="#fffaf0" stroke-width="2" class={current === k ? "lit" : ""} />
                ))}
                {Array.from({ length: pegs }, (_, k) => <circle key={k} cx={R * 0.955 * Math.sin((TAU * k) / pegs)} cy={-R * 0.955 * Math.cos((TAU * k) / pegs)} r="2.1" fill="#fffaf0" stroke="#1b2238" stroke-width=".8" />)}
              </svg>
              {wheel.items.map((i, k) => {
                const a = (k * slice * Math.PI) / 180;
                const size = n <= 6 ? 25 : n <= 8 ? 21 : 17;
                return (
                  <span key={i.id} class="wheel-item" style={{ left: `${50 + 33.5 * Math.sin(a)}%`, top: `${50 - 33.5 * Math.cos(a)}%`, "--size": `${size}cqw` }}>
                    <span class={`wheel-pic ${current === k ? "lit" : ""}`} ref={el => void (pictures.current[k] = el)}>
                      <Picture mediaKey={mediaKey.itemPicture(i.id)} emoji={i.emoji || "⭐"} />
                      {!has(mediaKey.wheelItem(i.id)) && <MutedBadge />}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          <div class="sparks" ref={sparks} />
          <button class="hub" style={{ background: colour, color: inkFor(wheel.phonemeId ? colour : "#ffffff") }} aria-label={`Sound ${wheel.centre}`} onClick={() => !busy.current && play(middle)}>
            {cased(wheel.centre)}
            {!has(middle) && <MutedBadge />}
          </button>
          <i class="pointer" ref={pointer}><svg viewBox="0 0 60 80"><path d="M4 6h52L30 76z" fill="#db3a2d" stroke="#1b2238" stroke-width="6" stroke-linejoin="round" /></svg></i>
        </div>
        <div class="wheel-side">
          {item ? (
            <button class={`landed ${landed && !ready ? "inviting" : ""}`} aria-label={`Hear ${item.label}`} onClick={() => current !== null && say(current)}>
              <Picture mediaKey={mediaKey.itemPicture(item.id)} emoji={item.emoji || "⭐"} />
              <span class="landed-word">{cased(item.label)}</span>
              <span class={`landed-speaker ${itemHeard ? "" : "off"}`}>{itemHeard ? <Speaker size={44} /> : <Muted size={44} />}</span>
            </button>
          ) : <div class="landed empty" />}
          <div class="wheel-buttons">
            <button class="spin-button" aria-label="Spin" disabled={spinning} onClick={() => spin(700 + Math.random() * 600)}><Spin size={64} /></button>
            <button class={`said-button ${ready ? "" : "hidden"} ${cool ? "cool" : ""}`} aria-label="I said it!" disabled={!ready || cool} onClick={said}><Talking size={88} /><span>I said it!</span></button>
          </div>
        </div>
      </div>
      <Track count={repsToday.value} target={wheel.target} won={progress.value.lastPrizeDate === today.value} />
      {won && <Unlock prize={won.prize} onClose={() => setWon(null)} />}
    </main>
  );
}
