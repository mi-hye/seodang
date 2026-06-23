import test from "node:test";
import assert from "node:assert/strict";

const {
  getSpecialReadingBody,
  hasSpecialReadings,
  normalizeSpecialReadings,
} = await import("./specialReadings.ts");

test("normalizes valid special readings and drops incomplete rows", () => {
  assert.deepEqual(
    normalizeSpecialReadings([
      {
        word: "部屋",
        reading: "へや",
        meaningKo: "방",
        meaningJa: "部屋",
        noteKo: "이 단어에서는 部를 ‘ぶ’로 읽지 않습니다.",
        noteJa: "この語では「部」を「ぶ」と読みません。",
      },
      {
        word: "部首",
        reading: "",
        meaningKo: "부수",
      },
    ]),
    [
      {
        word: "部屋",
        reading: "へや",
        meaningKo: "방",
        meaningJa: "部屋",
        noteKo: "이 단어에서는 部를 ‘ぶ’로 읽지 않습니다.",
        noteJa: "この語では「部」を「ぶ」と読みません。",
      },
    ],
  );
});

test("selects Korean special reading body", () => {
  const reading = normalizeSpecialReadings([
    {
      word: "部屋",
      reading: "へや",
      meaningKo: "방",
      meaningJa: "部屋",
      noteKo: "이 단어에서는 部를 ‘ぶ’로 읽지 않습니다.",
      noteJa: "この語では「部」を「ぶ」と読みません。",
    },
  ])?.[0];

  assert.equal(getSpecialReadingBody(reading, "ko"), "방");
  assert.equal(hasSpecialReadings([reading]), true);
  assert.equal(hasSpecialReadings([]), false);
});

test("shows special reading meaning only in Korean locale", () => {
  const reading = normalizeSpecialReadings([
    {
      word: "部屋",
      reading: "へや",
      meaningKo: "방",
      meaningJa: "部屋",
    },
  ])?.[0];

  assert.equal(getSpecialReadingBody(reading, "ko"), "방");
  assert.equal(getSpecialReadingBody(reading, "ja"), null);
});
