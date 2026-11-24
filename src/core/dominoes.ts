/** Shapes for the domino chain. Canvas coordinates: y grows downwards, the shelf is at y = 0. */
export interface Run {
  count: number;
  x0: number;
  gap: number;
  w: number;
  h: number;
  /** How far a fallen domino leans (radians from upright) when it rests on the next one. */
  lean: number;
}

export function layRun(width: number, height: number, count: number, slots: number): Run {
  const h = Math.min(92, height * 0.7);
  const w = Math.max(13, h * 0.22);
  const x0 = 44;
  const gap = Math.max(w * 1.7, Math.min(h * 0.74, (width - x0 - h - 24) / Math.max(1, slots - 1)));
  return { count, x0, gap, w, h, lean: Math.acos(Math.min(0.95, w / gap)) };
}

export const finalAngle = (r: Run, i: number) => (i === r.count - 1 ? Math.PI / 2 : r.lean);

/** The corners of domino i when tipped to the right by `a` radians about its bottom-right corner. */
export function corners(r: Run, i: number, a: number): [number, number][] {
  const px = r.x0 + i * r.gap + r.w;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return ([[-r.w, 0], [-r.w, -r.h], [0, -r.h], [0, 0]] as const).map(([x, y]) => [px + x * c - y * s, x * s + y * c]);
}

/** Height of the centre of a rolling marble above each x, resting on the fallen chain. Index = x / step. */
export function marblePath(r: Run, width: number, radius: number, step = 2): number[] {
  const n = Math.ceil((width + radius * 4) / step);
  const top = new Array<number>(n).fill(0);
  for (let i = 0; i < r.count; i++) {
    const pts = corners(r, i, finalAngle(r, i));
    for (let k = 0; k < 4; k++) {
      let [a, b] = [pts[k], pts[(k + 1) % 4]];
      if (a[0] > b[0]) [a, b] = [b, a];
      for (let j = Math.max(0, Math.ceil(a[0] / step)); j < n && j * step <= b[0]; j++) {
        const t = b[0] === a[0] ? 0 : (j * step - a[0]) / (b[0] - a[0]);
        top[j] = Math.min(top[j], a[1] + (b[1] - a[1]) * t);
      }
    }
  }
  const reach = Math.floor(radius / step);
  return top.map((_, j) => {
    let y = -radius;
    for (let d = -reach; d <= reach; d++) {
      const t = top[j + d];
      if (t !== undefined) y = Math.min(y, t - Math.sqrt(radius * radius - (d * step) ** 2));
    }
    return y;
  });
}

/** Seconds between one domino starting to fall and the next. Short chains are not rushed; long ones still finish in time. */
export const beat = (count: number) => Math.min(0.16, 1.5 / Math.max(1, count));
export const FALL = 0.34;
export const ROLL = 1.9;
/** How long the whole celebration lasts. */
export const celebration = (count: number) => count * beat(count) + FALL + 0.15 + ROLL + 0.4;
