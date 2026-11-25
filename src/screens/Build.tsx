import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { play, sfx, stopVoice } from "../audio/engine.ts";
import { afterTooManyMisses, afterWord, pickDecoys } from "../core/decoys.ts";
import { drawFromBag, shuffle } from "../core/random.ts";
import { mediaKey, type Word } from "../core/types.ts";
import { activeWords, has, media, phonemes, progress, setProgress, settings, targetSound } from "../store/store.ts";
import { Bar, NotReady } from "../ui/Bar.tsx";
import { DominoStrip } from "../ui/DominoStrip.tsx";
import { useAlive } from "../ui/hooks.ts";
import { Muted, Speaker } from "../ui/icons.tsx";
import { TileFace } from "../ui/LetterTile.tsx";
import { popFrom } from "../ui/fx.ts";
import { sleep } from "../ui/nav.ts";
import { Picture } from "../ui/Picture.tsx";
import { rewardCorrect } from "../ui/rewards.ts";

let bag: string[] = [];

/** Mode 1: sounds → words. */
export function Build() {
  const [turn, setTurn] = useState(0);
  const last = useRef<string | null>(null);
  const word = useMemo(() => {
    const d = drawFromBag(bag, activeWords.value.map(w => w.id), last.current);
    bag = d.bag;
    last.current = d.next;
    return activeWords.value.find(w => w.id === d.next) ?? null;
  }, [turn]);
  if (!word) return <NotReady picture="🧩">Grown-up: switch on some words first (gear, then Words).</NotReady>;
  return <BuildWord key={turn} word={word} onNext={() => setTurn(t => t + 1)} />;
}

interface Body {
  id: number;
  grapheme: string;
  phonemeId: string;
  decoy: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where the gentle wandering is heading, in radians. */
  heading: number;
  state: "float" | "drag" | "placed" | "leaving";
  slot: number;
  el: HTMLButtonElement | null;
  /** Where an eased move (into a slot, or back into the play area) is going. */
  to: { x: number; y: number } | null;
}

const SPEED = 26;

function BuildWord({ word, onNext }: { word: Word; onNext: () => void }) {
  const alive = useAlive();
  const stage = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const slotEls = useRef<(HTMLElement | null)[]>([]);
  const [filled, setFilled] = useState<(number | null)[]>(() => word.tiles.map(() => null));
  const [lit, setLit] = useState(-1);
  const [done, setDone] = useState(false);
  const misses = useRef(0);
  const finished = useRef(false);

  const bodies = useMemo<Body[]>(() => {
    const count = Math.min(progress.value.level, settings.value.maxDecoys);
    const decoys = count > 0 ? pickDecoys(word, count, phonemes.value, targetSound.value, id => has(mediaKey.phoneme(id))) : [];
    const all = shuffle([...word.tiles.map(t => ({ ...t, decoy: false })), ...decoys.map(t => ({ ...t, decoy: true }))]);
    return all.map((t, id) => ({ ...t, id, x: -999, y: -999, vx: 0, vy: 0, heading: Math.random() * Math.PI * 2, state: "float", slot: -1, el: null, to: null }));
  }, []);

  // ---- Where things are. Measured on layout changes only, so dragging never forces a re-measure. ----
  const area = useRef({ l: 0, t: 0, r: 0, b: 0, size: 100 });
  const slotAt = useRef<{ x: number; y: number }[]>([]);
  const measure = () => {
    const s = stage.current;
    if (!s || !box.current) return;
    const o = s.getBoundingClientRect();
    const size = bodies[0]?.el?.offsetWidth ?? 100;
    const strip = s.querySelector(".domino-strip")?.getBoundingClientRect();
    const boxRect = box.current.getBoundingClientRect();
    const old = area.current;
    const next = { l: 14, t: boxRect.bottom - o.top + 16, r: o.width - 14 - size, b: (strip ? strip.top - o.top : o.height) - 10 - size, size };
    next.r = Math.max(next.l + 1, next.r);
    next.b = Math.max(next.t + 1, next.b);
    area.current = next;
    slotAt.current = slotEls.current.slice(0, word.tiles.length).filter(el => el !== null).map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left - o.left + (r.width - size) / 2, y: r.top - o.top + (r.height - size) / 2 };
    });
    bodies.forEach((b, i) => {
      if (b.state === "placed") b.to = slotAt.current[b.slot];
      else if (b.x < -900) {
        // First showing: spread the tiles out so that none start on top of another.
        const cols = bodies.length;
        b.x = next.l + ((i + 0.5) / cols) * (next.r - next.l + size) - size / 2;
        b.y = next.t + (next.b - next.t) * (0.2 + 0.6 * Math.random());
      } else if (old.r > old.l) {
        // The iPad was turned: keep each tile in about the same part of the play area.
        b.x = next.l + ((b.x - old.l) / (old.r - old.l)) * (next.r - next.l);
        b.y = next.t + ((b.y - old.t) / (old.b - old.t)) * (next.b - next.t);
      }
      b.x = Math.max(0, Math.min(o.width - size, b.x));
      paint(b);
    });
  };
  const paint = (b: Body, scale = 1) => {
    if (b.el) b.el.style.transform = `translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0) scale(${scale})`;
  };

  useLayoutEffect(() => {
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(stage.current!);
    watch.observe(box.current!);
    let frame = 0;
    let then = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.034, (now - then) / 1000);
      then = now;
      const a = area.current;
      for (const b of bodies) {
        if (b.state === "drag") continue;
        if (b.to) {
          const k = 1 - Math.exp(-dt * (b.state === "placed" ? 18 : 6));
          b.x += (b.to.x - b.x) * k;
          b.y += (b.to.y - b.y) * k;
          if (Math.abs(b.to.x - b.x) + Math.abs(b.to.y - b.y) < 1) {
            b.x = b.to.x;
            b.y = b.to.y;
            b.to = null;
          }
          paint(b);
          continue;
        }
        if (b.state !== "float") continue;
        b.heading += (Math.random() - 0.5) * dt * 2.4;
        b.vx += (Math.cos(b.heading) * SPEED - b.vx) * dt * 0.9;
        b.vy += (Math.sin(b.heading) * SPEED * 0.75 - b.vy) * dt * 0.9;
        for (const o of bodies) {
          if (o === b || o.state !== "float" || o.to) continue;
          const dx = b.x - o.x;
          const dy = b.y - o.y;
          const d = Math.hypot(dx, dy) || 1;
          const room = a.size * 1.18;
          if (d < room) {
            const push = (1 - d / room) * 170 * dt;
            b.vx += (dx / d) * push;
            b.vy += (dy / d) * push;
          }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Soft walls: turn around, losing a little speed.
        if (b.x < a.l) { b.x = a.l; b.vx = Math.abs(b.vx) * 0.7; b.heading = (Math.random() - 0.5) * 2; }
        if (b.x > a.r) { b.x = a.r; b.vx = -Math.abs(b.vx) * 0.7; b.heading = Math.PI + (Math.random() - 0.5) * 2; }
        if (b.y < a.t) { b.y = a.t; b.vy = Math.abs(b.vy) * 0.7; b.heading = Math.PI / 2 + (Math.random() - 0.5) * 2; }
        if (b.y > a.b) { b.y = a.b; b.vy = -Math.abs(b.vy) * 0.7; b.heading = -Math.PI / 2 + (Math.random() - 0.5) * 2; }
        paint(b);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
    };
  }, []);

  // ---- Touch ----
  const held = useRef<{ b: Body; pointer: number; dx: number; dy: number; x0: number; y0: number; moved: boolean; ox: number; oy: number } | null>(null);

  const down = (b: Body, e: PointerEvent) => {
    if (e.button > 0) return;
    if (b.state === "placed") {
      hear(b.phonemeId);
      return;
    }
    // One tile at a time: a resting palm must not steal another.
    if (held.current || finished.current || b.state !== "float") return;
    const o = stage.current!.getBoundingClientRect();
    held.current = { b, pointer: e.pointerId, dx: e.clientX - o.left - b.x, dy: e.clientY - o.top - b.y, x0: e.clientX, y0: e.clientY, moved: false, ox: o.left, oy: o.top };
    b.state = "drag";
    b.to = null;
    b.el!.classList.add("held");
    try {
      b.el!.setPointerCapture(e.pointerId);
    } catch {
      /* the touch has already ended */
    }
    paint(b, 1.08);
  };
  const move = (e: PointerEvent) => {
    const h = held.current;
    if (!h || h.pointer !== e.pointerId) return;
    if (!h.moved && Math.hypot(e.clientX - h.x0, e.clientY - h.y0) > 12) h.moved = true;
    if (!h.moved) return;
    h.b.x = e.clientX - h.ox - h.dx;
    h.b.y = e.clientY - h.oy - h.dy;
    paint(h.b, 1.08);
  };
  const up = (e: PointerEvent, cancelled = false) => {
    const h = held.current;
    if (!h || h.pointer !== e.pointerId) return;
    held.current = null;
    const b = h.b;
    if (!b.el || !alive.current) return;
    b.el.classList.remove("held");
    b.state = "float";
    paint(b);
    if (!h.moved) {
      if (!cancelled) hear(b.phonemeId);
      return;
    }
    if (cancelled) return drift(b);
    drop(b);
  };

  const hear = (phonemeId: string) => void play(mediaKey.phoneme(phonemeId));

  /** Float gently back to somewhere open in the play area. */
  const drift = (b: Body) => {
    const a = area.current;
    if (b.x >= a.l && b.x <= a.r && b.y >= a.t && b.y <= a.b) return;
    const x = Math.max(a.l, Math.min(a.r, b.x + (Math.random() - 0.5) * 120));
    b.to = { x, y: a.t + (a.b - a.t) * (0.25 + 0.6 * Math.random()) };
  };

  const drop = (b: Body) => {
    const size = area.current.size;
    let best = -1;
    let dist = Infinity;
    slotAt.current.forEach((s, i) => {
      const d = Math.hypot(b.x - s.x, b.y - s.y);
      if (d < dist) { dist = d; best = i; }
    });
    if (best < 0 || dist > size * 0.85 || taken.current[best] !== null) return drift(b);
    const want = word.tiles[best];
    if (want.grapheme !== b.grapheme || want.phonemeId !== b.phonemeId) {
      drift(b);
      missed();
      return;
    }
    b.state = "placed";
    b.slot = best;
    b.to = slotAt.current[best];
    b.el!.classList.add("placed");
    taken.current[best] = b.id;
    setFilled([...taken.current]);
    sfx.snap();
    const length = play(mediaKey.phoneme(b.phonemeId));
    if (taken.current.every(x => x !== null)) void complete(Math.max(0.5, length) + 0.35);
  };
  const taken = useRef<(number | null)[]>(word.tiles.map(() => null));

  const missed = () => {
    misses.current++;
    if (misses.current === settings.value.dropAfter && progress.value.level > 0) {
      setProgress(afterTooManyMisses(progress.value));
      // Make this word easier straight away as well: one of the extra tiles floats off.
      const extra = bodies.find(b => b.decoy && b.state === "float");
      if (extra) {
        extra.state = "leaving";
        extra.el?.classList.add("leaving");
      }
    }
  };

  const complete = async (wait: number) => {
    if (finished.current) return;
    finished.current = true;
    setProgress(afterWord(progress.value, misses.current, settings.value));
    for (const b of bodies) {
      if (b.state !== "placed") {
        b.state = "leaving";
        b.el?.classList.add("leaving");
      }
    }
    popFrom(box.current);
    await sleep(wait);
    for (let i = 0; i < word.tiles.length; i++) {
      if (!alive.current) return;
      setLit(i);
      await sleep(Math.max(0.4, play(mediaKey.phoneme(word.tiles[i].phonemeId))) + 0.15);
    }
    if (!alive.current) return;
    setLit(-1);
    setDone(true);
    await sleep(Math.max(0.6, play(mediaKey.word(word.id))) + 0.3);
    if (!alive.current) return;
    await rewardCorrect();
    if (alive.current) onNext();
  };

  useEffect(() => () => stopVoice(), []);
  const spoken = has(mediaKey.word(word.id));
  void media.value;

  return (
    <main class="screen build" ref={stage} style={{ "--tiles": word.tiles.length }}>
      <Bar><span class={`word-picture ${done ? "hop" : ""}`}><Picture mediaKey={mediaKey.wordPicture(word.id)} emoji={word.emoji} /></span></Bar>
      <div class="word-line">
        <div class={`word-box ${done ? "done" : ""}`} ref={box}>
          {word.tiles.map((_, i) => <span key={i} class={`slot ${filled[i] !== null ? "full" : ""}`} ref={el => void (slotEls.current[i] = el)} />)}
        </div>
        <button class={`round say ${spoken ? "" : "no-sound"}`} aria-label={spoken ? "Play the word" : "The word is not recorded yet"} onClick={() => !finished.current && play(mediaKey.word(word.id))}>{spoken ? <Speaker size={60} /> : <Muted size={60} />}</button>
      </div>
      {bodies.map(b => (
        <button
          key={b.id}
          class="float-tile"
          aria-label={`Sound ${b.grapheme}`}
          ref={el => void (b.el = el)}
          onPointerDown={e => down(b, e)}
          onPointerMove={move}
          onPointerUp={e => up(e)}
          onPointerCancel={e => up(e, true)}
          onLostPointerCapture={e => up(e, true)}
        >
          <span class={`tile-wrap ${lit >= 0 && b.slot === lit ? "lit" : ""}`}><TileFace grapheme={b.grapheme} phonemeId={b.phonemeId} muted={b.phonemeId !== "silent" && !has(mediaKey.phoneme(b.phonemeId))} /></span>
        </button>
      ))}
      <DominoStrip />
    </main>
  );
}
