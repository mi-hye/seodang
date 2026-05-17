export type KanjiCharacterMetadata = {
  meaningEn?: string[];
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
  const englishFallback = character.metadata?.meaningEn?.[0];

  return preferred ?? fallback ?? englishFallback ?? character.literal;
}

export function getCharacterExample(
  character: KanjiCharacter,
  locale: "ko" | "ja"
) {
  const preferred = locale === "ja" ? character.exampleJa : character.exampleKo;
  const fallback = locale === "ja" ? character.exampleKo : character.exampleJa;

  return preferred ?? fallback;
}
