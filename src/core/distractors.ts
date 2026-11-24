import type { PhonemeId, Word } from "./types.ts";
import type { Rng } from "./random.ts";

const sounds = (w: Word) => w.tiles.map(t => t.phonemeId);

/** The one position where two words differ, or -1 if they are not a minimal pair. */
export function pairPosition(a: Word, b: Word): number {
  const x = sounds(a);
  const y = sounds(b);
  if (x.length !== y.length) return -1;
  let at = -1;
  for (let i = 0; i < x.length; i++) {
    if (x[i] === y[i]) continue;
    if (at >= 0) return -1;
    at = i;
  }
  return at;
}

export function editDistance(a: PhonemeId[], b: PhonemeId[]): number {
  let row = b.map((_, i) => i + 1);
  row.unshift(0);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next.push(Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    row = next;
  }
  return row[b.length];
}

const sameSounds = (a: Word, b: Word) => sounds(a).join(" ") === sounds(b).join(" ");

export function minimalPairs(target: Word, pool: Word[]): Word[] {
  return pool.filter(w => w.id !== target.id && pairPosition(target, w) >= 0);
}

export function needsMorePairs(target: Word, words: Word[]): boolean {
  const active = words.filter(w => w.active);
  const chosen = target.distractors.filter(id => active.some(w => w.id === id));
  return chosen.length < 2 && minimalPairs(target, active).length < 2;
}

/** Two wrong answers for mode 2. May return fewer if the pool is too small. */
export function pickDistractors(target: Word, pool: Word[], targetSound: PhonemeId | null, rng: Rng = Math.random): Word[] {
  // Never offer a word that sounds identical to the answer (or to the other wrong answer).
  const usable = pool.filter(w => w.id !== target.id && !sameSounds(w, target));
  const picked: Word[] = [];
  const add = (w: Word | undefined) => {
    if (w && picked.length < 2 && !picked.some(p => p.id === w.id || sameSounds(p, w))) picked.push(w);
  };
  for (const id of target.distractors) add(usable.find(w => w.id === id));
  if (picked.length === 2) return picked;

  const last = target.tiles.length - 1;
  const place = (w: Word) => {
    const at = pairPosition(target, w);
    return at < 0 ? "none" : at === 0 ? "initial" : at === last ? "final" : "middle";
  };
  const aboutTarget = (w: Word) => {
    const at = pairPosition(target, w);
    return at >= 0 && !!targetSound && (target.tiles[at].phonemeId === targetSound || w.tiles[at].phonemeId === targetSound);
  };
  const pairs = minimalPairs(target, usable);

  if (picked.length === 0 && pairs.length >= 2) {
    let best: [Word, Word] | null = null;
    let bestScore = -1;
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        if (sameSounds(pairs[i], pairs[j])) continue;
        const places = [place(pairs[i]), place(pairs[j])];
        const score =
          (places.includes("initial") ? 2 : 0) + (places.includes("final") ? 2 : 0) +
          (aboutTarget(pairs[i]) ? 1.5 : 0) + (aboutTarget(pairs[j]) ? 1.5 : 0) + rng();
        if (score > bestScore) {
          bestScore = score;
          best = [pairs[i], pairs[j]];
        }
      }
    }
    if (best) return best;
  }
  const byWorth = pairs
    .map(w => ({ w, s: (aboutTarget(w) ? 1.5 : 0) + (picked[0] && place(w) !== place(picked[0]) ? 1 : 0) + rng() }))
    .sort((a, b) => b.s - a.s);
  for (const { w } of byWorth) add(w);
  const near = usable
    .map(w => ({ w, d: editDistance(sounds(target), sounds(w)) + rng() * 0.5 }))
    .sort((a, b) => a.d - b.d);
  for (const { w } of near) add(w);
  return picked;
}
