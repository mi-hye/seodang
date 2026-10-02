import type { KanjiCharacter } from "./characters";
import {
  BASIC_HIRAGANA,
  BASIC_KATAKANA,
  getKanaCharacterId,
  KANA_KOREAN_READINGS,
  KANA_ROMAJI,
  KANA_LESSONS,
  getKanaLessonByCategoryKey,
  type KanaScript,
} from "./kanaCatalog.ts";
import { kanaStrokeCounts } from "./kanaStrokeCounts.ts";
import { getKatakanaNote, katakanaExtensionReadings } from "./katakanaExtensions.ts";
import { getKanaMemory } from "./kanaMemory.ts";

export function getKanaCharacters(script: KanaScript): KanjiCharacter[] {
  const literals = [...(script === "hiragana" ? BASIC_HIRAGANA : BASIC_KATAKANA)];
  const basic: KanjiCharacter[] = literals.map((literal, index) => ({
    id: getKanaCharacterId(literal),
    literal,
    kana: {
      script,
      reading: BASIC_HIRAGANA[index],
      romaji: KANA_ROMAJI[index],
      counterpart: script === "hiragana" ? BASIC_KATAKANA[index] : BASIC_HIRAGANA[index],
      memory: getKanaMemory(literal),
    },
    meaningKo: `${KANA_KOREAN_READINGS[index]} · ${KANA_ROMAJI[index]}`,
    meaningJa: `${BASIC_HIRAGANA[index]} · ${KANA_ROMAJI[index]}`,
    onyomi: [],
    kunyomi: [],
    strokeCount: kanaStrokeCounts[literal],
    jlptLevel: null,
    japaneseSchoolLevel: null,
    japaneseGrade: null,
    exampleJa: null,
    exampleKo: null,
    sortOrder: index,
    isJoyo: false,
    metadata: null,
  }));
  if (script === "hiragana") return basic;
  const extensions = KANA_LESSONS.slice(2).flatMap((lesson) => lesson.literals.map((literal, index): KanjiCharacter => {
    const data = katakanaExtensionReadings[literal];
    const note = getKatakanaNote(literal, lesson.key);
    return {
      id: getKanaCharacterId(literal), literal,
      kana: {
        script, reading: literal, romaji: data.romaji, categoryKey: lesson.key,
        noteKo: note.ko, noteJa: note.ja,
        memory: getKanaMemory(literal, data.example, data.meaning),
        speechText: lesson.key === "kana_katakana_small" ? data.example : undefined,
      },
      meaningKo: `${data.ko} · ${data.romaji}`, meaningJa: `${literal} · ${data.romaji}`,
      onyomi: [], kunyomi: [], strokeCount: kanaStrokeCounts[literal],
      jlptLevel: null, japaneseSchoolLevel: null, japaneseGrade: null,
      exampleJa: data.example ?? null, exampleKo: data.meaning ?? null,
      sortOrder: index, isJoyo: false, metadata: null,
    };
  }));
  return [...basic, ...extensions];
}

export function getKanaCharactersByCategoryKey(key: string): KanjiCharacter[] {
  const lesson = getKanaLessonByCategoryKey(key);
  if (!lesson) return [];
  return getKanaCharacters(lesson.script).filter((character) => lesson.literals.includes(character.literal));
}

export function getAllKanaCharacters() {
  return [...getKanaCharacters("hiragana"), ...getKanaCharacters("katakana")];
}
