import test from "node:test";
import assert from "node:assert/strict";

const { DEFAULT_CHARACTER_LIST_LIMIT, getDefaultCharacterListWindow } =
  await import("./listWindow.ts");

test("keeps the first 20 character ids by default", () => {
  const ids = Array.from({ length: 25 }, (_, index) => `kanji-${index + 1}`);

  assert.equal(DEFAULT_CHARACTER_LIST_LIMIT, 20);
  assert.deepEqual(getDefaultCharacterListWindow(ids), ids.slice(0, 20));
});

test("returns every character id when the list is shorter than the default limit", () => {
  const ids = ["one", "two", "three"];

  assert.deepEqual(getDefaultCharacterListWindow(ids), ids);
});
