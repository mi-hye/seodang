import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyLesson } from "./buildDailyLesson.ts";
import { completeLessonItem, getTodayLesson } from "./dailyLessonProgress.ts";
import { createLearningPet, rewardLearningPet, getTodayPetRewards } from "../pet/learningPet.ts";

const now = new Date(2026, 9, 2, 12);
const progress = (id, patch = {}) => ({ characterId: id, attempts: 1, successes: 1, failures: 0, averageScore: 90, lastScore: 90, lastPracticedAt: new Date(2026, 8, 1).toISOString(), nextReviewAt: new Date(2026, 9, 1).toISOString(), ...patch });
const make = (patch = {}) => buildDailyLesson({ now, candidates: ["a", "b", "c", "d"].map((id) => ({ id })), categoryKey: "kana_hiragana", progress: {}, dismissed: {}, ...patch });
const attempt = (lesson, patch = {}) => ({ lessonId: lesson.id, characterId: lesson.items.find((item) => !item.completedAt)?.characterId, passed: true, practicedAt: now.toISOString(), ...patch });

test("first lesson chooses three distinct new characters in curriculum order", () => {
  const lesson = make();
  assert.deepEqual(lesson.items.map((item) => item.characterId), ["a", "b", "c"]);
  assert.ok(lesson.items.every((item) => item.kind === "new"));
  assert.equal(lesson.day, "2026-10-02");
});

test("up to two due reviews precede new material, with no duplicates", () => {
  const lesson = make({ progress: { a: progress("a"), b: progress("b"), x: progress("x") } });
  assert.deepEqual(lesson.items.map((item) => [item.characterId, item.kind]), [["a", "review"], ["b", "review"], ["c", "new"]]);
});

test("one due review leaves two new slots, dismissed and future reviews stay excluded", () => {
  const lesson = make({ progress: { x: progress("x"), y: progress("y"), z: progress("z", { nextReviewAt: new Date(2026, 9, 3).toISOString() }) }, dismissed: { y: { dismissedAt: now.toISOString() } } });
  assert.deepEqual(lesson.items.map((item) => item.characterId), ["x", "a", "b"]);
  assert.equal(lesson.items[0].categoryKey, undefined);
});

test("a fully learned category uses review, and short/empty catalogs never invent characters", () => {
  const lesson = make({ candidates: [{ id: "a" }, { id: "a" }, { id: "b" }], progress: { a: progress("a"), b: progress("b") } });
  assert.deepEqual(lesson.items.map((item) => item.characterId), ["a", "b"]);
  assert.ok(lesson.items.every((item) => item.kind === "review"));
  assert.equal(make({ candidates: [] }).items.length, 0);
});

test("completion is sequential, requires a passed attempt and is idempotent", () => {
  const lesson = make();
  for (const patch of [{ passed: false }, { lessonId: undefined }, { lessonId: "other" }, { characterId: "b" }, { characterId: "unknown" }, { practicedAt: "bad" }, { practicedAt: new Date(now.getTime() - 1).toISOString() }, { practicedAt: new Date(now.getTime() + 1).toISOString() }]) {
    assert.equal(completeLessonItem(lesson, attempt(lesson, patch), now), lesson);
  }
  const input = attempt(lesson);
  const completed = completeLessonItem(lesson, input, now);
  assert.equal(completed.items[0].completedAt, now.toISOString());
  assert.equal(completeLessonItem(completed, input, now), completed);
  assert.equal(completed.items[1].completedAt, undefined);
  assert.equal(lesson.items[0].completedAt, undefined);
});

test("pause/reload preserves exact plan and progress; tomorrow can start a new lesson", () => {
  const lesson = make();
  const saved = JSON.parse(JSON.stringify(completeLessonItem(lesson, attempt(lesson), now)));
  assert.equal(getTodayLesson(saved, now), saved);
  assert.equal(saved.items.find((item) => !item.completedAt).characterId, "b");
  const tomorrow = new Date(2026, 9, 3, 0, 1);
  assert.equal(getTodayLesson(saved, tomorrow), undefined);
  assert.equal(completeLessonItem(saved, attempt(saved), tomorrow), saved);
  assert.equal(completeLessonItem(saved, attempt(saved, { practicedAt: tomorrow.toISOString() }), tomorrow), saved);
});

test("three completions finish the lesson; lesson and free practice share the food cap", () => {
  let lesson = make();
  let pet = rewardLearningPet(createLearningPet(), { characterId: "free", attemptId: "free-1", passed: true, practicedAt: now.toISOString() }, now);
  for (let index = 0; index < 3; index++) {
    const input = { ...attempt(lesson), attemptId: `lesson-${index}` };
    lesson = completeLessonItem(lesson, input, now);
    pet = rewardLearningPet(pet, input, now);
    assert.equal(rewardLearningPet(pet, input, now), pet);
  }
  assert.ok(lesson.items.every((item) => item.completedAt));
  assert.equal(getTodayPetRewards(pet, now), 3);
  assert.equal(pet.food, 4);
  assert.equal(completeLessonItem(lesson, { ...attempt(lesson), characterId: "a" }, now), lesson);
});

test("failed attempt then successful retry earns the full ordinary reward", () => {
  let lesson = make();
  let pet = createLearningPet();
  const failed = { ...attempt(lesson, { passed: false }), attemptId: "fail" };
  assert.equal(completeLessonItem(lesson, failed, now), lesson);
  assert.equal(rewardLearningPet(pet, failed, now), pet);
  const retry = { ...attempt(lesson), attemptId: "retry" };
  lesson = completeLessonItem(lesson, retry, now);
  pet = rewardLearningPet(pet, retry, now);
  assert.equal(lesson.items.filter((item) => item.completedAt).length, 1);
  assert.equal(pet.food, 2);
});
