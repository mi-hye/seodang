import test from "node:test";
import assert from "node:assert/strict";

const {
  buildKanjiReadingsByLiteral,
  buildExampleFuriganaParts,
  getExampleKanjiIds,
  getExampleFuriganaReading,
  getReviewedExampleFuriganaPartsForDisplay,
  normalizeReviewedFuriganaParts,
} = await import("./exampleFurigana.ts");

test("uses kunyomi stem when the example has okurigana after the kanji", () => {
  assert.equal(
    getExampleFuriganaReading({
      example: "読みやすい本です。",
      literal: "読",
      reading: {
        kunyomi: ["よ.む"],
        onyomi: ["ドク"],
      },
    }),
    "よ",
  );
});

test("uses onyomi first when the kanji is not followed by hiragana", () => {
  assert.equal(
    getExampleFuriganaReading({
      example: "日本へ行きます。",
      literal: "日",
      reading: {
        kunyomi: ["ひ", "もと"],
        onyomi: ["ニチ", "ジツ"],
      },
    }),
    "にち",
  );
});

test("marks every kanji part with hiragana reading", () => {
  assert.deepEqual(
    buildExampleFuriganaParts({
      example: "山を見ます。",
      readingsByLiteral: {
        山: { kunyomi: ["やま"], onyomi: ["サン"] },
        見: { kunyomi: ["み.る"], onyomi: ["ケン"] },
      },
    }),
    [
      { text: "山", reading: "やま" },
      { text: "を", reading: null },
      { text: "見", reading: "み" },
      { text: "ま", reading: null },
      { text: "す", reading: null },
      { text: "。", reading: null },
    ],
  );
});

test("extracts unique kanji ids from an example", () => {
  assert.deepEqual(getExampleKanjiIds("日本語と日本。"), [
    "u065e5",
    "u0672c",
    "u08a9e",
  ]);
});

test("builds a reading lookup by literal", () => {
  assert.deepEqual(
    buildKanjiReadingsByLiteral([
      {
        literal: "学",
        kunyomi: ["まな.ぶ"],
        onyomi: ["ガク"],
      },
    ]),
    {
      学: {
        kunyomi: ["まな.ぶ"],
        onyomi: ["ガク"],
      },
    },
  );
});

test("normalizes reviewed furigana readings to hiragana", () => {
  assert.deepEqual(
    normalizeReviewedFuriganaParts([
      { text: "日", reading: "ニチ" },
      { text: "本", reading: "ほん" },
      { text: "へ", reading: null },
    ]),
    [
      { text: "日", reading: "にち" },
      { text: "本", reading: "ほん" },
      { text: "へ", reading: null },
    ],
  );
});

test("ignores reviewed furigana when it does not match the current example", () => {
  assert.equal(
    normalizeReviewedFuriganaParts(
      [
        { text: "日", reading: "に" },
        { text: "本へ行きます。", reading: null },
      ],
      "今日は休みです。",
    ),
    null,
  );
});

test("does not display guessed furigana when the example has no reviewed parts", () => {
  assert.equal(
    getReviewedExampleFuriganaPartsForDisplay({
      example: "この部を読みます。",
      reviewedParts: null,
    }),
    null,
  );
});
