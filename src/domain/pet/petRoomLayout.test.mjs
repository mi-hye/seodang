import test from "node:test";
import assert from "node:assert/strict";
import { getPetRoomLayout } from "./petRoomLayout.ts";

test("room and dog are substantially larger on a small phone", () => {
  const layout = getPetRoomLayout(360, 640, 1);
  assert.ok(layout.roomHeight >= 250);
  assert.ok(layout.dogSize >= 150);
  assert.ok(layout.dogSize <= 180);
});

test("large displays keep a bounded room and growth never shrinks the dog", () => {
  const small = getPetRoomLayout(1200, 1000, 1);
  const grown = getPetRoomLayout(1200, 1000, 3);
  assert.equal(small.roomHeight, 430);
  assert.equal(small.dogSize, 190);
  assert.equal(grown.dogSize, 210);
});

test("landscape retains a usable scene without an oversized dog", () => {
  const layout = getPetRoomLayout(640, 360, 1);
  assert.equal(layout.roomHeight, 250);
  assert.ok(layout.dogSize < layout.roomHeight);
});
