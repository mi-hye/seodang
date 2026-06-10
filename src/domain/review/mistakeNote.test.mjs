import test from "node:test";
import assert from "node:assert/strict";

const { buildMistakeNote, buildMistakeNoteBadges, buildMistakeNoteRank } =
  await import("./mistakeNote.ts");

test("summarizes mistaken, repeated, and conquered characters", () => {
  const note = buildMistakeNote({
    activeMistake: {
      characterId: "activeMistake",
      attempts: 1,
      successes: 0,
      failures: 1,
      averageScore: 42,
      lastScore: 42,
      lastPracticedAt: "2026-06-10T00:00:00.000Z",
    },
    repeatedMistake: {
      characterId: "repeatedMistake",
      attempts: 3,
      successes: 1,
      failures: 2,
      averageScore: 55,
      lastScore: 48,
      lastPracticedAt: "2026-06-09T00:00:00.000Z",
    },
    conqueredMistake: {
      characterId: "conqueredMistake",
      attempts: 2,
      successes: 1,
      failures: 1,
      averageScore: 67,
      lastScore: 74,
      lastPracticedAt: "2026-06-08T00:00:00.000Z",
    },
    clean: {
      characterId: "clean",
      attempts: 2,
      successes: 2,
      failures: 0,
      averageScore: 92,
      lastScore: 95,
    },
  });

  assert.equal(note.mistakeCharacters, 3);
  assert.equal(note.repeatedMistakeCharacters, 1);
  assert.equal(note.conqueredMistakeCharacters, 1);
  assert.deepEqual(note.mistakeCharacterIds, [
    "activeMistake",
    "repeatedMistake",
    "conqueredMistake",
  ]);
  assert.deepEqual(note.activeMistakeCharacterIds, [
    "activeMistake",
    "repeatedMistake",
  ]);
  assert.deepEqual(note.repeatedMistakeCharacterIds, ["repeatedMistake"]);
  assert.deepEqual(note.conqueredMistakeCharacterIds, ["conqueredMistake"]);
  assert.deepEqual(note.practiceCharacterIds, [
    "activeMistake",
    "repeatedMistake",
  ]);
});

test("uses conquered mistakes for practice when every mistake was recently passed", () => {
  const note = buildMistakeNote({
    conquered: {
      characterId: "conquered",
      attempts: 2,
      successes: 1,
      failures: 1,
      averageScore: 70,
      lastScore: 80,
    },
  });

  assert.deepEqual(note.activeMistakeCharacterIds, []);
  assert.deepEqual(note.practiceCharacterIds, ["conquered"]);
});

test("returns an empty mistake note when there are no failures", () => {
  assert.deepEqual(buildMistakeNote({}), {
    activeMistakeCharacterIds: [],
    conqueredMistakeCharacterIds: [],
    conqueredMistakeCharacters: 0,
    mistakeCharacterIds: [],
    mistakeCharacters: 0,
    practiceCharacterIds: [],
    repeatedMistakeCharacterIds: [],
    repeatedMistakeCharacters: 0,
  });
});

test("builds mistake note badges from conquered count", () => {
  assert.deepEqual(buildMistakeNoteBadges(50), [
    {
      id: "first_conquest",
      achieved: true,
      current: 1,
      progressPercent: 100,
      remaining: 0,
      threshold: 1,
      titleKey: "mistakeNote.badge.firstConquest.title",
      bodyKey: "mistakeNote.badge.firstConquest.body",
    },
    {
      id: "mistake_hunter",
      achieved: true,
      current: 50,
      progressPercent: 100,
      remaining: 0,
      threshold: 50,
      titleKey: "mistakeNote.badge.mistakeHunter.title",
      bodyKey: "mistakeNote.badge.mistakeHunter.body",
    },
    {
      id: "conquest_master",
      achieved: false,
      current: 50,
      progressPercent: 50,
      remaining: 50,
      threshold: 100,
      titleKey: "mistakeNote.badge.conquestMaster.title",
      bodyKey: "mistakeNote.badge.conquestMaster.body",
    },
  ]);
});

test("builds mistake note rank from conquered count", () => {
  assert.deepEqual(buildMistakeNoteRank(0), {
    id: "beginner",
    titleKey: "mistakeNote.rank.beginner",
    current: 0,
    nextTitleKey: "mistakeNote.rank.practitioner",
    nextThreshold: 1,
    remainingToNext: 1,
  });

  assert.deepEqual(buildMistakeNoteRank(12), {
    id: "practitioner",
    titleKey: "mistakeNote.rank.practitioner",
    current: 12,
    nextTitleKey: "mistakeNote.rank.conqueror",
    nextThreshold: 50,
    remainingToNext: 38,
  });

  assert.deepEqual(buildMistakeNoteRank(50), {
    id: "conqueror",
    titleKey: "mistakeNote.rank.conqueror",
    current: 50,
    nextTitleKey: "mistakeNote.rank.master",
    nextThreshold: 100,
    remainingToNext: 50,
  });

  assert.deepEqual(buildMistakeNoteRank(100), {
    id: "master",
    titleKey: "mistakeNote.rank.master",
    current: 100,
    nextTitleKey: undefined,
    nextThreshold: undefined,
    remainingToNext: 0,
  });
});
