export type PhonemeId = string;

export interface Phoneme {
  id: PhonemeId;
  /** The usual spelling, shown on decoy tiles and in settings. */
  grapheme: string;
  /** A parent-facing reminder of which sound this is, e.g. "f as in fan". */
  hint: string;
  kind: "consonant" | "vowel";
  colour: string;
}

export interface Tile {
  grapheme: string;
  phonemeId: PhonemeId;
}

export interface Word {
  id: string;
  text: string;
  tiles: Tile[];
  emoji: string;
  active: boolean;
  /** Word ids chosen by a parent to be the wrong answers in mode 2 (up to 2). */
  distractors: string[];
}

export interface WheelItem {
  id: string;
  label: string;
  emoji: string;
}

export interface Wheel {
  id: string;
  name: string;
  centre: string;
  /** The sound this wheel practises. It is "the current target sound" for modes 1 and 2. */
  phonemeId: PhonemeId;
  items: WheelItem[];
  target: number;
  active: boolean;
}

export interface Settings {
  childName: string;
  letterCase: "lower" | "upper";
  /** When mode 2 shows the printed words on the choice rows. */
  showPrinted: "afterCorrect" | "always";
  defaultTarget: number;
  roundLength: number;
  /** Words in a row with no misplaced tile before one more decoy is added. */
  stepUp: number;
  /** Misplacements within one word before dropping back a level. */
  dropAfter: number;
  maxDecoys: number;
}

/** Kept apart from Settings so that it is never written into a backup. */
export interface Lock {
  salt: string;
  pinHash: string;
  recoveryHash: string;
}

export type PrizeSlot = "background" | "avatar" | "domino" | "marble" | "tile" | "spin";
export type Chosen = Record<PrizeSlot, string>;

export interface Progress {
  level: number;
  streak: number;
  /** Dominoes standing in the current chain. */
  chain: number;
  unlocked: string[];
  chosen: Chosen;
  lastPrizeDate: string;
  /** The day a domino round last won a prize in mode 1 and in mode 2. */
  buildPrizeDate: string;
  matchPrizeDate: string;
}

/** Where the wheel lands next: every picture once, in a shuffled order, then again. */
export interface Deal {
  date: string;
  wheelId: string;
  bag: string[];
  last: string | null;
}

export interface RepDay {
  date: string;
  wheelId: string;
  wheelName: string;
  reps: number;
  target: number;
}

export interface MediaRecord {
  id: string;
  kind: "audio" | "image";
  type: string;
  blob: Blob;
  /** Audio only: the part to play, in seconds, and how much to turn it up. */
  start?: number;
  end?: number;
  gain?: number;
}

/** Keys of everything that can hold a recording or picture. */
export const mediaKey = {
  phoneme: (id: string) => `ph:${id}`,
  word: (id: string) => `w:${id}`,
  wheelCentre: (id: string) => `wc:${id}`,
  wheelItem: (id: string) => `wi:${id}`,
  /** "New avatar unlocked!" and so on. */
  unlocked: (slot: PrizeSlot) => `un:${slot}`,
  wordPicture: (id: string) => `pw:${id}`,
  itemPicture: (id: string) => `pi:${id}`,
};
