import assert from "node:assert/strict";
import { test } from "node:test";
import { itemAt, planSpin, spinAngle } from "../src/core/spin.ts";

test("the pointer reads the right item", () => {
  assert.equal(itemAt(0, 6), 0);
  assert.equal(itemAt(-60, 6), 1);
  assert.equal(itemAt(60, 6), 5);
  assert.equal(itemAt(720 - 120 + 20, 6), 2);
  assert.equal(itemAt(10, 1), 0);
});

test("a spin always ends well inside the slice it says, in good time, the way it was pushed", () => {
  const hits = new Set<number>();
  for (let i = 0; i < 3000; i++) {
    const count = 1 + (i % 12);
    const from = Math.random() * 2000 - 1000;
    const speed = (Math.random() < 0.5 ? -1 : 1) * Math.random() * 3000;
    const p = planSpin(from, speed, count);
    assert.ok(p.seconds >= 1 && p.seconds <= 5);
    assert.equal(Math.sign(p.to - p.from), speed < 0 ? -1 : 1);
    assert.equal(spinAngle(p, 99), p.to);
    assert.equal(itemAt(p.to, count), p.lands);
    if (count === 6) hits.add(p.lands);
    let last = spinAngle(p, 0);
    let step = Infinity;
    for (let t = 0.1; t < p.seconds; t += 0.1) {
      const now = spinAngle(p, t);
      const move = Math.abs(now - last);
      assert.ok(move <= step + 1e-6, "never speeds up");
      step = move;
      last = now;
    }
  }
  assert.equal(hits.size, 6, "every item comes up");
});
