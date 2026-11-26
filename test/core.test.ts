import assert from "node:assert/strict";
import { test } from "node:test";
import { blockedColours, contrast, inkFor, PALETTE, settleColours } from "../src/core/colours.ts";
import { localDate, msUntilMidnight } from "../src/core/day.ts";
import { afterTooManyMisses, afterWord, pickDecoys } from "../src/core/decoys.ts";
import { editDistance, minimalPairs, needsMorePairs, pairPosition, pickDistractors } from "../src/core/distractors.ts";
import { CATALOGUE, GROUPS, PHONEME_IDS, SPELLINGS } from "../src/core/phonemes.ts";
import { ALL_PRIZES, nextPrize, PRIZES } from "../src/core/prizes.ts";
import { drawFromBag } from "../src/core/random.ts";
import { seedWheels, seedWords } from "../src/core/seed.ts";
import { cutGaps, suggestSplit, toggleGap } from "../src/core/split.ts";
import { autoTrim } from "../src/core/trim.ts";
import type { Word } from "../src/core/types.ts";

const words = seedWords();
const find = (t: string) => words.find(w => w.text === t)!;
const split = (t: string) => suggestSplit(t).map(x => x.grapheme).join("|");
const inWords = new Set(words.flatMap(w => w.tiles.map(t => t.phonemeId)));
const used = PHONEME_IDS.filter(id => inWords.has(id));
const phonemes = PHONEME_IDS.map(id => CATALOGUE[id]);
let seed = 1;
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test("digraphs stay together", () => {
  assert.equal(split("fish"), "f|i|sh");
  assert.equal(split("thin"), "th|i|n");
  assert.equal(split("duck"), "d|u|ck");
  assert.equal(split("ring"), "r|i|ng");
  assert.equal(split("bell"), "b|e|ll");
  assert.equal(split("boat"), "b|oa|t");
  assert.equal(split("rain"), "r|ai|n");
  assert.equal(split("Moon"), "m|oo|n");
  assert.equal(split("cheese"), "ch|ee|s|e");
});

test("every spelling and seed tile maps to a real sound", () => {
  for (const ids of Object.values(SPELLINGS)) for (const id of ids) assert.ok(CATALOGUE[id], id);
  for (const g of GROUPS) assert.ok(SPELLINGS[g], g);
  for (const w of words) {
    for (const t of w.tiles) assert.ok(CATALOGUE[t.phonemeId], w.text);
    assert.equal(w.tiles.map(t => t.grapheme).join(""), w.text);
  }
  assert.ok(CATALOGUE[seedWheels()[0].phonemeId]);
});

test("tapping between letters splits and merges", () => {
  const thin = suggestSplit("thin");
  assert.deepEqual([...cutGaps(thin)], [2, 3]);
  const cut = toggleGap(thin, 1);
  assert.equal(cut.map(t => t.grapheme).join("|"), "t|h|i|n");
  assert.equal(toggleGap(cut, 1).map(t => t.grapheme).join("|"), "th|i|n");
  const kept = toggleGap([{ grapheme: "th", phonemeId: "th_voiced" }, ...thin.slice(1)], 3);
  assert.equal(kept[0].phonemeId, "th_voiced");
});

test("starter colours: c green, a red, t yellow, no adjacent clash, readable letters", () => {
  const colours = settleColours(used, {}, words);
  assert.equal(colours.k, PALETTE[0]);
  assert.equal(colours.a_short, PALETTE[1]);
  assert.equal(colours.t, PALETTE[2]);
  for (const w of words) {
    for (let i = 1; i < w.tiles.length; i++) {
      const [a, b] = [w.tiles[i - 1].phonemeId, w.tiles[i].phonemeId];
      if (a !== b) assert.notEqual(colours[a], colours[b], w.text);
    }
  }
  for (const c of PALETTE) assert.ok(contrast(c, inkFor(c)) >= 4, `${c} ${contrast(c, inkFor(c))}`);
  assert.equal(new Set(used.map(id => colours[id])).size, used.length, "every starter sound has its own colour");
});

test("a clash is settled, and a colour just chosen is kept", () => {
  const w = [{ tiles: suggestSplit("sip") }];
  const bad = { s: PALETTE[3], i_short: PALETTE[3], p: PALETTE[4] };
  const fixed = settleColours(["s", "i_short", "p"], bad, w, ["s"]);
  assert.equal(fixed.s, PALETTE[3]);
  assert.notEqual(fixed.i_short, fixed.s);
  assert.ok(blockedColours("s", fixed, w).has(fixed.i_short));
});

test("minimal pairs", () => {
  assert.equal(pairPosition(find("cat"), find("bat")), 0);
  assert.equal(pairPosition(find("cat"), find("cap")), 2);
  assert.equal(pairPosition(find("cat"), find("fish")), -1);
  assert.equal(pairPosition(find("fish"), find("dish")), 0);
  assert.equal(editDistance(["k", "a", "t"], ["a", "t"]), 1);
});

test("distractors take one initial and one final difference when they can", () => {
  for (let i = 0; i < 50; i++) {
    const d = pickDistractors(find("cat"), words, "f", rng);
    assert.deepEqual(d.map(w => pairPosition(find("cat"), w)).sort(), [0, 2]);
  }
});

test("distractors always give two different-sounding words, and flag thin ones", () => {
  for (const w of words) {
    const d = pickDistractors(w, words, "f", rng);
    assert.equal(d.length, 2, w.text);
    assert.ok(!d.some(x => x.id === w.id));
    assert.equal(needsMorePairs(w, words), minimalPairs(w, words).length < 2);
  }
  assert.ok(needsMorePairs(find("log"), words));
  assert.ok(!needsMorePairs(find("cat"), words));
});

test("parent overrides win, identical-sounding words are never offered", () => {
  const cat = { ...find("cat"), distractors: ["seed-dog", "seed-sun"] };
  assert.deepEqual(pickDistractors(cat, words, null, rng).map(w => w.text), ["dog", "sun"]);
  const kat: Word = { ...find("cat"), id: "kat", text: "kat" };
  for (let i = 0; i < 20; i++) assert.ok(!pickDistractors(find("cat"), [...words, kat], null, rng).includes(kat));
});

test("contrasts about the target sound are preferred", () => {
  let hits = 0;
  for (let i = 0; i < 40; i++) if (pickDistractors(find("pan"), words, "f", rng).some(w => w.text === "fan")) hits++;
  assert.ok(hits >= 36, String(hits));
});

test("decoys never share a sound or spelling with the word, and lean on confusable sounds", () => {
  for (const w of words) {
    const d = pickDecoys(w, 2, phonemes.filter(p => used.includes(p.id)), "f", () => true, rng);
    assert.equal(d.length, 2);
    for (const t of d) {
      assert.ok(!w.tiles.some(x => x.phonemeId === t.phonemeId || x.grapheme === t.grapheme), w.text);
    }
  }
  const d = pickDecoys(find("pan"), 1, phonemes.filter(p => used.includes(p.id)), "f", () => true, rng);
  assert.equal(d[0].phonemeId, "f");
});

test("mastery climbs after 5 clean words, stops at the cap and drops after misses", () => {
  const rules = { stepUp: 5, dropAfter: 3, maxDecoys: 2 };
  let m = { level: 0, streak: 0 };
  for (let i = 0; i < 4; i++) m = afterWord(m, 0, rules);
  assert.equal(m.level, 0);
  m = afterWord(m, 0, rules);
  assert.deepEqual(m, { level: 1, streak: 0 });
  m = afterWord({ level: 1, streak: 4 }, 1, rules);
  assert.deepEqual(m, { level: 1, streak: 0 });
  for (let i = 0; i < 20; i++) m = afterWord(m, 0, rules);
  assert.equal(m.level, 2);
  assert.deepEqual(afterTooManyMisses(m), { level: 1, streak: 0 });
  assert.equal(afterTooManyMisses({ level: 0, streak: 2 }).level, 0);
});

test("the bag uses every word once and never repeats back to back", () => {
  const all = ["a", "b", "c"];
  let bag: string[] = [];
  let last: string | null = null;
  for (let r = 0; r < 30; r++) {
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const d = drawFromBag(bag, all, last, rng);
      assert.notEqual(d.next, last);
      bag = d.bag;
      last = d.next;
      seen.add(d.next!);
    }
    assert.equal(seen.size, 3);
  }
  assert.equal(drawFromBag([], [], null).next, null);
});

test("prizes have unique ids and run out gracefully", () => {
  assert.equal(new Set(ALL_PRIZES.map(p => p.id)).size, ALL_PRIZES.length);
  assert.equal(nextPrize([])!.id, PRIZES[0].id);
  assert.equal(nextPrize(PRIZES.map(p => p.id)), null);
});

test("the day turns over at local midnight", () => {
  assert.equal(localDate(new Date(2026, 2, 9, 23, 59)), "2026-03-09");
  assert.equal(localDate(new Date(2026, 2, 10, 0, 1)), "2026-03-10");
  assert.ok(msUntilMidnight(new Date(2026, 2, 9, 23, 59)) <= 60_100);
});

const RATE = 48000;
function clip(parts: [seconds: number, level: number][]): Float32Array {
  const out: number[] = [];
  for (const [s, level] of parts) for (let i = 0; i < s * RATE; i++) out.push((rng() * 2 - 1) * level);
  return Float32Array.from(out);
}

test("auto trim keeps a quiet /f/ in front of a loud vowel", () => {
  const t = autoTrim(clip([[0.5, 0.002], [0.4, 0.03], [0.4, 0.6], [0.5, 0.002]]), RATE);
  assert.ok(t.start > 0.35 && t.start < 0.5, String(t.start));
  assert.ok(t.end > 1.3 && t.end < 1.5, String(t.end));
});

test("auto trim keeps a soft sound by itself, turns it up, and drops a finger thump", () => {
  const t = autoTrim(clip([[0.05, 0.002], [0.04, 0.3], [0.5, 0.002], [0.6, 0.02], [0.4, 0.002]]), RATE);
  assert.ok(t.start > 0.45 && t.start < 0.6, String(t.start));
  assert.ok(t.gain > 3, String(t.gain));
});

test("auto trim of a lone /t/ keeps it, and silence is left whole", () => {
  const t = autoTrim(clip([[0.5, 0.002], [0.05, 0.4], [0.5, 0.002]]), RATE);
  assert.ok(t.start > 0.4 && t.start <= 0.5 && t.end >= 0.55);
  const s = autoTrim(new Float32Array(RATE), RATE);
  assert.deepEqual([s.start, s.end], [0, 1]);
});

test("prizes cycle: once all are won, the oldest few come back, never the ones in use", async () => {
  const { awardPrize, DEFAULT_CHOSEN, RECYCLE } = await import("../src/core/prizes.ts");
  let unlocked: string[] = [];
  const chosen = { ...DEFAULT_CHOSEN, domino: PRIZES[0].id };
  for (const p of PRIZES) {
    const won = awardPrize(unlocked, chosen);
    assert.equal(won.prize?.id, p.id);
    unlocked = won.unlocked;
  }
  const seen: string[] = [];
  for (let day = 0; day < 60; day++) {
    const won = awardPrize(unlocked, chosen);
    assert.ok(won.prize, "always a prize");
    assert.ok(!unlocked.slice(-(PRIZES.length - RECYCLE)).includes(won.prize.id), "never one won recently");
    assert.notEqual(won.prize.id, PRIZES[0].id, "the one in use is never taken away");
    assert.ok(unlocked.length - won.unlocked.length <= RECYCLE - 1, "only a few are locked again");
    assert.equal(new Set(won.unlocked).size, won.unlocked.length);
    unlocked = won.unlocked;
    seen.push(won.prize.id);
  }
  assert.equal(new Set(seen).size, PRIZES.length - 1, "every other prize comes round again");
});
