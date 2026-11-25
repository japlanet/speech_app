import { signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { sfx } from "../audio/engine.ts";
import { beat, FALL, finalAngle, marblePath, type Run } from "../core/dominoes.ts";
import { allDown, BIG_ROLL, bigRun, FILL, finaleLength, IMPACT, IN, leap, noteGap, OUT, stepLength, TOPPLE, TUNE } from "../core/party.ts";
import { prize } from "../core/prizes.ts";
import { drawFromBag, shuffle } from "../core/random.ts";
import { progress } from "../store/store.ts";
import { drawDomino, drawMarble } from "./draw.ts";
import { Bits, drawSprite, fitScreen } from "./fx.ts";

interface Show {
  kind: "dominoes" | "run";
  from: number;
  to: number;
  of: number;
  done: () => void;
}
const show = signal<Show | null>(null);

/** Fill the screen with the progress so far, moving on from one count to the next. */
export function celebrate(kind: Show["kind"], from: number, to: number, of: number): Promise<void> {
  if (show.value) return Promise.resolve();
  return new Promise(done => {
    show.value = {
      kind, from, to, of,
      done: () => {
        show.value = null;
        done();
      },
    };
  });
}

/** Lives beside the screens, so it covers whichever one is showing. */
export function CelebrationLayer() {
  return show.value ? <Celebration key={show.value.to + show.value.kind} {...show.value} /> : null;
}

// ---- No two celebrations running look the same ----
const SKIES = [["#ffd84d", "#ffb52e"], ["#7fd6ff", "#4cb4f5"], ["#ffa9cd", "#ff82b4"], ["#a8ecc2", "#6fd79b"], ["#cdb8ff", "#ab8cf5"], ["#ffb894", "#ff9468"]];
const FRIENDS = ["🦖", "🐙", "🦊", "🐼", "🦄", "🐸", "🐵", "🐯", "🐧", "🦁", "🐶", "🐱"];
const THROWN = [["⭐"], ["🎈"], ["💛", "💙", "💚"], ["🌈"], ["🍭", "🍬"], ["🫧"], ["🌸", "🌼"], ["🍓", "🍌"]];
const ENTRANCES = ["drop", "rocket", "saucer", "balloons", "cartwheel"] as const;
type Entrance = (typeof ENTRANCES)[number];
const bags: Record<string, { bag: string[]; last: string | null }> = {};
function fresh(name: string, count: number): number {
  const b = (bags[name] ??= { bag: [], last: null });
  const d = drawFromBag(b.bag, Array.from({ length: count }, (_, i) => String(i)), b.last);
  bags[name] = { bag: d.bag, last: d.next };
  return Number(d.next);
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const hop = (x: number) => (x > 0 && x < 1 ? Math.sin(Math.PI * x) : 0);

function Celebration({ kind, from, to, of, done }: Show) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bits = useRef(new Bits());
  const [closing, setClosing] = useState(false);
  const [look] = useState(() => ({ sky: SKIES[fresh("sky", SKIES.length)], thrown: THROWN[fresh("thrown", THROWN.length)], entrance: ENTRANCES[fresh("entrance", ENTRANCES.length)], friends: shuffle(FRIENDS) }));
  const finale = kind === "dominoes" && to >= of;
  const slots = Math.max(to, of);
  const count = kind === "run" ? Math.max(1, Math.round((to / of) * 4)) : to;
  const total = finale ? finaleLength(to) : stepLength(count);

  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dominoes = prize(progress.value.chosen.domino).colours ?? ["#d9a066"];
    const marble = prize(progress.value.chosen.marble).colours ?? ["#5fb4ff", "#1c5fc4"];
    const b = bits.current;
    let { g, W, H } = fitScreen(canvas.current!);
    let r: Run = bigRun(W, H, to, slots);
    let path: number[] = [];
    let base = H * 0.66;
    let radius = 20;
    const measure = () => {
      if (!canvas.current) return;
      ({ g, W, H } = fitScreen(canvas.current));
      r = bigRun(W, H, to, slots);
      base = H * 0.66;
      radius = Math.max(20, r.h * 0.2);
      if (finale) path = marblePath(r, W, radius);
    };
    measure();
    window.addEventListener("resize", measure);

    const thick = Math.max(40, Math.min(58, H * 0.06));
    /** How far along the bar each count reaches. */
    const barX = (n: number) => (n <= 0 ? 24 : n >= slots ? W - 24 : r.x0 + (n - 0.5) * r.gap + r.w / 2);
    const runX = (share: number) => 70 + (W - 250) * share;
    const runY = (x: number) => H * 0.5 + Math.sin((x / W) * 8) * H * 0.1;
    const landX = () => r.x0 + (to - 1) * r.gap + r.w / 2;

    // ---- What happens when ----
    const events: [number, () => void][] = [[0, () => sfx.whoosh()]];
    const step = noteGap(count);
    const big = Math.min(1, 0.45 + 0.55 * (to / of));
    if (kind === "dominoes") {
      events.push([IMPACT, () => {
        sfx.boom();
        b.burst(landX(), base - r.h * 0.4, Math.round(40 + 40 * big), { speed: 900, emoji: look.thrown });
      }]);
      if (finale) {
        for (let i = 0; i < to; i++) events.push([TOPPLE + i * beat(to) + 0.1, () => sfx.click(i)]);
        for (let i = 0; i < 7; i++) events.push([allDown(to) + (i * BIG_ROLL) / 7, () => {
          b.burst(W * (0.1 + 0.8 * Math.random()), H * (0.12 + 0.25 * Math.random()), 34, { speed: 560, emoji: look.thrown, pull: 420 });
          sfx.firework();
        }]);
        for (let i = 0; i < 16; i++) events.push([allDown(to) + (i * BIG_ROLL) / 16, () => sfx.roll(i / 16)]);
        events.push([allDown(to), () => { sfx.fanfare(); b.rain(W, 70, look.thrown); }]);
      } else events.push([IMPACT + FILL, () => b.burst(barX(to), base + thick / 2, 24, { speed: 460, emoji: ["⭐"] })]);
    } else {
      for (let i = 0; i < 12; i++) events.push([IN + 0.1 + (i * (TUNE - IN - 0.2)) / 12, () => sfx.roll(i / 12)]);
      events.push([TUNE - 0.1, () => {
        sfx.boom();
        const x = runX(to / of);
        b.burst(x, runY(x) - 60, 70, { speed: 900, emoji: look.thrown });
      }]);
    }
    if (!finale) {
      for (let i = 0; i < count; i++) events.push([TUNE + i * step, () => sfx.note(i, count)]);
      events.push([leap(count), () => {
        sfx.chord();
        b.rain(W, Math.round(30 + 50 * big), look.thrown);
        for (const x of [0.14, 0.86]) b.burst(W * x, H * 0.75, Math.round(18 + 22 * big), { speed: 1100, up: 700, emoji: look.thrown });
      }]);
    }
    events.sort((x, y) => x[0] - y[0]);
    const friends = look.friends.slice(0, finale ? 5 : Math.min(5, 1 + Math.ceil((4 * to) / of / 1.4)));

    // ---- Drawing ----
    const star = (x: number, y: number, t: number, size: number) => drawSprite(g, kind === "run" ? "🎁" : "⭐", x, y, size * (1 + 0.1 * Math.sin(t * 7) + 0.35 * hop((t - IMPACT - FILL) / 0.5)), finale ? t * 2 : Math.sin(t * 5) * 0.14);
    const bar = (t: number) => {
      const shape = (x0: number, x1: number, pad: number, colour: string) => {
        g.lineCap = "round";
        g.lineWidth = thick + pad;
        g.strokeStyle = colour;
        g.beginPath();
        g.moveTo(x0, base + thick / 2);
        g.lineTo(Math.max(x0, x1), base + thick / 2);
        g.stroke();
      };
      const x0 = 24 + thick / 2;
      const x1 = W - 24 - thick / 2;
      shape(x0, x1, 10, "#1b2238");
      shape(x0, x1, -2, "#fffaf0");
      const k = easeOut(clamp((t - IMPACT) / FILL));
      const head = barX(from) + (barX(to) - barX(from)) * k;
      if (head > 30) {
        shape(x0, Math.min(x1, head), -8, "#1f9d57");
        g.lineCap = "round";
        g.lineWidth = thick * 0.2;
        g.strokeStyle = "rgb(255 255 255 / .45)";
        g.beginPath();
        g.moveTo(x0, base + thick * 0.3);
        g.lineTo(Math.max(x0, Math.min(x1, head)), base + thick * 0.3);
        g.stroke();
      }
      for (let i = 0; i < slots; i++) {
        g.beginPath();
        g.arc(r.x0 + i * r.gap + r.w / 2, base + thick / 2, thick * 0.15, 0, 7);
        g.fillStyle = i < from || (i < to && t > IMPACT + 0.2) ? "#fff" : "#cdb98c";
        g.fill();
      }
      if (k > 0 && k < 1) drawSprite(g, "✨", head, base + thick / 2, thick * 2);
      star(W - 24 - thick / 2, base + thick / 2, t, thick * 1.9);
    };
    const carrier: Partial<Record<Entrance, string>> = { rocket: "🚀", saucer: "🛸", balloons: "🎈" };
    const newcomer = (t: number) => {
      const u = clamp((t - IN) / (IMPACT - IN));
      const x = landX();
      let dx = 0;
      let dy = 0;
      let turn = 0;
      if (look.entrance === "drop") dy = -(1 - u * u) * H;
      else if (look.entrance === "cartwheel") {
        dx = -(1 - u) * (x + r.h);
        dy = -Math.abs(Math.sin(u * Math.PI * 2.5 + Math.PI / 2)) * H * 0.34 * (1 - u * 0.55) * (u < 1 ? 1 : 0);
        turn = (u - 1) * Math.PI * 6;
      } else if (look.entrance === "balloons") {
        dy = -(1 - u) * H * 0.95;
        dx = Math.sin(u * 7) * 46 * (1 - u);
        turn = Math.sin(u * 7) * 0.16 * (1 - u);
      } else {
        const side = look.entrance === "rocket" ? -1 : 1;
        const v = easeOut(clamp(u / 0.65));
        dx = side * (1 - v) * (W + r.h);
        dy = -H * 0.15 * (1 - clamp((u - 0.65) / 0.35) ** 2);
      }
      // Squash on landing, then spring back.
      const s = t > IMPACT ? Math.exp(-(t - IMPACT) * 9) * Math.cos((t - IMPACT) * 26) * 0.3 : 0;
      const gone = Math.max(0, t - IMPACT);
      const c = carrier[look.entrance];
      const cx = x + dx;
      const cy = base - r.h + dy - 60 - gone * gone * 2600 - gone * 120;
      if (c && cy > -300) {
        if (c === "🛸" && u > 0.6 && u < 1) {
          g.fillStyle = "rgb(255 255 170 / .55)";
          g.beginPath();
          g.moveTo(cx - 30, cy);
          g.lineTo(cx + 30, cy);
          g.lineTo(cx + r.h * 0.6, base);
          g.lineTo(cx - r.h * 0.6, base);
          g.fill();
        }
        if (c === "🎈") {
          g.strokeStyle = "#1b2238";
          g.lineWidth = 3;
          for (const o of [-1, 0, 1]) {
            g.beginPath();
            g.moveTo(cx, cy + 60);
            g.lineTo(cx + o * 58, cy - 40 - (o ? 0 : 34));
            g.stroke();
            drawSprite(g, c, cx + o * 58, cy - 60 - (o ? 0 : 34), 130, o * 0.12);
          }
        } else drawSprite(g, c, cx, cy - 20, 190, c === "🚀" ? 0.4 : Math.sin(t * 9) * 0.1);
      }
      g.save();
      g.translate(x + dx, base + dy - r.h / 2);
      g.rotate(turn);
      g.translate(0, r.h / 2);
      g.scale(1 + s, 1 - s);
      g.translate(-x, -base);
      drawDomino(g, r, to - 1, 0, base - r.h * 0.4 * (hop((t - TUNE - (to - 1) * step) / 0.3) + hop((t - leap(to)) / 0.45)), dominoes);
      g.restore();
    };
    const chain = (t: number) => {
      bar(t);
      for (let i = to - 2; i >= 0; i--) {
        // Everyone already there gets a bump from the landing, then plays a note, then leaps.
        const jump = 0.22 * hop((t - IMPACT - 0.05 - (to - 2 - i) * 0.05) / 0.32) + (finale ? 0 : 0.4 * hop((t - TUNE - i * step) / 0.3) + 0.4 * hop((t - leap(to)) / 0.45));
        drawDomino(g, r, i, 0, base - r.h * jump, dominoes);
      }
      newcomer(t);
      const ring = clamp((t - IMPACT) / 0.5);
      if (ring > 0 && ring < 1) {
        g.beginPath();
        g.ellipse(landX(), base, ring * W * 0.55, ring * W * 0.2, 0, 0, 7);
        g.lineWidth = 22 * (1 - ring);
        g.strokeStyle = `rgb(255 255 255 / ${0.9 * (1 - ring)})`;
        g.stroke();
      }
    };
    const toppling = (t: number) => {
      bar(t);
      for (let i = to - 1; i >= 0; i--) {
        const k = clamp((t - TOPPLE - i * beat(to)) / FALL);
        drawDomino(g, r, i, finalAngle(r, i) * k * k, base, dominoes);
      }
      const roll = (t - allDown(to)) / BIG_ROLL;
      if (roll > 0) {
        const x = -radius + (W + radius * 3) * Math.min(1, roll);
        const y = base + (path[Math.max(0, Math.min(path.length - 1, Math.round(x / 2)))] ?? -radius);
        drawMarble(g, x, y, radius, x / radius, marble);
        if (b.list.length < 150) b.burst(x, y, 1, { speed: 160, emoji: ["⭐"], size: 0.7, life: 0.6 });
      }
    };
    const marbleRun = (t: number) => {
      const share = (from + (to - from) * easeInOut(clamp((t - IN - 0.1) / (TUNE - IN - 0.2)))) / of;
      const line = (end: number, width: number, colour: string) => {
        g.lineCap = g.lineJoin = "round";
        g.lineWidth = width;
        g.strokeStyle = colour;
        g.beginPath();
        for (let i = 0; i <= 60; i++) {
          const x = runX((end * i) / 60);
          if (i) g.lineTo(x, runY(x));
          else g.moveTo(x, runY(x));
        }
        g.stroke();
      };
      line(1, 76, "#1b2238");
      line(1, 60, "#e8c894");
      if (share > 0) line(share, 60, "#1f9d57");
      const jolt = hop((t - leap(count)) / 0.5);
      drawSprite(g, "🎁", W - 100, runY(runX(1)) - 60, 190 * (1 + 0.06 * Math.sin(t * 6) + 0.3 * jolt), Math.sin(t * 5) * 0.1);
      const x = runX(share);
      let high = 120 * jolt;
      for (let i = 0; i < count; i++) high += 46 * hop((t - TUNE - i * step) / 0.22);
      drawMarble(g, x, runY(x) - 76 - high, 56, x / 56, marble);
      if (t < TUNE && b.list.length < 120) b.burst(x, runY(x) - 70, 1, { speed: 200, emoji: ["⭐"], size: 0.8, life: 0.6 });
    };
    const company = (t: number) => {
      const size = Math.min(W, H) * 0.27;
      friends.forEach((f, i) => {
        const rise = easeOut(clamp((t - IMPACT - 0.1 - i * 0.08) / 0.35));
        if (rise <= 0) return;
        const x = (W * (i + 1)) / (friends.length + 1);
        const bounce = Math.abs(Math.sin(t * 7 + i * 0.9)) * size * 0.2;
        drawSprite(g, f, x, H + size * 0.5 - rise * size * 0.95 - bounce, size, Math.sin(t * 7 + i) * 0.16);
      });
    };

    // ---- Running it ----
    const began = performance.now();
    let then = began;
    let frame = 0;
    let next = 0;
    let shut = false;
    const tick = (now: number) => {
      const t = (now - began) / 1000;
      const dt = Math.min(0.034, (now - then) / 1000);
      then = now;
      while (next < events.length && t >= events[next][0]) {
        // After a pause, do not fire off everything that was missed at once.
        if (t - events[next][0] < 0.4) events[next][1]();
        next++;
      }
      g.clearRect(0, 0, W, H);
      g.save();
      const since = t - (kind === "run" ? TUNE - 0.1 : IMPACT);
      if (!still && since > 0 && since < 0.45) {
        const shake = 16 * (1 - since / 0.45);
        g.translate(Math.sin(since * 90) * shake, Math.cos(since * 73) * shake);
      }
      company(t);
      if (kind === "run") marbleRun(t);
      else if (finale && t > TOPPLE) toppling(t);
      else chain(t);
      g.restore();
      b.step(g, dt, H);
      if (!shut && t > total - OUT) {
        shut = true;
        setClosing(true);
      }
      if (t < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // A timer ends it, so that play goes on even if frames stop (the app was put in the background).
    const end = setTimeout(done, total * 1000);
    return () => {
      clearTimeout(end);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Little fingers join in: every touch throws some more.
  const touch = (e: PointerEvent) => {
    bits.current.burst(e.clientX, e.clientY, 18, { speed: 420, emoji: look.thrown });
    sfx.pop();
  };
  return (
    <div class={`party ${closing ? "closing" : ""}`} aria-label="Hooray" onPointerDown={touch} style={{ "--sky": look.sky[0], "--ray": look.sky[1] }}>
      <i class="rays" />
      <canvas ref={canvas} />
    </div>
  );
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (2 - 2 * x) ** 2 / 2);
