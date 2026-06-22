import test from "node:test";
import assert from "node:assert/strict";

const { filterAndRankKanjiSearchResults } = await import("./searchResults.ts");

function character(overrides) {
  return {
    id: overrides.id,
    literal: overrides.literal,
    meaningKo: overrides.meaningKo ?? null,
    meaningJa: overrides.meaningJa ?? null,
    exampleKo: overrides.exampleKo ?? null,
    exampleJa: overrides.exampleJa ?? null,
    onyomi: overrides.onyomi ?? [],
    kunyomi: overrides.kunyomi ?? [],
    metadata: overrides.metadata ?? null,
  };
}

test("ranks exact literal matches before prefix and contained matches", () => {
  const results = filterAndRankKanjiSearchResults(
    [
      character({ id: "u65e5-u8a18", literal: "日記" }),
      character({ id: "u65e5", literal: "日" }),
      character({ id: "u672c-u65e5", literal: "本日" }),
    ],
    "日",
  );

  assert.deepEqual(
    results.map((row) => row.id),
    ["u65e5", "u65e5-u8a18", "u672c-u65e5"],
  );
});

test("ranks exact meaning and reading matches before loose matches", () => {
  const results = filterAndRankKanjiSearchResults(
    [
      character({ id: "loose", literal: "花", meaningKo: "큰 불" }),
      character({ id: "exact", literal: "火", meaningKo: "불" }),
      character({ id: "prefix", literal: "炎", meaningKo: "불꽃" }),
    ],
    "불",
  );

  assert.deepEqual(
    results.map((row) => row.id),
    ["exact", "prefix", "loose"],
  );
});
