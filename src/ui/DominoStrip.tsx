import { useEffect, useRef, useState } from "preact/hooks";
import { sfx } from "../audio/engine.ts";
import { beat, corners, FALL, finalAngle, layRun, marblePath, ROLL, type Run } from "../core/dominoes.ts";
import { prize } from "../core/prizes.ts";
import { progress, setProgress, settings } from "../store/store.ts";
import { strip } from "./rewards.ts";
import { Confetti } from "./Unlock.tsx";

const RADIUS = 17;
const SHELF = 14;

/** The domino chain along the bottom of the screen. It grows by one for every right answer, then falls. */
export function DominoStrip() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [party, setParty] = useState(false);
  const chain = progress.value.chain;
  const dominoes = prize(progress.value.chosen.domino).colours ?? ["#d9a066"];
  const marble = prize(progress.value.chosen.marble).colours ?? ["#5fb4ff", "#1c5fc4"];
  const look = useRef({ dominoes, marble });
  look.current = { dominoes, marble };

  useEffect(() => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    let W = 0;
    let H = 0;
    let frame = 0;
    let stop: (() => void) | null = null;
    let falling: Promise<void> | null = null;

    const resize = () => {
      if (!box.current) return;
      const r = box.current.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height - Number.parseFloat(getComputedStyle(box.current).paddingBottom || "0");
      c.width = Math.round(W * ratio);
      c.height = Math.round(H * ratio);
      c.style.height = `${H}px`;
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint();
    };
    const run = (count: number) => layRun(W, H - SHELF, count, Math.max(count, settings.value.roundLength));

    const shelf = (r: Run) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#b9783f";
      g.fillRect(0, H - SHELF, W, SHELF);
      g.fillStyle = "#e0b27c";
      g.fillRect(0, H - SHELF, W, 4);
      g.fillStyle = "rgb(27 34 56 / .3)";
      for (let i = r.count; i < settings.value.roundLength; i++) g.fillRect(r.x0 + i * r.gap, H - SHELF - 3, r.w, 4);
    };
    const domino = (r: Run, i: number, angle: number, lift = 0) => {
      const pts = corners(r, i, angle);
      const y0 = H - SHELF - lift;
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(x, y0 + y) : g.moveTo(x, y0 + y)));
      g.closePath();
      g.lineJoin = "round";
      g.fillStyle = look.current.dominoes[i % look.current.dominoes.length];
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = "#1b2238";
      g.stroke();
      g.fillStyle = "rgb(255 255 255 / .75)";
      for (const t of [0.25, 0.75]) {
        const x = (pts[0][0] + pts[3][0]) / 2 + ((pts[1][0] + pts[2][0] - pts[0][0] - pts[3][0]) / 2) * t;
        const y = (pts[0][1] + pts[3][1]) / 2 + ((pts[1][1] + pts[2][1] - pts[0][1] - pts[3][1]) / 2) * t;
        g.beginPath();
        g.arc(x, y0 + y, r.w * 0.17, 0, 7);
        g.fill();
      }
    };
    const paint = () => {
      if (falling) return;
      const r = run(progress.value.chain);
      shelf(r);
      for (let i = 0; i < r.count; i++) domino(r, i, 0);
    };

    /** Run something every frame until it returns false, or until the screen is left. */
    const animate = (step: (t: number) => boolean) =>
      new Promise<void>(done => {
        const began = performance.now();
        const finish = () => {
          cancelAnimationFrame(frame);
          clearTimeout(guard);
          stop = null;
          done();
        };
        // Frames stop while the app is in the background; never leave the game waiting for them.
        const guard = setTimeout(finish, 6000);
        stop = finish;
        const tick = (now: number) => {
          if (!step((now - began) / 1000)) return finish();
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      });

    const settle = () => falling ?? Promise.resolve();
    const add = async () => {
      const r = run(progress.value.chain);
      const drop = 0.26;
      await animate(t => {
        const k = Math.min(1, t / drop);
        shelf(r);
        for (let i = 0; i < r.count - 1; i++) domino(r, i, 0);
        domino(r, r.count - 1, 0, (1 - k * k) * (H - SHELF));
        return k < 1;
      });
      sfx.place();
      paint();
    };
    const topple = () => {
      if (falling) return falling;
      const count = progress.value.chain;
      if (count < 1) return Promise.resolve();
      const work = async () => {
        const r = run(count);
        const path = marblePath(r, W, RADIUS);
        const every = beat(count);
        const allDown = (count - 1) * every + FALL + 0.15;
        let clicks = 0;
        let rolled = -1;
        await animate(t => {
          shelf(r);
          while (clicks < count && t > clicks * every + 0.1) sfx.click(clicks++);
          const roll = (t - allDown) / ROLL;
          // Draw from the far end, so that each domino lies on top of the next.
          for (let i = count - 1; i >= 0; i--) {
            const k = Math.max(0, Math.min(1, (t - i * every) / FALL));
            domino(r, i, finalAngle(r, i) * k * k);
          }
          if (roll > 0) {
            if (rolled < 0) setParty(true);
            const x = -RADIUS + (W + RADIUS * 3) * Math.min(1, roll);
            const y = H - SHELF + (path[Math.max(0, Math.min(path.length - 1, Math.round(x / 2)))] ?? -RADIUS);
            const bump = Math.floor(roll * 14);
            if (bump !== rolled) {
              rolled = bump;
              sfx.roll(roll);
            }
            g.save();
            g.translate(x, y);
            const shade = g.createRadialGradient(-6, -7, 2, 0, 0, RADIUS);
            shade.addColorStop(0, "#fff");
            shade.addColorStop(0.3, look.current.marble[0]);
            shade.addColorStop(1, look.current.marble[1]);
            g.beginPath();
            g.arc(0, 0, RADIUS, 0, 7);
            g.fillStyle = shade;
            g.fill();
            g.lineWidth = 3;
            g.strokeStyle = "#1b2238";
            g.stroke();
            g.rotate(x / RADIUS);
            g.beginPath();
            g.arc(0, 0, RADIUS * 0.55, 0.3, 2.2);
            g.strokeStyle = "rgb(255 255 255 / .6)";
            g.stroke();
            g.restore();
          }
          if (roll < 1) return true;
          return false;
        });
        sfx.bell();
        falling = null;
        setParty(false);
        // Keep any domino earned while the others were falling.
        setProgress({ chain: Math.max(0, progress.value.chain - count) });
        paint();
      };
      falling = work();
      return falling;
    };

    Object.assign(strip, { add, topple, settle });
    const watch = new ResizeObserver(resize);
    watch.observe(box.current!);
    resize();
    return () => {
      watch.disconnect();
      // The next word's strip may already have taken over.
      if (strip.add === add) strip.add = strip.topple = strip.settle = null;
      stop?.();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div class="domino-strip" ref={box}>
      <canvas ref={canvas} />
      {chain > 0 && <button class="first-domino" aria-label="Knock the dominoes down" onClick={() => void strip.topple?.()} />}
      {party && <Confetti count={26} />}
    </div>
  );
}
