import test from "node:test";
import assert from "node:assert/strict";

const { getStrokeGuideProgressStepMultiplier } = await import(
  "./strokeGuidePlayback.ts"
);

test("halves guide playback speed for one and two stroke kanji", () => {
  assert.equal(getStrokeGuideProgressStepMultiplier(1), 0.5);
  assert.equal(getStrokeGuideProgressStepMultiplier(2), 0.5);
});

test("keeps default guide playback speed for longer or unknown stroke counts", () => {
  assert.equal(getStrokeGuideProgressStepMultiplier(3), 1);
  assert.equal(getStrokeGuideProgressStepMultiplier(0), 1);
  assert.equal(getStrokeGuideProgressStepMultiplier(null), 1);
  assert.equal(getStrokeGuideProgressStepMultiplier(undefined), 1);
});
