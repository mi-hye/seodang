export type KanjiCharacterMetadata = {
  exampleJaFurigana?: Array<{
    reading?: string | null;
    text: string;
  }>;
  meaningEn?: string[];
  specialReadings?: Array<{
    meaningJa?: string | null;
    meaningKo?: string | null;
    noteJa?: string | null;
    noteKo?: string | null;
    reading: string;
    word: string;
  }>;
  words?: Array<{
    meaningJa?: string | null;
    meaningKo?: string | null;
    reading: string;
    word: string;
  }>;
};

export type KanjiCharacter = {
  id: string;
  literal: string;
  meaningKo: string | null;
  meaningJa: string | null;
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number | null;
  jlptLevel: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  japaneseSchoolLevel: string | null;
  japaneseGrade: number | null;
  exampleJa: string | null;
  exampleKo: string | null;
  sortOrder: number | null;
  isJoyo: boolean;
  metadata: KanjiCharacterMetadata | null;
};

export function getCharacterMeaning(
  character: KanjiCharacter,
  locale: "ko" | "ja"
) {
  const preferred = locale === "ja" ? character.meaningJa : character.meaningKo;
  const fallback = locale === "ja" ? character.meaningKo : character.meaningJa;

  return preferred ?? fallback ?? "-";
}

export function getCharacterExample(
  character: KanjiCharacter,
  locale: "ko" | "ja"
) {
  const preferred = locale === "ja" ? character.exampleJa : character.exampleKo;
  const fallback = locale === "ja" ? character.exampleKo : character.exampleJa;

  return preferred ?? fallback;
}
