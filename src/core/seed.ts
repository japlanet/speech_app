import { suggestSplit } from "./split.ts";
import { DEFAULT_CHOSEN } from "./prizes.ts";
import type { Progress, Settings, Wheel, Word } from "./types.ts";

const STARTER_WORDS: [string, string][] = [
  ["cat", "🐱"], ["cap", "🧢"], ["bat", "🦇"], ["hat", "🎩"], ["mat", ""], ["map", "🗺️"], ["pat", "🫳"], ["fan", "🪭"],
  ["pan", "🍳"], ["van", "🚐"], ["fin", "🦈"], ["pin", "📌"], ["tin", "🥫"], ["thin", ""], ["fish", "🐟"], ["dish", "🍽️"],
  ["fox", "🦊"], ["box", "📦"], ["sun", "☀️"], ["bus", "🚌"], ["bed", "🛏️"], ["red", "🔴"], ["pig", "🐷"], ["big", "🐘"],
  ["dog", "🐶"], ["log", "🪵"], ["hen", "🐔"], ["ten", "🔟"], ["pen", "🖊️"], ["top", ""], ["mop", "🧹"], ["cup", "🥤"], ["pup", "🐾"],
];

export function seedWords(): Word[] {
  return STARTER_WORDS.map(([text, emoji]) => ({ id: `seed-${text}`, text, tiles: suggestSplit(text), emoji, active: true, distractors: [] }));
}

export function seedWheels(): Wheel[] {
  const items: [string, string][] = [["hay", "🌾"], ["he", "👦"], ["hi", "👋"], ["ho", "🎅"], ["hoo", "🦉"], ["how", "🤔"]];
  return [{
    id: "seed-f", name: "/f/ syllable wheel", centre: "f", phonemeId: "f", target: 20, active: true,
    items: items.map(([label, emoji]) => ({ id: `seed-f-${label}`, label, emoji })),
  }];
}

export const DEFAULT_SETTINGS: Settings = {
  childName: "", letterCase: "lower", showPrinted: "afterCorrect",
  defaultTarget: 20, roundLength: 8, stepUp: 5, dropAfter: 3, maxDecoys: 2,
};

export const DEFAULT_PROGRESS: Progress = {
  level: 0, streak: 0, chain: 0, unlocked: [], chosen: { ...DEFAULT_CHOSEN }, lastPrizeDate: "", buildPrizeDate: "", matchPrizeDate: "",
};
