import assert from "node:assert/strict";
import { test } from "node:test";
import { celebration, corners, finalAngle, layRun, marblePath } from "../src/core/dominoes.ts";

test("the celebration is never longer than five seconds", () => {
  for (let n = 1; n <= 40; n++) assert.ok(celebration(n) <= 5, `${n}: ${celebration(n)}`);
});

test("chains fit on the screen, and the marble rides on top of the fallen dominoes", () => {
  for (const width of [744, 810, 1024, 1366]) {
    for (let slots = 2; slots <= 20; slots++) {
      const r = layRun(width, 110, slots, slots);
      const right = Math.max(...corners(r, slots - 1, finalAngle(r, slots - 1)).map(c => c[0]));
      assert.ok(right <= width, `${slots} on ${width}: ${right}`);
      const path = marblePath(r, width, 17);
      assert.ok(path.every(y => y <= -17 && Number.isFinite(y)));
      assert.ok(Math.min(...path) < -17 - r.w);
    }
  }
});
