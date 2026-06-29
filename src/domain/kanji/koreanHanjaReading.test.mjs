import test from "node:test";
import assert from "node:assert/strict";

const { getKoreanHanjaReadingLabel } = await import("./koreanHanjaReading.ts");

function character(metadata) {
  return {
    id: "u04e09",
    literal: "三",
    meaningKo: "셋",
    meaningJa: "三",
    onyomi: ["サン"],
    kunyomi: ["みっ.つ"],
    strokeCount: 3,
    jlptLevel: "N5",
    japaneseSchoolLevel: "elementary",
    japaneseGrade: 1,
    exampleJa: null,
    exampleKo: null,
    sortOrder: null,
    isJoyo: true,
    metadata,
  };
}

test("builds a Korean hanja reading label from hangul reading metadata", () => {
  assert.equal(
    getKoreanHanjaReadingLabel(character({ koreanReadingHangul: ["삼"] })),
    "삼",
  );
});

test("includes Korean hanja meaning when metadata provides it", () => {
  assert.equal(
    getKoreanHanjaReadingLabel(
      character({ koreanHanjaMeaning: ["석"], koreanReadingHangul: ["삼"] }),
    ),
    "석 삼",
  );
});
