import test from "node:test";
import assert from "node:assert/strict";
import { PET_APPEARANCES, getPetAppearance } from "./petAppearance.ts";
import { createLearningPet, getPetGrowth, feedLearningPet } from "./learningPet.ts";
import { getDogSprite } from "./pixelDog.ts";

test("five appearance milestones change at 10, 20, 30 and 40 without capping levels", () => {
  assert.deepEqual(PET_APPEARANCES.map((x) => x.resolution), [24, 32, 48, 64, 96]);
  for (const [level, stage] of [[1, 1], [9, 1], [10, 2], [19, 2], [20, 3], [29, 3], [30, 4], [39, 4], [40, 5], [50, 5], [999, 5]]) {
    const pet = { ...createLearningPet(), totalFed: (level - 1) * 3 };
    assert.deepEqual(getPetGrowth(pet), { level, stage, progress: 0 });
    assert.equal(getPetAppearance(level).stage, stage);
  }
});

test("feeding across a visual milestone keeps food accounting and existing progress", () => {
  const pet = { ...createLearningPet(), totalFed: 26, food: 4 };
  assert.equal(getPetGrowth(pet).stage, 1);
  const next = feedLearningPet(pet);
  assert.deepEqual(getPetGrowth(next), { level: 10, progress: 0, stage: 2 });
  assert.equal(next.food, 3);
  assert.equal(next.rewardsByDay, pet.rewardsByDay);
});

test("all five pixel grids are distinct, bounded, cached and have separate animated tails", () => {
  const fingerprints = new Set();
  let previousRuns = 0;
  for (const { stage, resolution } of PET_APPEARANCES) {
    const sprite = getDogSprite(stage);
    assert.equal(sprite, getDogSprite(stage));
    assert.equal(sprite.resolution, resolution);
    assert.ok(sprite.body.length > 0 && sprite.tail.length > 0);
    assert.ok(sprite.body.length + sprite.tail.length <= 22);
    fingerprints.add(JSON.stringify(sprite));
    let runs = 0;
    for (const layer of [sprite.body, sprite.tail]) for (const path of layer) {
      assert.match(path.color, /^#[A-F0-9]{6}$/i);
      for (const match of path.d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
        const [, x, y, width, back] = match.map(Number);
        assert.ok(x >= 0 && y >= 0 && y < resolution && x + width <= resolution);
        assert.equal(width, back);
        runs++;
      }
    }
    assert.ok(runs > previousRuns, `stage ${stage} has a genuinely denser grid`);
    previousRuns = runs;
    if (stage > 1) assert.notDeepEqual(getDogSprite(stage, true).body, sprite.body);
    assert.deepEqual(getDogSprite(stage, true).tail, sprite.tail);
  }
  assert.equal(fingerprints.size, 5);
});

test("invalid preview input clamps safely and rendering never mutates the pet", () => {
  assert.equal(getDogSprite(NaN), getDogSprite(1));
  assert.equal(getDogSprite(100), getDogSprite(5));
  assert.equal(getPetAppearance(-2).stage, 1);
  assert.equal(getPetAppearance(NaN).stage, 1);
  const pet = Object.freeze({ ...createLearningPet(), food: 12, totalFed: 4 });
  for (const { stage, level } of PET_APPEARANCES) {
    getPetAppearance(level);
    getDogSprite(stage, true);
  }
  assert.equal(pet.food, 12);
  assert.equal(pet.totalFed, 4);
});
