import assert from "node:assert/strict";
import { test } from "node:test";
import { corners, finalAngle, marblePath } from "../src/core/dominoes.ts";
import { bigRun, finaleLength, isMilestone, milestoneBefore, stepLength } from "../src/core/party.ts";

test("no full-screen celebration is longer than five seconds", () => {
  for (let n = 1; n <= 40; n++) {
    assert.ok(stepLength(n) <= 3.5, `${n}: ${stepLength(n)}`);
    assert.ok(finaleLength(n) <= 5, `${n}: ${finaleLength(n)}`);
  }
});

test("the big chain fits every iPad, standing and fallen", () => {
  for (const [w, h] of [[744, 1133], [1133, 744], [810, 1080], [1080, 810], [1366, 1024], [1024, 1366]]) {
    for (let slots = 2; slots <= 24; slots++) {
      const r = bigRun(w, h, slots, slots);
      assert.ok(r.h >= 60, `${slots} on ${w}: ${r.h} tall`);
      const right = Math.max(...corners(r, slots - 1, finalAngle(r, slots - 1)).map(c => c[0]));
      assert.ok(right <= w, `${slots} on ${w}: ${right}`);
      assert.ok(marblePath(r, w, r.h * 0.2).every(Number.isFinite));
    }
  }
});

test("the wheel has four milestones a day, whatever the target", () => {
  for (const target of [4, 5, 10, 20, 28, 33, 100]) {
    const all = Array.from({ length: target + 20 }, (_, i) => i + 1).filter(c => isMilestone(c, target));
    assert.equal(all.length, 4, String(target));
    assert.equal(all[3], target);
    assert.equal(milestoneBefore(all[0], target), 0);
    assert.equal(milestoneBefore(all[2], target), all[1]);
  }
  assert.ok(isMilestone(1, 1));
});
