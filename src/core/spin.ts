export interface SpinPlan {
  from: number;
  to: number;
  seconds: number;
  /** Which item ends up under the pointer. */
  lands: number;
}

const POWER = 3.2;

/**
 * Plan a whole spin in advance, so that it slows down smoothly all the way onto one item.
 * Angles are degrees clockwise. Item i is centred at i * (360 / count) on a wheel at angle 0, with the pointer at 0.
 */
export function planSpin(from: number, degreesPerSecond: number, count: number, wobble = Math.random(), target?: number): SpinPlan {
  const slice = 360 / count;
  const way = degreesPerSecond < 0 ? -1 : 1;
  const speed = Math.max(220, Math.min(1500, Math.abs(degreesPerSecond)));
  const wish = Math.max(1.6, Math.min(4.2, 1.4 + speed / 420));
  const rough = from + way * ((speed * wish) / POWER);
  // Stop a little off-centre, as a real wheel does, but clearly inside one slice.
  const off = (wobble - 0.5) * slice * 0.5;
  let nearest = Math.round(rough / slice) * slice + off;
  // Told which item to land on: the nearest place where it sits under the pointer.
  if (target !== undefined) nearest = -target * slice + 360 * Math.round((rough + target * slice) / 360) + off;
  // With very few slices the nearest one can be behind us, or too close to be a spin.
  let travel = (nearest - from) * way;
  while (travel < 80) travel += target === undefined ? slice : 360;
  const to = from + way * travel;
  return { from, to, seconds: Math.max(1, Math.min(5, (travel * POWER) / speed)), lands: itemAt(to, count) };
}

export function spinAngle(p: SpinPlan, elapsed: number): number {
  const t = Math.min(1, Math.max(0, elapsed / p.seconds));
  return p.from + (p.to - p.from) * (1 - (1 - t) ** POWER);
}

/** The item under the pointer when the wheel is turned to this angle. */
export function itemAt(angle: number, count: number): number {
  const slice = 360 / count;
  return ((Math.round(-angle / slice) % count) + count) % count;
}
