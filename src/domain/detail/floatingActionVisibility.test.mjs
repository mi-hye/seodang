import assert from "node:assert/strict";
import test from "node:test";

const { isInlineActionFullyVisible } = await import(
  "./floatingActionVisibility.ts"
);

test("keeps the floating action visible before the inline action reaches the viewport", () => {
  assert.equal(
    isInlineActionFullyVisible({
      inlineActionTop: 900,
      inlineActionHeight: 64,
      scrollOffsetY: 0,
      viewportHeight: 700,
    }),
    false,
  );
});

test("keeps the floating action visible when the inline action is only partly visible", () => {
  assert.equal(
    isInlineActionFullyVisible({
      inlineActionTop: 900,
      inlineActionHeight: 64,
      scrollOffsetY: 240,
      viewportHeight: 700,
      bottomPadding: 16,
    }),
    false,
  );
});

test("uses the inline action only when it is fully visible with bottom padding", () => {
  assert.equal(
    isInlineActionFullyVisible({
      inlineActionTop: 900,
      inlineActionHeight: 64,
      scrollOffsetY: 280,
      viewportHeight: 700,
      bottomPadding: 16,
    }),
    true,
  );
});

test("keeps the floating action visible until the inline action is measured", () => {
  assert.equal(
    isInlineActionFullyVisible({
      inlineActionTop: 900,
      inlineActionHeight: null,
      scrollOffsetY: 1000,
      viewportHeight: 700,
    }),
    false,
  );
});

test("keeps the floating action visible until the viewport is measured", () => {
  assert.equal(
    isInlineActionFullyVisible({
      inlineActionTop: 100,
      inlineActionHeight: 64,
      scrollOffsetY: 0,
      viewportHeight: 0,
    }),
    false,
  );
});
