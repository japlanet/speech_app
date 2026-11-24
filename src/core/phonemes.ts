import type { Phoneme, PhonemeId } from "./types.ts";

type Row = [id: string, grapheme: string, hint: string, kind: "consonant" | "vowel"];

/** Every sound the app knows. Only the ones used by a word or wheel appear in settings. */
const ROWS: Row[] = [
  ["p", "p", "p as in pan", "consonant"],
  ["b", "b", "b as in bat", "consonant"],
  ["t", "t", "t as in top", "consonant"],
  ["d", "d", "d as in dog", "consonant"],
  ["k", "c", "k as in cat, kick", "consonant"],
  ["g", "g", "g as in go", "consonant"],
  ["f", "f", "f as in fan", "consonant"],
  ["v", "v", "v as in van", "consonant"],
  ["th_voiceless", "th", "quiet th as in thin", "consonant"],
  ["th_voiced", "th", "buzzy th as in this", "consonant"],
  ["s", "s", "s as in sun", "consonant"],
  ["z", "z", "z as in zip", "consonant"],
  ["sh", "sh", "sh as in fish", "consonant"],
  ["zh", "s", "zh as in treasure", "consonant"],
  ["ch", "ch", "ch as in chip", "consonant"],
  ["j", "j", "j as in jam", "consonant"],
  ["m", "m", "m as in map", "consonant"],
  ["n", "n", "n as in net", "consonant"],
  ["ng", "ng", "ng as in ring", "consonant"],
  ["h", "h", "h as in hat", "consonant"],
  ["l", "l", "l as in log", "consonant"],
  ["r", "r", "r as in red", "consonant"],
  ["w", "w", "w as in wet", "consonant"],
  ["y", "y", "y as in yes", "consonant"],
  ["ks", "x", "x as in box", "consonant"],
  ["kw", "qu", "qu as in queen", "consonant"],
  ["a_short", "a", "a as in cat", "vowel"],
  ["e_short", "e", "e as in bed", "vowel"],
  ["i_short", "i", "i as in pig", "vowel"],
  ["o_short", "o", "o as in dog", "vowel"],
  ["u_short", "u", "u as in sun", "vowel"],
  ["a_long", "ai", "ai as in rain", "vowel"],
  ["e_long", "ee", "ee as in bee", "vowel"],
  ["i_long", "i", "i as in hi", "vowel"],
  ["o_long", "oa", "oa as in boat", "vowel"],
  ["u_long", "oo", "oo as in moon", "vowel"],
  ["oo_short", "oo", "oo as in book", "vowel"],
  ["ow", "ow", "ow as in cow", "vowel"],
  ["oy", "oy", "oy as in boy", "vowel"],
  ["ar", "ar", "ar as in car", "vowel"],
  ["or", "or", "or as in fork", "vowel"],
  ["er", "er", "er as in her, bird", "vowel"],
  ["silent", "e", "silent letter", "vowel"],
];

export const CATALOGUE: Record<PhonemeId, Omit<Phoneme, "colour">> = Object.fromEntries(
  ROWS.map(([id, grapheme, hint, kind]) => [id, { id, grapheme, hint, kind }]),
);
export const PHONEME_IDS: PhonemeId[] = ROWS.map(r => r[0]);

/** Which sounds a spelling can make, likeliest first. */
export const SPELLINGS: Record<string, PhonemeId[]> = {
  a: ["a_short", "a_long", "o_short"], b: ["b"], c: ["k", "s"], d: ["d"],
  e: ["e_short", "e_long", "silent"], f: ["f"], g: ["g", "j"], h: ["h"],
  i: ["i_short", "i_long"], j: ["j"], k: ["k"], l: ["l"], m: ["m"], n: ["n"],
  o: ["o_short", "o_long", "u_long"], p: ["p"], r: ["r"], s: ["s", "z", "zh"], t: ["t"],
  u: ["u_short", "u_long", "oo_short"], v: ["v"], w: ["w"], x: ["ks"], y: ["y", "i_long", "e_long"], z: ["z"],
  sh: ["sh"], ch: ["ch", "k"], th: ["th_voiceless", "th_voiced"], ck: ["k"], ng: ["ng"],
  ee: ["e_long"], oo: ["u_long", "oo_short"], ai: ["a_long"], oa: ["o_long"],
  ff: ["f"], ll: ["l"], ss: ["s"], zz: ["z"], ph: ["f"], wh: ["w"], qu: ["kw"],
  ay: ["a_long"], ea: ["e_long", "e_short"], ow: ["ow", "o_long"], ou: ["ow"], oi: ["oy"], oy: ["oy"],
  ar: ["ar"], or: ["or"], er: ["er"], ir: ["er"], ur: ["er"], igh: ["i_long"], tch: ["ch"], dge: ["j"],
  bb: ["b"], dd: ["d"], gg: ["g"], mm: ["m"], nn: ["n"], pp: ["p"], rr: ["r"], tt: ["t"],
};

/** Spellings that are kept together when a new word is split up, longest first. */
export const GROUPS = [
  "igh", "tch", "sh", "ch", "th", "ck", "ng", "ee", "oo", "ai", "oa", "ff", "ll", "ss", "zz",
  "ph", "wh", "qu", "ay", "ea", "oi", "oy", "bb", "dd", "gg", "mm", "nn", "pp", "tt", "ar", "or", "er", "ir", "ur", "ow", "ou",
];

export function phonemesFor(grapheme: string): PhonemeId[] {
  return SPELLINGS[grapheme.toLowerCase()] ?? [];
}

const PAIRS: [PhonemeId, PhonemeId][] = [
  ["f", "p"], ["f", "th_voiceless"], ["f", "v"], ["b", "p"], ["t", "d"], ["k", "g"], ["s", "sh"], ["s", "th_voiceless"],
  ["s", "z"], ["t", "k"], ["d", "g"], ["ch", "sh"], ["ch", "t"], ["j", "d"], ["m", "n"], ["n", "ng"], ["w", "r"], ["l", "w"],
  ["v", "b"], ["th_voiced", "d"], ["th_voiced", "v"], ["th_voiceless", "t"], ["h", "f"], ["ks", "s"], ["y", "l"],
  ["a_short", "e_short"], ["e_short", "i_short"], ["o_short", "u_short"], ["a_short", "u_short"], ["a_short", "o_short"],
];

/** Sounds that are easily mixed up with this one. The earlier pairs are the likelier confusions. */
export function confusableWith(id: PhonemeId): PhonemeId[] {
  const out: PhonemeId[] = [];
  for (const [a, b] of PAIRS) {
    if (a === id) out.push(b);
    else if (b === id) out.push(a);
  }
  return out;
}
