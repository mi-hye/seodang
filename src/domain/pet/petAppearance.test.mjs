import test from "node:test";
import assert from "node:assert/strict";
import { PET_APPEARANCES, getPetAppearance, getNextPetAppearance } from "./petAppearance.ts";
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

test("growth guide shows the next appearance, not the next numerical level", () => {
  for (const [level, next] of [[1, 10], [9, 10], [10, 20], [19, 20], [20, 30], [29, 30], [30, 40], [39, 40]]) {
    assert.equal(getNextPetAppearance(level)?.level, next);
  }
  for (const level of [40, 41, 999]) assert.equal(getNextPetAppearance(level), undefined);
  assert.equal(getNextPetAppearance(NaN)?.level, 10);
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

test("detailed dog keeps straight cheek edges and a solid upturned tail", () => {
  const { body, tail } = getDogSprite(5);
  const pixels = (paths) => {
    const result = new Set();
    for (const { d } of paths) for (const match of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
      const [, x, y, width] = match.map(Number);
      for (let i = 0; i < width; i++) result.add(`${x + i}:${y}`);
    }
    return result;
  };
  const face = pixels(body);
  for (const y of [32, 36, 40, 44]) {
    assert.ok(face.has(`13:${y}`));
    assert.equal(face.has(`12:${y}`), false);
  }
  assert.ok(pixels(tail).has("69:70"));
});

const pixelGrid = (sprite, layer) => {
  const grid = Array.from({ length: sprite.resolution }, () => Array(sprite.resolution).fill("."));
  for (const { color, d } of sprite[layer]) for (const match of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
    const [, x, y, width] = match.map(Number);
    grid[y].fill(color, x, x + width);
  }
  return grid;
};

test("level 10 onward has two eye glints and expressive happy eyes", () => {
  for (let stage = 2; stage <= 5; stage++) {
    const sprite = getDogSprite(stage);
    const grid = pixelGrid(sprite, "body");
    const glints = grid.flatMap((row, y) => row.flatMap((color, x) => color === "#FFFCF0" ? [{ x, y }] : []));
    assert.ok(glints.some(({ x }) => x < sprite.resolution * 10.5 / 24));
    assert.ok(glints.some(({ x }) => x > sprite.resolution * 10.5 / 24));
    assert.notDeepEqual(getDogSprite(stage, true).body, sprite.body);
  }
});

test("level 10 has a hand-placed face with a solid nose, separate eyes and a closed chin", () => {
  const idle = pixelGrid(getDogSprite(2), "body");
  for (const x of [10, 16]) {
    assert.equal(idle[12][x], "#FFFCF0");
    assert.equal(idle[13][x], "#382E2B");
  }
  for (const x of [12, 13, 14, 15]) {
    assert.equal(idle[15][x], "#382E2B");
    assert.notEqual(idle[14][x], "#382E2B", "eyes and nose must not merge");
  }
  for (let x = 8; x <= 19; x++) assert.equal(idle[19][x], "#644B3E");
  const happy = pixelGrid(getDogSprite(2, true), "body");
  for (const x of [10, 16]) {
    assert.equal(happy[12][x], "#382E2B");
    assert.equal(happy[13][x - 1], "#382E2B");
    assert.equal(happy[13][x + 1], "#382E2B");
  }
  assert.equal(happy[17][13], "#E8A89C");
});

test("level 20 refines level 10's close-set eyes, solid nose and closed chin at 48px", () => {
  const sprite = getDogSprite(3);
  assert.equal(sprite.resolution, 48);
  const idle = pixelGrid(sprite, "body");
  for (const eye of [15, 24]) {
    assert.equal(idle[18][eye], "#FFFCF0");
    assert.equal(idle[19][eye + 1], "#382E2B");
    assert.equal(idle[20][eye + 2], "#644B3E");
  }
  for (let x = 18; x <= 23; x++) {
    assert.equal(idle[23][x], "#382E2B");
    assert.notEqual(idle[22][x], "#382E2B", "keep eyes separate from nose");
  }
  assert.equal(idle[25][20], "#382E2B");
  for (let x = 12; x <= 29; x++) assert.equal(idle[29][x], "#644B3E");
  const happy = pixelGrid(getDogSprite(3, true), "body");
  for (const eye of [15, 24]) {
    assert.equal(happy[18][eye + 1], "#382E2B");
    assert.equal(happy[20][eye - 1], "#382E2B");
    assert.equal(happy[20][eye + 3], "#382E2B");
  }
  assert.equal(happy[26][20], "#E8A89C");
});

test("level 30 extends level 20's face at 64px without bringing back the ring mouth", () => {
  const sprite = getDogSprite(4);
  assert.equal(sprite.resolution, 64);
  const idle = pixelGrid(sprite, "body");
  for (const eye of [20, 32]) {
    assert.equal(idle[24][eye], "#FFFCF0");
    assert.equal(idle[24][eye + 1], "#FFFCF0");
    assert.equal(idle[25][eye + 1], "#382E2B");
    assert.equal(idle[27][eye + 3], "#644B3E");
  }
  for (let x = 24; x <= 31; x++) {
    assert.equal(idle[31][x], "#382E2B");
    assert.notEqual(idle[30][x], "#382E2B", "eyes and nose remain separate");
  }
  assert.equal(idle[34][27], "#382E2B");
  assert.equal(idle[35][27], "#FFF3D9", "idle muzzle has no hollow mouth");
  for (let x = 16; x <= 39; x++) assert.equal(idle[39][x], "#644B3E");
  const happy = pixelGrid(getDogSprite(4, true), "body");
  for (const eye of [20, 32]) {
    assert.equal(happy[24][eye + 1], "#382E2B");
    assert.equal(happy[27][eye - 1], "#382E2B");
    assert.equal(happy[27][eye + 4], "#382E2B");
  }
  assert.equal(happy[35][27], "#E8A89C");
});

test("level 40 keeps level 30's face proportions and solid nose at 96px", () => {
  const sprite = getDogSprite(5);
  assert.equal(sprite.resolution, 96);
  const idle = pixelGrid(sprite, "body");
  for (const eye of [30, 48]) {
    assert.equal(idle[36][eye + 2], "#FFFCF0");
    assert.equal(idle[37][eye + 1], "#FFFCF0");
    assert.equal(idle[38][eye + 2], "#382E2B");
    assert.equal(idle[41][eye + 5], "#644B3E");
  }
  for (let row = 47; row <= 52; row++) {
    for (let x = 36 + row - 47; x <= 47 - (row - 47); x++) assert.equal(idle[row][x], "#382E2B");
  }
  assert.equal(idle[46][41], "#FFF3D9", "eyes and nose remain separate");
  assert.equal(idle[53][41], "#FFF3D9", "no ring mouth below the nose");
  for (let x = 24; x <= 59; x++) {
    assert.equal(idle[58][x], "#644B3E");
    assert.equal(idle[59][x], "#644B3E");
  }
  const happy = pixelGrid(getDogSprite(5, true), "body");
  for (const eye of [30, 48]) {
    assert.equal(happy[36][eye + 2], "#382E2B");
    assert.equal(happy[41][eye - 2], "#382E2B");
    assert.equal(happy[41][eye + 7], "#382E2B");
  }
  assert.equal(happy[55][41], "#E8A89C");
});

test("level 20, 30 and 40 have distinct scarf, scroll and scholar silhouettes", () => {
  const at = (stage, x, y) => {
    const sprite = getDogSprite(stage);
    return pixelGrid(sprite, "body")[Math.floor(y * sprite.resolution / 24)][Math.floor(x * sprite.resolution / 24)];
  };
  assert.equal(at(3, 10.5, 16), "#C85D50", "Lv.20 red neckerchief");
  assert.equal(at(4, 10.5, 16), "#C85D50", "Lv.30 keeps the neckerchief");
  assert.equal(at(3, 5, 18.5), ".");
  assert.equal(at(4, 5, 18.5), "#FFF3D9", "Lv.30 carries a parchment scroll");
  assert.equal(at(3, 15.6, 20), ".");
  assert.notEqual(at(4, 15.6, 20), ".", "Lv.30 body grows beyond Lv.20");
  assert.equal(at(4, 10.5, 3), ".");
  assert.equal(at(5, 10.5, 3), "#4B4941", "Lv.40 scholar cap");
  assert.equal(at(5, 10.5, 16), "#6F9C91", "Lv.40 jade neckerchief");
  assert.equal(at(5, 5, 19), ".", "no robe sleeves outside the body");
  for (const stage of [3, 4, 5]) {
    const idle = pixelGrid(getDogSprite(stage), "body");
    const happy = pixelGrid(getDogSprite(stage, true), "body");
    const resolution = idle.length;
    for (let y = Math.ceil(15 * resolution / 24); y < resolution; y++) {
      assert.deepEqual(idle[y], happy[y], "expression changes never remove milestone clothing");
    }
  }
});

test("level 40 wears only a short neckerchief with its chest and paws uncovered", () => {
  for (const happy of [false, true]) {
    const grid = pixelGrid(getDogSprite(5, happy), "body");
    const at = (x, y) => grid[Math.floor(y * 4)][Math.floor(x * 4)];
    assert.equal(at(10.5, 16), "#6F9C91", "jade scarf stays at the neck");
    assert.equal(at(10.5, 18.5), "#FFF3D9", "natural cream chest remains visible");
    const scarfColors = new Set(["#6F9C91", "#3F655A", "#9BC2AC"]);
    for (let y = 70; y < grid.length; y++) {
      assert.ok(grid[y].every(color => !scarfColors.has(color)), "no clothing below the neck");
    }
    for (const x of [7, 14]) assert.equal(at(x, 22), "#FFF3D9", "both paws remain visible");
  }
});

test("tail stays three-color and chunky at every detailed milestone", () => {
  for (let stage = 2; stage <= 5; stage++) {
    const sprite = getDogSprite(stage);
    assert.deepEqual(new Set(sprite.tail.map(path => path.color)), new Set(["#644B3E", "#FFF3D9", "#D99D5E"]));
    const rows = pixelGrid(sprite, "tail").map(row => row.join(","));
    assert.ok(new Set(rows).size <= 8, "seven coarse shape rows plus background; no fine spiral or shading");
  }
});
