import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Match the app's TypeScript extension resolution for data-layer integration tests.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const { getAllKanaCharacters, getKanaCharacters, getKanaCharactersByCategoryKey } = await import("./kanaCharacters.ts");
const { getKanaCategoryGroup, getKanaScriptById, getKanaCharacterId, getKanaLiteralById, KANA_LESSONS } = await import("./kanaCatalog.ts");
const { kanaStrokes } = await import("./kanaStrokes.ts");
const { getKanaStrokes } = await import("./kanaStrokeLayout.ts");
const {
  fetchKanjiCategoryCharactersByKey,
  fetchKanjiCharacterById,
  fetchKanjiCharactersByIds,
} = await import("./fetchKanjiCharacters.ts");
const { fetchKanjiStrokeDataByLiteral } = await import("./fetchKanjiStrokeData.ts");
const { fetchCategoryMappingsByCharacterIds } = await import("./fetchKanjiCategoryProgress.ts");
const { evaluatePractice } = await import("../domain/practice/evaluatePractice.ts");
const { filterAndRankKanjiSearchResults } = await import("../domain/characters/searchResults.ts");

test("covers exactly 46 modern basic kana per script in gojūon order", () => {
  const characters = getAllKanaCharacters();
  assert.equal(new Set(characters.map((character) => character.id)).size, 183);
  for (const script of ["hiragana", "katakana"]) {
    const rows = getKanaCharactersByCategoryKey(`kana_${script}`);
    assert.equal(rows.length, 46);
    assert.equal(rows[0].literal, script === "hiragana" ? "あ" : "ア");
    assert.equal(rows.at(-1).literal, script === "hiragana" ? "ん" : "ン");
    for (const row of rows) {
      assert.equal(getKanaScriptById(row.id), script);
      assert.ok(row.kana.reading && row.kana.romaji && row.kana.counterpart);
      assert.equal(row.strokeCount, kanaStrokes[row.literal].length);
      assert.equal(characters.find((other) => other.literal === row.kana.counterpart).kana.counterpart, row.literal);
    }
  }
  for (const invalid of ["kana-0041", "kana-304c", "kana-", "u3042"]) {
    assert.equal(getKanaScriptById(invalid), undefined);
  }
  assert.deepEqual(getKanaCategoryGroup("ko").categories.slice(0, 2).map((category) => category.label), ["히라가나", "가타카나"]);
  assert.deepEqual(getKanaCategoryGroup("ja").categories.slice(0, 2).map((category) => category.label), ["ひらがな", "カタカナ"]);
});

test("separates practical loanwords from basic voiced kana and preserves multi-character IDs", () => {
  assert.equal(getKanaCharacterId("ア"), "kana-30a2");
  assert.equal(getKanaCharacterId("ヴァ"), "kana-30f4-30a1");
  assert.equal(getKanaCharacterId("ウ\u3099ァ"), "kana-30f4-30a1");
  for (const row of getAllKanaCharacters()) {
    assert.equal(getKanaLiteralById(row.id), row.literal);
    assert.ok(row.strokeCount > 0);
    assert.equal(row.strokeCount, getKanaStrokes(row.literal).length);
  }
  for (const invalid of ["kana-30c6-30a3-30a2", "kana-30a2-30a4", "kana-30a6-3099", "kana-ffff"]) {
    assert.equal(getKanaScriptById(invalid), undefined);
  }
  const basic = getKanaCharactersByCategoryKey("kana_katakana").map((row) => row.literal);
  const voiced = getKanaCharactersByCategoryKey("kana_katakana_voiced").map((row) => row.literal);
  const loanwords = getKanaCharactersByCategoryKey("kana_katakana_loanwords");
  assert.ok(voiced.includes("ボ"));
  assert.ok(!voiced.includes("ヴ") && !basic.includes("ヴ"));
  for (const literal of ["ヴ", "フォ", "ティ", "ヴォ"]) {
    const row = loanwords.find((entry) => entry.literal === literal);
    assert.ok(row?.exampleJa && row?.exampleKo && row.kana.noteKo.includes("외래어"));
  }
  assert.deepEqual(getKanaCategoryGroup("ko").categories.map((category) => category.totalCharacters), [46, 46, 25, 10, 33, 23]);
});

test("loads every extended lesson offline with its own progress mapping and complete pagination", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("Offline"); });
  for (const lesson of KANA_LESSONS.slice(2)) {
    const collected = [];
    for (let offset = 0; offset < lesson.literals.length; offset += 7) {
      const page = await fetchKanjiCategoryCharactersByKey({ categoryKey: lesson.key, locale: "ko", limit: 7, offset });
      assert.equal(page.hasMore, offset + 7 < lesson.literals.length);
      assert.equal(page.total, lesson.literals.length);
      collected.push(...page.characters);
    }
    assert.deepEqual(collected.map((row) => row.literal), lesson.literals);
    for (const row of collected) {
      assert.deepEqual(await fetchKanjiCharacterById(row.id), row);
      const guide = await fetchKanjiStrokeDataByLiteral(row.literal);
      assert.equal(guide.strokes.length, row.strokeCount);
      assert.equal(guide.characterId, row.id);
    }
    const ids = collected.map((row) => row.id);
    assert.deepEqual((await fetchKanjiCharactersByIds(ids)).map((row) => row.id), ids);
    assert.deepEqual(await fetchCategoryMappingsByCharacterIds(ids), ids.map((id) => ({ character_id: id, category_id: lesson.key })));
  }
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("lays out combinations left-to-right with smaller trailing kana and complete stroke order", () => {
  for (const literal of ["ティ", "フォ", "ヴァ", "キャ", "ビュ", "ピョ"]) {
    const strokes = getKanaStrokes(literal);
    const firstCount = kanaStrokes[literal[0]].length;
    assert.deepEqual(strokes.map((stroke) => stroke.order), strokes.map((_, index) => index + 1));
    assert.equal(strokes.length, firstCount + kanaStrokes[literal[1]].length);
    assert.ok(strokes.slice(0, firstCount).every((stroke) => stroke.start.x < 50 && stroke.end.x < 50));
    assert.ok(strokes.slice(firstCount).every((stroke) => stroke.start.x > 50 && stroke.end.x > 50 && stroke.start.y > 43));
    assert.equal(strokes[firstCount].pathLength, Number((kanaStrokes[literal[1]][0].pathLength * 0.312).toFixed(3)));
  }
  assert.ok(getKanaStrokes("ッ")[0].pathLength < kanaStrokes["ツ"][0].pathLength);
});

test("gives every kana a bilingual memory cue with composition and useful comparisons", () => {
  const all = getAllKanaCharacters();
  for (const row of all) {
    assert.ok(row.kana.memory.cueKo && row.kana.memory.cueJa, row.literal);
    if (row.kana.memory.contrast) {
      assert.ok(row.kana.memory.contrastKo && row.kana.memory.contrastJa, row.literal);
    }
  }
  for (const key of ["kana_hiragana", "kana_katakana"]) {
    for (const row of getKanaCharactersByCategoryKey(key)) {
      assert.ok(row.kana.memory.word.includes(row.literal), row.literal);
      assert.ok(row.kana.memory.wordMeaningKo, row.literal);
    }
  }
  const memory = (literal) => all.find((row) => row.literal === literal).kana.memory;
  assert.equal(memory("ボ").formation, "ホ + ゛ → ボ");
  assert.equal(memory("パ").formation, "ハ + ゜ → パ");
  assert.equal(memory("ヴ").formation, "ウ + ゛ → ヴ");
  assert.equal(memory("ティ").formation, "テ + ィ → ティ");
  assert.equal(memory("ティ").contrast, "テイ / ティ");
  assert.equal(memory("ティ").word, "パーティー");
  assert.equal(memory("フォ").contrast, "フオ / フォ");
  assert.equal(memory("キャ").contrast, "キヤ / キャ");
  assert.equal(memory("シ").contrast, "シ / ツ");
  assert.equal(memory("ッ").contrast, "ツ / ッ");
  assert.ok(memory("ー").cueKo.includes("늘이는"));
});

test("loads kana lists, details, stroke guides, favorites, and progress without any network requests", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("Offline"); });
  const hira = await fetchKanjiCategoryCharactersByKey({ categoryKey: "kana_hiragana", locale: "ko", limit: 46 });
  const kata = await fetchKanjiCategoryCharactersByKey({ categoryKey: "kana_katakana", locale: "ja", limit: 46 });
  assert.equal(hira.characters.length, 46);
  assert.equal(kata.characters.length, 46);
  assert.equal(hira.hasMore, false);
  for (const character of [...hira.characters, ...kata.characters]) {
    assert.deepEqual(await fetchKanjiCharacterById(character.id), character);
    const guide = await fetchKanjiStrokeDataByLiteral(character.literal);
    assert.equal(guide.characterId, character.id);
    assert.equal(guide.strokes.length, character.strokeCount);
    assert.equal(guide.license, "LGPL-3.0-or-later");
  }
  const ids = [kata.characters.at(-1).id, hira.characters[0].id];
  assert.deepEqual((await fetchKanjiCharactersByIds(ids)).map((character) => character.id), ids);
  assert.deepEqual(await fetchCategoryMappingsByCharacterIds(ids), [
    { character_id: ids[0], category_id: "kana_katakana" },
    { character_id: ids[1], category_id: "kana_hiragana" },
  ]);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("paginates kana without losing the final character", async () => {
  const pages = await Promise.all([0, 20, 40].map((offset) =>
    fetchKanjiCategoryCharactersByKey({ categoryKey: "kana_hiragana", locale: "ko", offset, limit: 20 }),
  ));
  assert.deepEqual(pages.map((page) => page.characters.length), [20, 20, 6]);
  assert.deepEqual(pages.map((page) => page.hasMore), [true, true, false]);
  assert.deepEqual(pages.flatMap((page) => page.characters.map((row) => row.literal)), getKanaCharacters("hiragana").map((row) => row.literal));
});

test("uses real pen stroke counts for split AnimCJK outlines", () => {
  assert.equal(kanaStrokes["あ"].length, 3);
  assert.equal(kanaStrokes["き"].length, 4);
  assert.equal(kanaStrokes["さ"].length, 3);
  assert.equal(kanaStrokes["シ"].length, 3);
  assert.equal(kanaStrokes["ツ"].length, 3);
});

test("accepts every reference trace at phone canvas sizes and rejects an empty drawing", () => {
  for (const { literal } of getAllKanaCharacters()) {
    const template = getKanaStrokes(literal);
    assert.deepEqual(template.map((stroke) => stroke.order), template.map((_, i) => i + 1));
    for (const size of [280, 360]) {
      const strokes = template.map((stroke, i) => {
        const numbers = stroke.path.match(/-?\d*\.?\d+/g).map(Number);
        const points = [];
        for (let index = 0; index < numbers.length; index += 2) {
          assert.ok(numbers[index] >= 0 && numbers[index] <= 100);
          assert.ok(numbers[index + 1] >= 0 && numbers[index + 1] <= 100);
          points.push({ x: numbers[index] * size / 100, y: numbers[index + 1] * size / 100 });
        }
        assert.ok(stroke.pathLength > 0);
        return { id: `${literal}-${i}`, points };
      });
      const result = evaluatePractice({ strokes, template, canvasSize: { width: size, height: size }, t: (key) => key });
      assert.equal(result.passed, true, `${literal}: ${result.feedback}`);
      assert.equal(evaluatePractice({ strokes: [], template, canvasSize: { width: size, height: size }, t: (key) => key }).passed, false);
    }
  }
});

test("searches kana by romaji, Korean pronunciation, and the other script", () => {
  const rows = getKanaCharacters("katakana");
  assert.equal(filterAndRankKanjiSearchResults(rows, "shi")[0].literal, "シ");
  assert.equal(filterAndRankKanjiSearchResults(rows, "시")[0].literal, "シ");
  assert.equal(filterAndRankKanjiSearchResults(rows, "し")[0].literal, "シ");
  assert.equal(filterAndRankKanjiSearchResults(getKanaCharacters("hiragana"), "ン")[0].literal, "ん");
  for (const [search, literal] of [["ti", "ティ"], ["ヴォ", "ヴォ"], ["パーティー", "ティ"]]) {
    assert.equal(filterAndRankKanjiSearchResults(rows, search)[0].literal, literal);
  }
  assert.ok(filterAndRankKanjiSearchResults(rows, "포크").some((row) => row.literal === "フォ"));
});

test("keeps local kana IDs out of Supabase queries and preserves mixed favorite ordering", async (t) => {
  const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.test";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
  t.after(() => {
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  });
  const kana = getKanaCharacters("hiragana")[0];
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.ok(!decodeURIComponent(url).includes("kana-"));
    const rows = url.includes("kanji_character_categories")
      ? [{ character_id: "u65e5", category_id: "jlpt_n5" }]
      : [{ id: "u65e5", literal: "日", onyomi: ["ニチ"], kunyomi: ["ひ"] }];
    return { ok: true, json: async () => rows };
  });
  assert.deepEqual((await fetchKanjiCharactersByIds([kana.id, "u65e5"])).map((row) => row.id), [kana.id, "u65e5"]);
  assert.deepEqual(await fetchCategoryMappingsByCharacterIds([kana.id, "u65e5"]), [
    { character_id: kana.id, category_id: "kana_hiragana" },
    { character_id: "u65e5", category_id: "jlpt_n5" },
  ]);
});
