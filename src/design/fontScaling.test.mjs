import assert from "node:assert/strict";
import test from "node:test";

const { getAppTextScale, scaledFont } = await import("./fontScalingConfig.ts");

test("keeps default text size when system font scale is normal", () => {
  assert.equal(getAppTextScale(1), 1);
});

test("reduces app text size when Android system font scale is large", () => {
  assert.equal(getAppTextScale(1.3), 0.72);
});

test("rounds scaled font sizes for React Native styles", () => {
  assert.equal(scaledFont(18, 0.72), 13);
});
