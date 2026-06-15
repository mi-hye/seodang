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

test("allows review stats during the free launch", () => {
  assert.equal(
    canAccessProFeature({
      feature: "review_stats",
      isPro: false,
    }),
    true,
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

test("allows focused review sessions during the free launch", () => {
  assert.equal(
    canAccessProFeature({
      feature: "focused_review",
      isPro: false,
    }),
    true,
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

test("allows mistake note during the free launch", () => {
  assert.equal(
    canAccessProFeature({
      feature: "mistake_note",
      isPro: false,
    }),
    true,
  );
});
