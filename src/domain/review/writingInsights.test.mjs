import test from "node:test";
import assert from "node:assert/strict";
import { buildActivityMonth, buildReviewForecast } from "./writingInsights.ts";
import { localDateKey, recordWritingActivity } from "./writingActivity.ts";
import { isDismissedForDate } from "./buildReviewQueue.ts";

test("new activity starts without fabricating historical attempts", () => {
  const practicedAt = new Date(2026, 9, 2, 23, 59).toISOString();
  const activity = recordWritingActivity(undefined, { practicedAt, score: 80, passed: true });
  assert.equal(activity.startedAt, practicedAt);
  assert.deepEqual(Object.keys(activity.days), ["2026-10-02"]);
  assert.equal(activity.days["2026-10-02"].attempts, 1);
});

test("aggregates repeated writing on one local date and splits at local midnight", () => {
  let activity;
  for (const [date, score, passed] of [
    [new Date(2026, 9, 2, 22), 60, false],
    [new Date(2026, 9, 2, 23, 59), 90, true],
    [new Date(2026, 9, 3, 0, 1), 100, true],
  ]) activity = recordWritingActivity(activity, { practicedAt: date.toISOString(), score, passed });
  assert.equal(activity.days["2026-10-02"].attempts, 2);
  assert.equal(activity.days["2026-10-02"].successes, 1);
  const month = buildActivityMonth(activity, new Date(2026, 9, 1));
  assert.equal(month.activeDays, 2);
  assert.equal(month.attempts, 3);
  assert.equal(month.averageScore, 83);
  assert.equal(activity.days["2026-10-02"].lastPracticedAt, new Date(2026, 9, 2, 23, 59).toISOString());
  assert.deepEqual(JSON.parse(JSON.stringify(activity)), activity);
});

test("invalid input is ignored and an older arrival does not replace the last time", () => {
  const activity = recordWritingActivity(undefined, { practicedAt: "2026-10-02T12:00:00.000Z", score: 90, passed: true });
  assert.equal(recordWritingActivity(activity, { practicedAt: "invalid", score: 90, passed: true }), activity);
  assert.equal(recordWritingActivity(activity, { practicedAt: "2026-10-02", score: NaN, passed: true }), activity);
  const next = recordWritingActivity(activity, { practicedAt: "2026-10-02T11:00:00.000Z", score: 80, passed: true });
  assert.equal(Object.values(next.days).at(-1).lastPracticedAt, "2026-10-02T12:00:00.000Z");
});

test("calendar handles leap years, empty months and year rollover", () => {
  assert.equal(buildActivityMonth(undefined, new Date(2024, 1, 1)).days.length, 29);
  const february = buildActivityMonth(undefined, new Date(2026, 1, 1));
  assert.equal(february.days.length, 28);
  assert.equal(february.averageScore, null);
  assert.equal(february.leadingBlanks, 0);
  assert.equal(buildActivityMonth(undefined, new Date(2026, 12, 1)).days[0].key, "2027-01-01");
});

test("forecast separates overdue, later today, future and deferred without the queue's 20-item cap", () => {
  const now = new Date(2026, 11, 31, 12);
  const make = (id, date) => ({ characterId: id, attempts: 1, successes: 1, failures: 0, averageScore: 82, lastScore: 82, lastPracticedAt: new Date(2026, 11, 28).toISOString(), nextReviewAt: date.toISOString() });
  const progress = Object.fromEntries(Array.from({ length: 25 }, (_, index) => [`due${index}`, make(`due${index}`, now)]));
  progress.today = make("today", new Date(2026, 11, 31, 20));
  progress.tomorrow = make("tomorrow", new Date(2027, 0, 1, 8));
  progress.later = make("later", new Date(2027, 0, 7));
  const forecast = buildReviewForecast(progress, { due0: { dismissedAt: now.toISOString() } }, now);
  assert.equal(forecast.dueNow.length, 24);
  assert.equal(forecast.days[0].count, 1);
  assert.equal(forecast.days[1].count, 2);
  assert.equal(forecast.days[1].key, "2027-01-01");
  assert.equal(forecast.laterCount, 1);
});

test("today's dismissal uses local midnight rather than UTC midnight", () => {
  const before = new Date(2026, 9, 2, 23, 59);
  const after = new Date(2026, 9, 3, 0, 1);
  assert.equal(localDateKey(before), "2026-10-02");
  assert.equal(isDismissedForDate({ dismissedAt: before.toISOString() }, after), false);
  assert.equal(isDismissedForDate({ dismissedAt: after.toISOString() }, new Date(2026, 9, 3, 23)), true);
});
