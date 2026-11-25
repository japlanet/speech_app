import { corners, type Run } from "../core/dominoes.ts";

const INK = "#1b2238";

/** One domino of a run standing on y = base, tipped by `angle`. */
export function drawDomino(g: CanvasRenderingContext2D, r: Run, i: number, angle: number, base: number, colours: readonly string[]): void {
  const pts = corners(r, i, angle);
  g.beginPath();
  pts.forEach(([x, y], k) => (k ? g.lineTo(x, base + y) : g.moveTo(x, base + y)));
  g.closePath();
  g.lineJoin = "round";
  g.fillStyle = colours[i % colours.length];
  g.fill();
  g.lineWidth = Math.max(3, r.w * 0.11);
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = "rgb(255 255 255 / .75)";
  for (const t of [0.25, 0.75]) {
    const x = (pts[0][0] + pts[3][0]) / 2 + ((pts[1][0] + pts[2][0] - pts[0][0] - pts[3][0]) / 2) * t;
    const y = (pts[0][1] + pts[3][1]) / 2 + ((pts[1][1] + pts[2][1] - pts[0][1] - pts[3][1]) / 2) * t;
    g.beginPath();
    g.arc(x, base + y, r.w * 0.17, 0, 7);
    g.fill();
  }
}

export function drawMarble(g: CanvasRenderingContext2D, x: number, y: number, radius: number, turn: number, colours: readonly string[]): void {
  g.save();
  g.translate(x, y);
  const shade = g.createRadialGradient(-radius * 0.35, -radius * 0.41, radius * 0.12, 0, 0, radius);
  shade.addColorStop(0, "#fff");
  shade.addColorStop(0.3, colours[0]);
  shade.addColorStop(1, colours[1]);
  g.beginPath();
  g.arc(0, 0, radius, 0, 7);
  g.fillStyle = shade;
  g.fill();
  g.lineWidth = Math.max(3, radius * 0.1);
  g.strokeStyle = INK;
  g.stroke();
  g.rotate(turn);
  g.beginPath();
  g.arc(0, 0, radius * 0.55, 0.3, 2.2);
  g.strokeStyle = "rgb(255 255 255 / .6)";
  g.stroke();
  g.restore();
}
