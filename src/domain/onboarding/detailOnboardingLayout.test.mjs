import assert from "node:assert/strict";
import test from "node:test";

const { getDetailOnboardingLayout } = await import(
  "./detailOnboardingLayout.ts"
);

test("keeps compact bottom spacing for the detail onboarding action", () => {
  const layout = getDetailOnboardingLayout(true);

  assert.equal(layout.scrollBottomPadding, 32);
  assert.equal(layout.hintBottom, 100);
});

test("keeps compact bottom spacing for the regular detail action", () => {
  const layout = getDetailOnboardingLayout(false);

  assert.equal(layout.scrollBottomPadding, 32);
  assert.equal(layout.hintBottom, null);
});
