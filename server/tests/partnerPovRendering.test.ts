import { test } from "node:test";
import assert from "node:assert/strict";
import { predictNormalizedY, smoothToward } from "../../src/lib/partnerPovInterpolation.ts";

test("partner tiles predict from timestamped positions with a bounded delay window", () => {
  assert.ok(Math.abs(predictNormalizedY(0.4, 0.2, 100) - 0.42) < 1e-10);
  assert.ok(Math.abs(predictNormalizedY(0.4, 0.2, 1200) - 0.5) < 1e-10);
  assert.equal(predictNormalizedY(0.95, 0.2, 500), 1);
  assert.equal(predictNormalizedY(0.4, 0.2, -50), 0.4);
});

test("partner tile easing converges consistently across frame intervals", () => {
  let at60Fps = 0;
  let at30Fps = 0;
  for (let frame = 0; frame < 60; frame += 1) {
    at60Fps = smoothToward(at60Fps, 1, 1 / 60);
  }
  for (let frame = 0; frame < 30; frame += 1) {
    at30Fps = smoothToward(at30Fps, 1, 1 / 30);
  }
  assert.ok(Math.abs(at60Fps - at30Fps) < 0.01);
  assert.ok(at30Fps > 0.99);
});
