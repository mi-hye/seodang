import test from "node:test";
import assert from "node:assert/strict";

const { formatReviewDateLabel } = await import("./reviewDateLabel.ts");

test("formats today's review date in Korean and Japanese", () => {
  assert.equal(
    formatReviewDateLabel({
      locale: "ko",
      now: new Date("2026-06-10T09:00:00.000Z"),
      reviewAt: "2026-06-10T23:00:00.000Z",
    }),
    "오늘",
  );
  assert.equal(
    formatReviewDateLabel({
      locale: "ja",
      now: new Date("2026-06-10T09:00:00.000Z"),
      reviewAt: "2026-06-10T23:00:00.000Z",
    }),
    "今日",
  );
});

test("formats tomorrow's review date in Korean and Japanese", () => {
  assert.equal(
    formatReviewDateLabel({
      locale: "ko",
      now: new Date("2026-06-10T09:00:00.000Z"),
      reviewAt: "2026-06-11T00:00:00.000Z",
    }),
    "내일",
  );
  assert.equal(
    formatReviewDateLabel({
      locale: "ja",
      now: new Date("2026-06-10T09:00:00.000Z"),
      reviewAt: "2026-06-11T00:00:00.000Z",
    }),
    "明日",
  );
});

test("formats later review dates as month and day", () => {
  assert.equal(
    formatReviewDateLabel({
      locale: "ko",
      now: new Date("2026-06-10T09:00:00.000Z"),
      reviewAt: "2026-06-13T00:00:00.000Z",
    }),
    "6월 13일",
  );
  assert.equal(
    formatReviewDateLabel({
      locale: "ja",
      now: new Date("2026-06-10T09:00:00.000Z"),
      reviewAt: "2026-06-13T00:00:00.000Z",
    }),
    "6月13日",
  );
});

test("falls back for invalid review dates", () => {
  assert.equal(
    formatReviewDateLabel({
      locale: "ko",
      now: new Date("2026-06-10T09:00:00.000Z"),
      reviewAt: "not-a-date",
    }),
    "-",
  );
});
