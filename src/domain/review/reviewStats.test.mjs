import test from "node:test";
import assert from "node:assert/strict";

const { buildReviewStats } = await import("./reviewStats.ts");

test("summarizes practiced characters and attempts", () => {
  const stats = buildReviewStats({
    strong: {
      characterId: "strong",
      attempts: 3,
      successes: 3,
      failures: 0,
      averageScore: 92,
      lastScore: 96,
      lastPracticedAt: "2026-06-10T00:00:00.000Z",
    },
    weak: {
      characterId: "weak",
      attempts: 2,
      successes: 1,
      failures: 1,
      averageScore: 62,
      lastScore: 58,
      lastPracticedAt: "2026-06-10T00:00:00.000Z",
    },
  });

  assert.equal(stats.practicedCharacters, 2);
  assert.equal(stats.totalAttempts, 5);
  assert.equal(stats.averageScore, 80);
  assert.equal(stats.successRate, 80);
});

test("counts weak and mastered characters", () => {
  const stats = buildReviewStats({
    weakByScore: {
      characterId: "weakByScore",
      attempts: 1,
      successes: 0,
      failures: 1,
      averageScore: 45,
      lastScore: 45,
    },
    weakByFailures: {
      characterId: "weakByFailures",
      attempts: 3,
      successes: 1,
      failures: 2,
      averageScore: 72,
      lastScore: 74,
    },
    mastered: {
      characterId: "mastered",
      attempts: 2,
      successes: 2,
      failures: 0,
      averageScore: 91,
      lastScore: 94,
    },
    progressing: {
      characterId: "progressing",
      attempts: 2,
      successes: 1,
      failures: 1,
      averageScore: 78,
      lastScore: 80,
    },
  });

  assert.equal(stats.weakCharacters, 2);
  assert.deepEqual(stats.weakCharacterIds, ["weakByScore", "weakByFailures"]);
  assert.equal(stats.masteredCharacters, 1);
  assert.deepEqual(stats.masteredCharacterIds, ["mastered"]);
  assert.equal(stats.inProgressCharacters, 1);
  assert.deepEqual(stats.inProgressCharacterIds, ["progressing"]);
  assert.deepEqual(stats.characterDistribution, {
    inProgress: 25,
    mastered: 25,
    weak: 50,
  });
});

test("returns zero stats when there is no progress", () => {
  assert.deepEqual(buildReviewStats({}), {
    averageScore: 0,
    characterDistribution: {
      inProgress: 0,
      mastered: 0,
      weak: 0,
    },
    inProgressCharacters: 0,
    inProgressCharacterIds: [],
    masteredCharacterIds: [],
    masteredCharacters: 0,
    practicedCharacters: 0,
    successRate: 0,
    totalAttempts: 0,
    weakCharacterIds: [],
    weakCharacters: 0,
  });
});
