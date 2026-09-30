import assert from "node:assert/strict";
import test from "node:test";

import { DAILY_READINGS } from "./dailyReading.ts";

test("keeps each Japanese passage within its level character limit", () => {
  for (const reading of Object.values(DAILY_READINGS)) {
    assert.ok(reading.body.length <= reading.maxCharacters);
    assert.match(reading.body, /[ぁ-んァ-ヶ一-龠]/);
  }
});

test("uses the requested character limits for each level", () => {
  assert.equal(DAILY_READINGS.beginner.maxCharacters, 600);
  assert.equal(DAILY_READINGS.intermediate.maxCharacters, 1500);
  assert.equal(DAILY_READINGS.advanced.maxCharacters, 3000);
});

test("provides a Korean translation and vocabulary for each reading", () => {
  for (const reading of Object.values(DAILY_READINGS)) {
    assert.match(reading.translationKo, /[가-힣]/);
    assert.ok(reading.vocabulary.length > 0);
    assert.ok(reading.vocabulary.every((word) => word.reading && word.meaningKo));
  }
});

test("keeps vocabulary unique by dictionary form and resolves inflected verbs", () => {
  for (const reading of Object.values(DAILY_READINGS)) {
    const dictionaryForms = reading.vocabulary.map((word) => word.surface);
    assert.equal(new Set(dictionaryForms).size, dictionaryForms.length);
  }

  const verb = DAILY_READINGS.beginner.vocabulary.find((word) =>
    word.forms?.includes("行きました"),
  );
  assert.equal(verb?.surface, "行く");
  assert.equal(verb?.reading, "いく");
});
