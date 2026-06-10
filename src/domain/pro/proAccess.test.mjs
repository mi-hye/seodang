import test from "node:test";
import assert from "node:assert/strict";

const { canAccessProFeature } = await import("./proAccess.ts");

test("allows Pro users to access review stats", () => {
  assert.equal(
    canAccessProFeature({
      feature: "review_stats",
      isPro: true,
    }),
    true,
  );
});

test("locks review stats for free users", () => {
  assert.equal(
    canAccessProFeature({
      feature: "review_stats",
      isPro: false,
    }),
    false,
  );
});
