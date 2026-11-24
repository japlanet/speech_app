import type { PhonemeId, Word } from "./types.ts";

export const PALETTE = [
  "#1f9d57", "#db3a2d", "#f7c52b", "#2f74d0", "#f08a24", "#8a4bc4", "#f291b8", "#119c9c", "#8c5a3a", "#a8d13c", "#6cc5f3",
  "#c5318f", "#2c3f86", "#ff9d85", "#bda8ee", "#75791a", "#93e3c1", "#6f7b8a", "#5d2473", "#dcab6f", "#0f6b4f", "#8d1f2f",
  "#ffe89a", "#b3c4d6",
];
export const DARK = "#1b2238";

/** The mockups fix these three. */
export const FIXED: Record<PhonemeId, string> = { k: PALETTE[0], a_short: PALETTE[1], t: PALETTE[2] };

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or dark lettering, whichever reads better on this colour. */
export function inkFor(colour: string): string {
  return contrast(colour, "#ffffff") >= contrast(colour, DARK) ? "#ffffff" : DARK;
}

/** Each sound's neighbours: the different sounds that sit right beside it in some word. */
export function neighbourMap(words: Pick<Word, "tiles">[]): Map<PhonemeId, Set<PhonemeId>> {
  const map = new Map<PhonemeId, Set<PhonemeId>>();
  const link = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const w of words) {
    for (let i = 1; i < w.tiles.length; i++) {
      const a = w.tiles[i - 1].phonemeId;
      const b = w.tiles[i].phonemeId;
      if (a !== b) {
        link(a, b);
        link(b, a);
      }
    }
  }
  return map;
}

/** Colours a sound may not take, because a sound beside it in some word already has them. */
export function blockedColours(id: PhonemeId, colours: Record<PhonemeId, string>, words: Pick<Word, "tiles">[]): Set<string> {
  const out = new Set<string>();
  for (const n of neighbourMap(words).get(id) ?? []) if (colours[n]) out.add(colours[n].toLowerCase());
  return out;
}

/** The least-used colour that does not clash with a neighbour. */
export function freeColour(id: PhonemeId, colours: Record<PhonemeId, string>, words: Pick<Word, "tiles">[]): string {
  const blocked = blockedColours(id, colours, words);
  const uses = (c: string) => Object.entries(colours).filter(([k, v]) => k !== id && v.toLowerCase() === c.toLowerCase()).length;
  const open = PALETTE.filter(c => !blocked.has(c.toLowerCase()));
  return (open.length ? open : PALETTE).reduce((best, c) => (uses(c) < uses(best) ? c : best));
}

/** Give every sound in use a colour, then recolour just enough to undo any clash. Existing colours are kept where possible. */
export function settleColours(
  inUse: PhonemeId[],
  existing: Record<PhonemeId, string>,
  words: Pick<Word, "tiles">[],
  protect: PhonemeId[] = [],
): Record<PhonemeId, string> {
  const colours = { ...existing };
  for (const id of inUse) if (!colours[id]) colours[id] = FIXED[id] && !blockedColours(id, colours, words).has(FIXED[id]) ? FIXED[id] : freeColour(id, colours, words);
  const near = neighbourMap(words);
  for (let pass = 0; pass < 50; pass++) {
    let clash = false;
    for (const [a, others] of near) {
      for (const b of others) {
        if (!colours[a] || !colours[b] || colours[a].toLowerCase() !== colours[b].toLowerCase()) continue;
        clash = true;
        // Move the sound that touches fewer others, leaving a colour someone just picked alone.
        const keep = (x: string) => (protect.includes(x) ? 1000 : FIXED[x] ? 500 : 0) + (near.get(x)?.size ?? 0);
        const move = keep(a) <= keep(b) ? a : b;
        colours[move] = freeColour(move, colours, words);
      }
    }
    if (!clash) break;
  }
  return colours;
}
