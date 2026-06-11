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

test("allows Pro users to access focused review sessions", () => {
  assert.equal(
    canAccessProFeature({
      feature: "focused_review",
      isPro: true,
    }),
    true,
  );
});

test("locks focused review sessions for free users", () => {
  assert.equal(
    canAccessProFeature({
      feature: "focused_review",
      isPro: false,
    }),
    false,
  );
});

test("allows Pro users to access mistake note", () => {
  assert.equal(
    canAccessProFeature({
      feature: "mistake_note",
      isPro: true,
    }),
    true,
  );
});

test("locks mistake note for free users", () => {
  assert.equal(
    canAccessProFeature({
      feature: "mistake_note",
      isPro: false,
    }),
    false,
  );
});
