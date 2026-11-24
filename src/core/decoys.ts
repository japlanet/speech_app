import { confusableWith } from "./phonemes.ts";
import { shuffle, type Rng } from "./random.ts";
import type { Phoneme, PhonemeId, Progress, Settings, Tile, Word } from "./types.ts";

/** Extra tiles that do not belong in the word, chosen to be easy to mix up with ones that do. */
export function pickDecoys(
  word: Word,
  count: number,
  phonemes: Pick<Phoneme, "id" | "grapheme">[],
  targetSound: PhonemeId | null,
  hasRecording: (id: PhonemeId) => boolean = () => true,
  rng: Rng = Math.random,
): Tile[] {
  const inWord = new Set(word.tiles.map(t => t.phonemeId));
  const spelled = new Set(word.tiles.map(t => t.grapheme));
  const score = new Map<PhonemeId, number>();
  const bump = (id: PhonemeId, by: number) => score.set(id, (score.get(id) ?? 0) + by);

  for (const id of inWord) {
    confusableWith(id).forEach((c, i) => bump(c, 4 - Math.min(i, 3) * 0.5 + (id === targetSound ? 4 : 0)));
  }
  if (targetSound && score.has(targetSound)) bump(targetSound, 4);

  const usable = shuffle(
    phonemes.filter(p => !inWord.has(p.id) && !spelled.has(p.grapheme) && p.id !== "silent"),
    rng,
  );
  const rank = (p: { id: PhonemeId }) => (score.get(p.id) ?? (p.id === targetSound ? 1 : 0)) + (hasRecording(p.id) ? 1.5 : 0) + rng();
  const ranked = usable.map(p => ({ p, s: rank(p) })).sort((a, b) => b.s - a.s);
  const out: Tile[] = [];
  for (const { p } of ranked) {
    if (out.length >= count) break;
    if (!out.some(t => t.grapheme === p.grapheme)) out.push({ grapheme: p.grapheme, phonemeId: p.id });
  }
  return out;
}

type Mastery = Pick<Progress, "level" | "streak">;
type Rules = Pick<Settings, "stepUp" | "dropAfter" | "maxDecoys">;

/** Called as soon as a word reaches the misplacement limit. */
export function afterTooManyMisses(m: Mastery): Mastery {
  return { level: Math.max(0, m.level - 1), streak: 0 };
}

/** Called when a word is finished, with how many tiles went in the wrong place. */
export function afterWord(m: Mastery, misses: number, rules: Rules): Mastery {
  if (misses > 0) return { level: m.level, streak: 0 };
  const streak = m.streak + 1;
  if (streak >= rules.stepUp && m.level < rules.maxDecoys) return { level: m.level + 1, streak: 0 };
  return { level: m.level, streak: Math.min(streak, rules.stepUp) };
}
