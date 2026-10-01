import test from "node:test";
import assert from "node:assert/strict";

const {
  getKanjiOriginBody,
  normalizeKanjiOrigin,
  normalizeOldForms,
  normalizeVerbCollocations,
} = await import("./learningNotes.ts");

test("normalizes origin and falls back to Japanese", () => {
  const origin = normalizeKanjiOrigin({
    ja: "木と木を組み合わせた会意文字。",
    ko: "나무 두 개를 합친 회의 문자입니다.",
  });

  assert.equal(getKanjiOriginBody(origin, "ko"), "나무 두 개를 합친 회의 문자입니다.");
  assert.equal(getKanjiOriginBody(origin, "ja"), "木と木を組み合わせた会意文字。");
  assert.equal(getKanjiOriginBody(normalizeKanjiOrigin({ ja: "成り立ち" }), "ko"), "成り立ち");
});

test("accepts compact and detailed old forms and removes duplicates", () => {
  assert.deepEqual(normalizeOldForms(["櫻", { literal: "櫻", noteKo: "구자체" }, { literal: "體" }]), [
    { literal: "櫻", noteJa: null, noteKo: null },
    { literal: "體", noteJa: null, noteKo: null },
  ]);
});

test("normalizes verb collocations and requires at least one verb", () => {
  assert.deepEqual(
    normalizeVerbCollocations([
      { word: "注意", reading: "チュウイ", verbs: ["を払う", "を促す", "を払う"], meaningKo: "주의" },
      { word: "確認", reading: "かくにん", verbs: [] },
    ]),
    [{ word: "注意", reading: "ちゅうい", verbs: ["を払う", "を促す"], meaningKo: "주의" }],
  );
});
