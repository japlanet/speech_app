/** Confetti, stars and fireworks, drawn on canvas. */
export const CONFETTI = ["#db3a2d", "#f7c52b", "#1f9d57", "#2f74d0", "#f291b8", "#8a4bc4", "#ffffff"];

const sprites = new Map<string, HTMLCanvasElement>();
/** Emoji are slow to draw as text, so each one is drawn once and kept. */
export function sprite(emoji: string, small: boolean): HTMLCanvasElement {
  const key = emoji + (small ? "s" : "");
  const size = small ? 96 : 256;
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    g.font = `${size * 0.78}px "Apple Color Emoji", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(emoji, size / 2, size * 0.54);
    sprites.set(key, c);
  }
  return c;
}

export function drawSprite(g: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number, turn = 0): void {
  g.save();
  g.translate(x, y);
  if (turn) g.rotate(turn);
  g.drawImage(sprite(emoji, size < 80), -size / 2, -size / 2, size, size);
  g.restore();
}

interface Bit { x: number; y: number; vx: number; vy: number; turn: number; spin: number; age: number; life: number; size: number; colour: string; emoji: string; pull: number }
const MOST = 200;

export class Bits {
  list: Bit[] = [];
  /** Throw n bits out from a point. Emoji ones are mixed in if given. */
  burst(x: number, y: number, n: number, { speed = 620, emoji = [] as readonly string[], pull = 900, up = 120, size = 1, life = 1.3 } = {}): void {
    for (let i = 0; i < n && this.list.length < MOST; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.25 + 0.75 * Math.random());
      const special = emoji.length > 0 && i % 3 === 0;
      this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, turn: a, spin: (Math.random() - 0.5) * 14, age: 0, life: life * (0.7 + 0.6 * Math.random()), size: size * (special ? 46 + Math.random() * 26 : 12 + Math.random() * 12), colour: CONFETTI[i % CONFETTI.length], emoji: special ? emoji[Math.floor(Math.random() * emoji.length)] : "", pull });
    }
  }
  /** A shower from the top edge. */
  rain(width: number, n: number, emoji: readonly string[] = []): void {
    for (let i = 0; i < n && this.list.length < MOST; i++) {
      const special = emoji.length > 0 && i % 4 === 0;
      this.list.push({ x: Math.random() * width, y: -30 - Math.random() * 260, vx: (Math.random() - 0.5) * 120, vy: 260 + Math.random() * 260, turn: Math.random() * 6, spin: (Math.random() - 0.5) * 9, age: 0, life: 2.6, size: special ? 54 : 14 + Math.random() * 12, colour: CONFETTI[i % CONFETTI.length], emoji: special ? emoji[Math.floor(Math.random() * emoji.length)] : "", pull: 160 });
    }
  }
  step(g: CanvasRenderingContext2D, dt: number, height: number): void {
    this.list = this.list.filter(b => (b.age += dt) < b.life && b.y < height + 80);
    for (const b of this.list) {
      b.vx *= 1 - dt * 1.1;
      b.vy = b.vy * (1 - dt * 1.1) + b.pull * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.turn += b.spin * dt;
      const fade = Math.min(1, (b.life - b.age) / 0.3);
      g.globalAlpha = fade;
      if (b.emoji) drawSprite(g, b.emoji, b.x, b.y, b.size, b.turn * 0.3);
      else {
        const c = Math.cos(b.turn);
        const s = Math.sin(b.turn);
        // Squash across one axis, so that the paper seems to flutter.
        const w = b.size * 0.5;
        const h = b.size * 0.75 * Math.cos(b.age * 9 + b.spin);
        g.fillStyle = b.colour;
        g.beginPath();
        g.moveTo(b.x - w * c + h * s, b.y - w * s - h * c);
        g.lineTo(b.x + w * c + h * s, b.y + w * s - h * c);
        g.lineTo(b.x + w * c - h * s, b.y + w * s + h * c);
        g.lineTo(b.x - w * c - h * s, b.y - w * s + h * c);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }
}

/** Fit a canvas to the whole screen. Pixel-perfect is not needed for moving confetti, and costs older iPads a lot. */
export function fitScreen(c: HTMLCanvasElement): { g: CanvasRenderingContext2D; W: number; H: number } {
  const ratio = Math.min(1.25, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  c.width = Math.round(W * ratio);
  c.height = Math.round(H * ratio);
  const g = c.getContext("2d")!;
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { g, W, H };
}

let layer: HTMLCanvasElement | null = null;
const loose = new Bits();

/** A burst over whatever is on screen. It never blocks a touch. */
export function pop(x: number, y: number, n = 46, emoji: readonly string[] = ["⭐"]): void {
  loose.burst(x, y, n, { emoji });
  if (layer) return;
  const c = document.createElement("canvas");
  c.className = "fx";
  layer = c;
  document.body.append(c);
  const { g, W, H } = fitScreen(c);
  let then = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.034, (now - then) / 1000);
    then = now;
    g.clearRect(0, 0, W, H);
    loose.step(g, dt, H);
    if (loose.list.length) return void requestAnimationFrame(tick);
    c.remove();
    layer = null;
  };
  requestAnimationFrame(tick);
}

/** A burst from the middle of something on screen. */
export function popFrom(el: Element | null | undefined, n?: number, emoji?: readonly string[]): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  pop(r.left + r.width / 2, r.top + r.height / 2, n, emoji);
}
