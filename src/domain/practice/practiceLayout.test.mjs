import test from "node:test";
import assert from "node:assert/strict";

const { getPracticePortraitLayout } = await import("./practiceLayout.ts");

test("keeps portrait canvas and submit actions within a small phone viewport", () => {
  const layout = getPracticePortraitLayout({ width: 375, height: 667 });

  assert.equal(layout.isCompactPortrait, true);
  assert.ok(layout.canvasSideLength <= 315);
  assert.ok(layout.estimatedContentHeight <= 667);
});

test("uses the available phone width as the portrait canvas limit on taller screens", () => {
  const layout = getPracticePortraitLayout({ width: 390, height: 844 });

  assert.equal(layout.isCompactPortrait, false);
  assert.equal(layout.canvasSideLength, 314);
  assert.ok(layout.estimatedContentHeight <= 844);
});
