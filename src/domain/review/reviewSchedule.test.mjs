import test from "node:test";
import assert from "node:assert/strict";

const { calculateNextReviewAt } = await import("./reviewSchedule.ts");

test("schedules failed or low-score practice for the next day", () => {
  const nextReviewAt = calculateNextReviewAt({
    passed: false,
    score: 65,
    practicedAt: "2026-06-10T12:00:00.000Z",
  });

  assert.equal(nextReviewAt, "2026-06-11T12:00:00.000Z");
});

test("schedules medium-score practice three days later", () => {
  const nextReviewAt = calculateNextReviewAt({
    passed: true,
    score: 82,
    practicedAt: "2026-06-10T12:00:00.000Z",
  });

  assert.equal(nextReviewAt, "2026-06-13T12:00:00.000Z");
});

test("schedules high-score practice seven days later", () => {
  const nextReviewAt = calculateNextReviewAt({
    passed: true,
    score: 94,
    practicedAt: "2026-06-10T12:00:00.000Z",
  });

  assert.equal(nextReviewAt, "2026-06-17T12:00:00.000Z");
});
