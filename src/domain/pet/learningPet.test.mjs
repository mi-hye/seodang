import test from "node:test";
import assert from "node:assert/strict";
import { migrateLearningPet, createLearningPet, rewardLearningPet, feedLearningPet, getPetGrowth, getTodayPetRewards, hasPetReward } from "./learningPet.ts";

const now = new Date(2026, 9, 2, 12);
const attempt = (id, patch = {}) => ({ characterId: id, attemptId: `attempt-${id}`, passed: true, practicedAt: now.toISOString(), ...patch });

test("existing users start with one welcome food, no invented learning rewards", () => {
  const pet = createLearningPet();
  assert.equal(pet.food, 1);
  assert.equal(getTodayPetRewards(pet, now), 0);
  assert.equal(getPetGrowth(pet).level, 1);
});

test("new and review practice earn once per character per local day, capped at three", () => {
  let pet = rewardLearningPet(createLearningPet(), attempt("あ"), now);
  assert.equal(pet.food, 2);
  assert.equal(rewardLearningPet(pet, attempt("あ"), now), pet);
  assert.equal(rewardLearningPet(pet, attempt("あ", { attemptId: "retry" }), now), pet);
  pet = rewardLearningPet(pet, attempt("ア"), now);
  pet = rewardLearningPet(pet, attempt("字"), now);
  assert.equal(rewardLearningPet(pet, attempt("い"), now), pet);
  assert.equal(getTodayPetRewards(pet, now), 3);
  assert.equal(pet.food, 4);
  assert.equal(hasPetReward(pet, "attempt-字", now.toISOString()), true);
  assert.equal(hasPetReward(pet, "retry", now.toISOString()), false);
});

test("failed, malformed, future and old results do not earn food", () => {
  const pet = createLearningPet();
  for (const patch of [{ passed: false }, { practicedAt: "bad" }, { characterId: "" }, { attemptId: "" }, { practicedAt: new Date(2026, 9, 1, 12).toISOString() }, { practicedAt: new Date(2026, 9, 2, 13).toISOString() }]) {
    assert.equal(rewardLearningPet(pet, attempt("a", patch), now), pet);
  }
});

test("same attempt cannot be rewarded with another character ID", () => {
  const pet = rewardLearningPet(createLearningPet(), attempt("a"), now);
  assert.equal(rewardLearningPet(pet, attempt("b", { attemptId: "attempt-a" }), now), pet);
});

test("feeding consumes exactly one food, grows every three feeds and never goes negative", () => {
  let pet = createLearningPet();
  for (const id of ["a", "b", "c"]) pet = rewardLearningPet(pet, attempt(id), now);
  for (let index = 0; index < 3; index++) pet = feedLearningPet(pet);
  assert.equal(pet.food, 1);
  assert.deepEqual(getPetGrowth(pet), { level: 2, progress: 0, stage: 1 });
  pet = feedLearningPet(pet);
  assert.equal(feedLearningPet(pet), pet);
  assert.equal(pet.food, 0);
  assert.equal(pet.totalFed, 4);
});

test("day rollover opens rewards again without removing food or growth; persistence retains claims", () => {
  let pet = rewardLearningPet(createLearningPet(), attempt("a"), now);
  pet = JSON.parse(JSON.stringify(feedLearningPet(pet)));
  const tomorrow = new Date(2026, 9, 3, 0, 1);
  assert.equal(getTodayPetRewards(pet, tomorrow), 0);
  assert.equal(pet.food, 1);
  assert.equal(pet.totalFed, 1);
  pet = rewardLearningPet(pet, attempt("a", { attemptId: "tomorrow", practicedAt: tomorrow.toISOString() }), tomorrow);
  assert.equal(pet.food, 2);
  assert.equal(hasPetReward(pet, "attempt-a", now.toISOString()), true);
});

test("new users can feed Seodang dog immediately without choosing or adopting", () => {
  const pet = migrateLearningPet();
  assert.equal(pet.species, "dog");
  assert.equal(feedLearningPet(pet).food, 0);
  assert.equal(feedLearningPet(pet).totalFed, 1);
});

test("cat, shiba and unchosen pets migrate without changing progress or rewards", () => {
  const rewarded = rewardLearningPet(createLearningPet(), attempt("a"), now);
  for (const species of ["cat", "shiba", null, undefined]) {
    const previous = { ...rewarded, species, food: 0, totalFed: 8 };
    const migrated = migrateLearningPet(JSON.parse(JSON.stringify(previous)));
    assert.deepEqual(migrated, { ...previous, species: "dog" });
    assert.equal(getPetGrowth(migrated).level, 3);
    assert.equal(rewardLearningPet(migrated, attempt("a"), now), migrated);
    assert.equal(migrateLearningPet(migrated), migrated);
    assert.equal(feedLearningPet(migrated).food, 0);
  }
});
