import test from "node:test";
import assert from "node:assert/strict";

const {
  getExampleWordBody,
  getVisibleExampleWords,
  normalizeExampleWords,
} = await import("/Users/kangmihye/Desktop/study/seodang/src/domain/kanji/exampleWords.ts");

test("normalizes valid example words and drops incomplete rows", () => {
  assert.deepEqual(
    normalizeExampleWords([
      { word: "日本", reading: "ニホン", meaningKo: "일본", meaningJa: "日本" },
      { word: "毎日", reading: "まいにち", meaningKo: "매일" },
      { word: "", reading: "にち", meaningKo: "날" },
      { word: "日記", reading: "", meaningKo: "일기" },
    ]),
    [
      { word: "日本", reading: "にほん", meaningKo: "일본", meaningJa: "日本" },
      { word: "毎日", reading: "まいにち", meaningKo: "매일", meaningJa: null },
    ],
  );
});

test("filters words that already appear in the example sentence", () => {
  const words = normalizeExampleWords([
    { word: "日本", reading: "にほん", meaningKo: "일본" },
    { word: "日曜日", reading: "にちようび", meaningKo: "일요일" },
    { word: "毎日", reading: "まいにち", meaningKo: "매일" },
  ]);

  assert.deepEqual(
    getVisibleExampleWords({
      words,
      exampleJa: "日曜日に学校へ行きます。",
    }),
    [
      { word: "日本", reading: "にほん", meaningKo: "일본", meaningJa: null },
      { word: "毎日", reading: "まいにち", meaningKo: "매일", meaningJa: null },
    ],
  );
});

test("keeps the word text unchanged while normalizing only the reading", () => {
  assert.deepEqual(
    normalizeExampleWords([
      { word: "カード", reading: "カード", meaningKo: "카드" },
    ]),
    [
      { word: "カード", reading: "かーど", meaningKo: "카드", meaningJa: null },
    ],
  );
});

test("shows Korean word meaning only in Korean locale", () => {
  const word = normalizeExampleWords([
    { word: "学生", reading: "がくせい", meaningKo: "학생", meaningJa: "学生" },
  ])[0];

  assert.equal(getExampleWordBody(word, "ko"), "학생");
  assert.equal(getExampleWordBody(word, "ja"), null);
});
