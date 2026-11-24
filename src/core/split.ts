import { GROUPS, phonemesFor } from "./phonemes.ts";
import type { Tile } from "./types.ts";

export function tileFor(grapheme: string): Tile {
  return { grapheme, phonemeId: phonemesFor(grapheme)[0] ?? "" };
}

/** Suggest how to cut a word into one tile per sound. */
export function suggestSplit(text: string): Tile[] {
  const word = text.toLowerCase().replace(/[^a-z]/g, "");
  const tiles: Tile[] = [];
  let i = 0;
  while (i < word.length) {
    const group = GROUPS.find(g => word.startsWith(g, i));
    const grapheme = group ?? word[i];
    tiles.push(tileFor(grapheme));
    i += grapheme.length;
  }
  return tiles;
}

/**
 * Split or join the tiles at a gap between two letters (gap 1 is after the first letter).
 * Tiles that do not touch the gap keep the sound a parent may have chosen for them.
 */
export function toggleGap(tiles: Tile[], gap: number): Tile[] {
  const out: Tile[] = [];
  let pos = 0;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const end = pos + t.grapheme.length;
    if (gap > pos && gap < end) {
      out.push(tileFor(t.grapheme.slice(0, gap - pos)), tileFor(t.grapheme.slice(gap - pos)));
    } else if (gap === end && i + 1 < tiles.length) {
      out.push(tileFor(t.grapheme + tiles[i + 1].grapheme));
      pos = end + tiles[i + 1].grapheme.length;
      i++;
      continue;
    } else out.push(t);
    pos = end;
  }
  return out;
}

/** The gaps (positions between letters) that are currently cut. */
export function cutGaps(tiles: Tile[]): Set<number> {
  const cuts = new Set<number>();
  let pos = 0;
  for (const t of tiles.slice(0, -1)) cuts.add((pos += t.grapheme.length));
  return cuts;
}
