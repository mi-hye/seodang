import test from "node:test";
import assert from "node:assert/strict";

const { buildReviewQueue } = await import("./buildReviewQueue.ts");

test("prioritizes failed and low-scoring characters for review", () => {
  const queue = buildReviewQueue(
    {
      stable: {
        characterId: "stable",
        attempts: 4,
        successes: 4,
        failures: 0,
        averageScore: 93,
        lastScore: 94,
        lastPracticedAt: "2026-06-09T00:00:00.000Z",
      },
      failed: {
        characterId: "failed",
        attempts: 2,
        successes: 1,
        failures: 1,
        averageScore: 74,
        lastScore: 58,
        lastPracticedAt: "2026-06-10T00:00:00.000Z",
      },
      weak: {
        characterId: "weak",
        attempts: 1,
        successes: 1,
        failures: 0,
        averageScore: 76,
        lastScore: 76,
        lastPracticedAt: "2026-06-08T00:00:00.000Z",
      },
    },
    {
      now: new Date("2026-06-10T12:00:00.000Z"),
      limit: 5,
    },
  );

  assert.deepEqual(
    queue.map((item) => item.characterId),
    ["failed", "weak"],
  );
  assert.equal(queue[0].reason, "failed_recently");
  assert.equal(queue[1].reason, "low_score");
});

test("includes older passed characters after the review interval", () => {
  const queue = buildReviewQueue(
    {
      older: {
        characterId: "older",
        attempts: 3,
        successes: 3,
        failures: 0,
        averageScore: 91,
        lastScore: 91,
        lastPracticedAt: "2026-06-01T00:00:00.000Z",
      },
    },
    {
      now: new Date("2026-06-10T12:00:00.000Z"),
      limit: 5,
    },
  );

  assert.deepEqual(queue.map((item) => item.characterId), ["older"]);
  assert.equal(queue[0].reason, "due_again");
});

test("excludes characters dismissed from the current review cycle", () => {
  const queue = buildReviewQueue(
    {
      failed: {
        characterId: "failed",
        attempts: 2,
        successes: 1,
        failures: 1,
        averageScore: 74,
        lastScore: 58,
        lastPracticedAt: "2026-06-10T00:00:00.000Z",
      },
      weak: {
        characterId: "weak",
        attempts: 1,
        successes: 1,
        failures: 0,
        averageScore: 76,
        lastScore: 76,
        lastPracticedAt: "2026-06-08T00:00:00.000Z",
      },
    },
    {
      now: new Date("2026-06-10T12:00:00.000Z"),
      dismissedCharacterIds: { failed: true },
    },
  );

  assert.deepEqual(queue.map((item) => item.characterId), ["weak"]);
});
