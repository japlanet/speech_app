export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Take the next item from a shuffled bag; refill when empty, never repeating the item just used. */
export function drawFromBag(bag: string[], all: string[], last: string | null, rng: Rng = Math.random): { next: string | null; bag: string[] } {
  let left = bag.filter(id => all.includes(id));
  if (!left.length) {
    left = shuffle(all, rng);
    if (left.length > 1 && left[0] === last) left.push(left.shift()!);
  }
  return { next: left[0] ?? null, bag: left.slice(1) };
}
