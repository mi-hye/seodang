import test from "node:test";
import assert from "node:assert/strict";

const { getReviewCardValue } = await import("./reviewCardValue.ts");

function t(key, params = {}) {
  const values = {
    "home.nextReview": `다음 복습 ${params.date}`,
    "home.reviewCompleted": "완료",
    "home.reviewCount": `${params.count}자`,
    "home.reviewReady": "준비 전",
  };

  return values[key] ?? key;
}

test("shows due review count first", () => {
  assert.equal(
    getReviewCardValue({
      hasAnyProgress: true,
      hasReviewCompletedToday: false,
      nextScheduledReviewLabel: "내일",
      reviewCount: 3,
      t,
    }),
    "3자",
  );
});

test("shows ready state before any progress", () => {
  assert.equal(
    getReviewCardValue({
      hasAnyProgress: false,
      hasReviewCompletedToday: false,
      nextScheduledReviewLabel: undefined,
      reviewCount: 0,
      t,
    }),
    "준비 전",
  );
});

test("shows the next scheduled review when progress exists", () => {
  assert.equal(
    getReviewCardValue({
      hasAnyProgress: true,
      hasReviewCompletedToday: true,
      nextScheduledReviewLabel: "내일",
      reviewCount: 0,
      t,
    }),
    "다음 복습 내일",
  );
});

test("falls back to completed state when there is no future schedule", () => {
  assert.equal(
    getReviewCardValue({
      hasAnyProgress: true,
      hasReviewCompletedToday: true,
      nextScheduledReviewLabel: undefined,
      reviewCount: 0,
      t,
    }),
    "완료",
  );
});
