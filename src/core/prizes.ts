import type { Chosen, PrizeSlot } from "./types.ts";

export interface Prize {
  id: string;
  slot: PrizeSlot;
  emoji: string;
  /** Extra look data: colours for dominoes, marbles and backgrounds. */
  colours?: string[];
}

/** What the parent records for each kind of prize. */
export const UNLOCK_LINES: Record<PrizeSlot, string> = {
  avatar: "New avatar unlocked!",
  background: "New background unlocked!",
  domino: "New dominoes unlocked!",
  marble: "New marble unlocked!",
  tile: "New letter tiles unlocked!",
  spin: "New wheel sparkles unlocked!",
};

export const STARTERS: Prize[] = [
  { id: "bg-meadow", slot: "background", emoji: "🌼" },
  { id: "av-bear", slot: "avatar", emoji: "🐻" },
  { id: "av-cat", slot: "avatar", emoji: "🐱" },
  { id: "do-wood", slot: "domino", emoji: "", colours: ["#d9a066", "#c98a4b", "#e0b27c"] },
  { id: "ma-blue", slot: "marble", emoji: "", colours: ["#5fb4ff", "#1c5fc4"] },
  { id: "ti-plain", slot: "tile", emoji: "" },
  { id: "sp-plain", slot: "spin", emoji: "🎡" },
];

/** In the order they are won. The kinds are mixed so every day brings something different. */
export const PRIZES: Prize[] = [
  { id: "do-rainbow", slot: "domino", emoji: "", colours: ["#db3a2d", "#f08a24", "#f7c52b", "#1f9d57", "#2f74d0", "#8a4bc4"] },
  { id: "av-dino", slot: "avatar", emoji: "🦖" },
  { id: "bg-space", slot: "background", emoji: "🪐" },
  { id: "ma-fire", slot: "marble", emoji: "", colours: ["#ffd45c", "#e5341b"] },
  { id: "sp-stars", slot: "spin", emoji: "⭐" },
  { id: "ti-blocks", slot: "tile", emoji: "🧱" },
  { id: "av-robot", slot: "avatar", emoji: "🤖" },
  { id: "bg-sea", slot: "background", emoji: "🐠" },
  { id: "do-candy", slot: "domino", emoji: "", colours: ["#f291b8", "#fff3f8", "#93e3c1"] },
  { id: "ma-galaxy", slot: "marble", emoji: "", colours: ["#c08cff", "#2a1260"] },
  { id: "av-fox", slot: "avatar", emoji: "🦊" },
  { id: "sp-bubbles", slot: "spin", emoji: "🫧" },
  { id: "bg-snow", slot: "background", emoji: "⛄" },
  { id: "ti-bubble", slot: "tile", emoji: "🫧" },
  { id: "do-ice", slot: "domino", emoji: "", colours: ["#bfe9ff", "#8fd0f5", "#e6f8ff"] },
  { id: "av-lion", slot: "avatar", emoji: "🦁" },
  { id: "ma-gold", slot: "marble", emoji: "", colours: ["#fff3b0", "#c98a12"] },
  { id: "bg-jungle", slot: "background", emoji: "🌴" },
  { id: "sp-hearts", slot: "spin", emoji: "💛" },
  { id: "av-octopus", slot: "avatar", emoji: "🐙" },
  { id: "do-night", slot: "domino", emoji: "", colours: ["#2c3f86", "#5d2473", "#119c9c"] },
  { id: "ti-cookie", slot: "tile", emoji: "🍪" },
  { id: "ma-lime", slot: "marble", emoji: "", colours: ["#e9ff8f", "#4c9a12"] },
  { id: "bg-sunset", slot: "background", emoji: "🌅" },
  { id: "av-unicorn", slot: "avatar", emoji: "🦄" },
  { id: "sp-comet", slot: "spin", emoji: "☄️" },
  { id: "av-rocket", slot: "avatar", emoji: "🚀" },
  { id: "do-gold", slot: "domino", emoji: "", colours: ["#f7d774", "#e0b235", "#fff0b8"] },
];

export const ALL_PRIZES = [...STARTERS, ...PRIZES];
export const SLOTS: PrizeSlot[] = ["avatar", "background", "domino", "marble", "tile", "spin"];

export const DEFAULT_CHOSEN: Chosen = {
  background: "bg-meadow", avatar: "av-bear", domino: "do-wood", marble: "ma-blue", tile: "ti-plain", spin: "sp-plain",
};

export function prize(id: string): Prize {
  return ALL_PRIZES.find(p => p.id === id) ?? STARTERS[0];
}

export function ownsPrize(id: string, unlocked: string[]): boolean {
  return STARTERS.some(p => p.id === id) || unlocked.includes(id);
}

export function nextPrize(unlocked: string[]): Prize | null {
  return PRIZES.find(p => !unlocked.includes(p.id)) ?? null;
}
