import test from "node:test";
import assert from "node:assert/strict";

const { buildReviewQueue, findNextScheduledReviewAt } = await import(
  "./buildReviewQueue.ts"
);

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

test("excludes characters before their next review time", () => {
  const queue = buildReviewQueue(
    {
      later: {
        characterId: "later",
        attempts: 2,
        successes: 1,
        failures: 1,
        averageScore: 70,
        lastScore: 58,
        lastPracticedAt: "2026-06-10T00:00:00.000Z",
        nextReviewAt: "2026-06-11T12:00:00.000Z",
      },
    },
    {
      now: new Date("2026-06-11T09:00:00.000Z"),
    },
  );

  assert.deepEqual(queue.map((item) => item.characterId), []);
});

test("includes characters once their next review time arrives", () => {
  const queue = buildReviewQueue(
    {
      due: {
        characterId: "due",
        attempts: 2,
        successes: 1,
        failures: 1,
        averageScore: 70,
        lastScore: 58,
        lastPracticedAt: "2026-06-10T00:00:00.000Z",
        nextReviewAt: "2026-06-11T12:00:00.000Z",
      },
    },
    {
      now: new Date("2026-06-11T12:00:00.000Z"),
    },
  );

  assert.deepEqual(queue.map((item) => item.characterId), ["due"]);
});

test("excludes characters dismissed today", () => {
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
      dismissedCharacterIds: {
        failed: {
          dismissedAt: "2026-06-10T09:00:00.000Z",
        },
      },
    },
  );

  assert.deepEqual(queue.map((item) => item.characterId), ["weak"]);
});

test("includes dismissed characters again on the next day", () => {
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
    },
    {
      now: new Date("2026-06-11T01:00:00.000Z"),
      dismissedCharacterIds: {
        failed: {
          dismissedAt: "2026-06-10T23:00:00.000Z",
        },
      },
    },
  );

  assert.deepEqual(queue.map((item) => item.characterId), ["failed"]);
});

test("finds the next scheduled review including items completed today", () => {
  const nextReviewAt = findNextScheduledReviewAt(
    {
      soon: {
        characterId: "soon",
        attempts: 1,
        successes: 1,
        failures: 0,
        averageScore: 88,
        lastScore: 88,
        lastPracticedAt: "2026-06-10T00:00:00.000Z",
        nextReviewAt: "2026-06-12T00:00:00.000Z",
      },
      later: {
        characterId: "later",
        attempts: 1,
        successes: 1,
        failures: 0,
        averageScore: 94,
        lastScore: 94,
        lastPracticedAt: "2026-06-10T00:00:00.000Z",
        nextReviewAt: "2026-06-17T00:00:00.000Z",
      },
    },
    {
      now: new Date("2026-06-11T00:00:00.000Z"),
    },
  );

  assert.equal(nextReviewAt, "2026-06-12T00:00:00.000Z");
});
