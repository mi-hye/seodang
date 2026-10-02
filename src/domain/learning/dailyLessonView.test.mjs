import test from "node:test";
import assert from "node:assert/strict";
import { getDailyLessonView } from "./dailyLessonView.ts";

const base = {
  hydrated: true, hasLesson: false, finished: false,
  categoryPending: false, categoryFetching: false, categoryError: false,
  needsMore: false, candidateCount: 0,
  hasItem: false, characterLoading: false, hasCharacter: false,
};

test("successful category fetch waits for plan creation without flashing an error", () => {
  const sequence = [
    { hydrated: false },
    { categoryPending: true },
    { categoryFetching: true },
    { candidateCount: 46 },
    { hasLesson: true, hasItem: true, characterLoading: true },
    { hasLesson: true, hasItem: true, hasCharacter: true },
  ];
  assert.deepEqual(sequence.map((state) => getDailyLessonView({ ...base, ...state })), ["loading", "loading", "loading", "loading", "loading", "ready"]);
});

test("real category errors and empty results still expose retry, including failed pagination", () => {
  assert.equal(getDailyLessonView(base), "error");
  assert.equal(getDailyLessonView({ ...base, categoryError: true }), "error");
  assert.equal(getDailyLessonView({ ...base, candidateCount: 20, categoryError: true, needsMore: true }), "error");
  assert.equal(getDailyLessonView({ ...base, candidateCount: 20, needsMore: true }), "loading");
});

test("saved lessons ignore disabled category query pending status", () => {
  assert.equal(getDailyLessonView({ ...base, hasLesson: true, hasItem: true, hasCharacter: true, categoryPending: true }), "ready");
  assert.equal(getDailyLessonView({ ...base, hasLesson: true, hasItem: true, categoryPending: true }), "error");
  assert.equal(getDailyLessonView({ ...base, hasLesson: true, finished: true, categoryPending: true }), "complete");
});
