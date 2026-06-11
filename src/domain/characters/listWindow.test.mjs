import test from "node:test";
import assert from "node:assert/strict";

const {
  DEFAULT_CHARACTER_LIST_LIMIT,
  getDefaultCharacterListWindow,
  getNextCharacterListLimit,
} = await import("./listWindow.ts");

test("keeps the first 20 character ids by default", () => {
  const ids = Array.from({ length: 25 }, (_, index) => `kanji-${index + 1}`);

  assert.equal(DEFAULT_CHARACTER_LIST_LIMIT, 20);
  assert.deepEqual(getDefaultCharacterListWindow(ids), ids.slice(0, 20));
});

test("returns every character id when the list is shorter than the default limit", () => {
  const ids = ["one", "two", "three"];

  assert.deepEqual(getDefaultCharacterListWindow(ids), ids);
});

test("keeps the requested character id window when loading more", () => {
  const ids = Array.from({ length: 45 }, (_, index) => `kanji-${index + 1}`);

  assert.deepEqual(getDefaultCharacterListWindow(ids, 40), ids.slice(0, 40));
});

test("increases the character list limit by 20 without exceeding total", () => {
  assert.equal(getNextCharacterListLimit(20, 45), 40);
  assert.equal(getNextCharacterListLimit(40, 45), 45);
  assert.equal(getNextCharacterListLimit(45, 45), 45);
});
