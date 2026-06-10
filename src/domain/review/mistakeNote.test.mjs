import test from "node:test";
import assert from "node:assert/strict";

const { buildMistakeNote } = await import("./mistakeNote.ts");

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
