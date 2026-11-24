import assert from "node:assert/strict";
import { test } from "node:test";
import { readBackup } from "../src/core/backup.ts";
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, seedWheels, seedWords } from "../src/core/seed.ts";

const good = {
  app: "sound-studio", format: 1, savedAt: "2026-01-01T00:00:00Z", words: seedWords(), wheels: seedWheels(),
  settings: DEFAULT_SETTINGS, progress: DEFAULT_PROGRESS, reps: [{ date: "2026-01-01", wheelId: "seed-f", wheelName: "x", reps: 4, target: 20 }],
  colours: { f: "#112233" }, media: [{ id: "ph:f", kind: "audio", type: "audio/mp4", file: "media/1.m4a", start: 0.1, end: 0.6, gain: 2 }],
};

test("a backup comes back exactly as it was saved", () => {
  assert.deepEqual(readBackup(JSON.parse(JSON.stringify(good))), good);
});

test("other files are refused", () => {
  for (const bad of [null, [], "x", {}, { app: "other", format: 1 }, { app: "sound-studio", format: 2 }]) assert.throws(() => readBackup(bad));
});

test("nonsense inside a backup is dropped, not trusted", () => {
  const d = readBackup({
    app: "sound-studio", format: 1,
    words: [{ id: "a", text: "cat", tiles: [{ grapheme: "c", phonemeId: "nope" }] }, 5, { id: "b", text: "at", tiles: [{ grapheme: "a", phonemeId: "a_short" }, { grapheme: "t", phonemeId: "t" }] }],
    wheels: [{ id: "1", active: true, target: 9999 }, { id: "2", active: true }],
    settings: { roundLength: -4, maxDecoys: "lots", letterCase: "wavy" },
    progress: { unlocked: ["do-rainbow", "free-money"], level: 99 },
    colours: { f: "url(https://example.com)", t: "#ABCDEF", zzz: "#000000" },
    media: [{ id: "x", kind: "image", type: "image/svg+xml", file: "a.svg" }, { id: "y", kind: "audio", type: "text/html", file: "b" }],
  });
  assert.deepEqual(d.words.map(w => w.text), ["at"]);
  assert.deepEqual(d.wheels.map(w => [w.active, w.target]), [[true, 200], [false, 20]]);
  assert.equal(d.settings.roundLength, 2);
  assert.equal(d.settings.maxDecoys, 2);
  assert.equal(d.settings.letterCase, "lower");
  assert.deepEqual(d.progress.unlocked, ["do-rainbow"]);
  assert.deepEqual(d.colours, { t: "#ABCDEF" });
  assert.deepEqual(d.media, []);
});
