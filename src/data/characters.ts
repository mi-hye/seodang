export type Example = {
  word: string;
  reading: string;
  meaningKo: string;
  meaningJa: string;
};

export type Character = {
  id: string;
  literal: string;
  meaningKo: string;
  meaningJa: string;
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  jlptLevel: "N5" | "N4" | "N3" | "N2" | "N1";
  examples: Example[];
};

export const sampleCharacters: Character[] = [
  {
    id: "gaku",
    literal: "学",
    meaningKo: "배우다, 학문",
    meaningJa: "まなぶこと、学問",
    onyomi: ["ガク"],
    kunyomi: ["まなぶ"],
    strokeCount: 8,
    jlptLevel: "N5",
    examples: [
      { word: "学校", reading: "がっこう", meaningKo: "학교", meaningJa: "学校" },
      { word: "学ぶ", reading: "まなぶ", meaningKo: "배우다", meaningJa: "学ぶ" },
    ],
  },
  {
    id: "nichi",
    literal: "日",
    meaningKo: "날, 해",
    meaningJa: "ひ、太陽、日付",
    onyomi: ["ニチ", "ジツ"],
    kunyomi: ["ひ", "か"],
    strokeCount: 4,
    jlptLevel: "N5",
    examples: [
      { word: "日本", reading: "にほん", meaningKo: "일본", meaningJa: "日本" },
      { word: "日よう日", reading: "にちようび", meaningKo: "일요일", meaningJa: "日曜日" },
    ],
  },
  {
    id: "sen",
    literal: "先",
    meaningKo: "먼저, 앞",
    meaningJa: "さき、先に",
    onyomi: ["セン"],
    kunyomi: ["さき"],
    strokeCount: 6,
    jlptLevel: "N5",
    examples: [
      { word: "先生", reading: "せんせい", meaningKo: "선생님", meaningJa: "先生" },
      { word: "先に", reading: "さきに", meaningKo: "먼저", meaningJa: "先に" },
    ],
  },
  {
    id: "kou",
    literal: "校",
    meaningKo: "학교",
    meaningJa: "学校、校舎",
    onyomi: ["コウ"],
    kunyomi: [],
    strokeCount: 10,
    jlptLevel: "N5",
    examples: [
      { word: "学校", reading: "がっこう", meaningKo: "학교", meaningJa: "学校" },
      { word: "校門", reading: "こうもん", meaningKo: "교문", meaningJa: "校門" },
    ],
  },
];

export function getCharacterById(characterId?: string) {
  return sampleCharacters.find((character) => character.id === characterId);
}

export function getCharacterMeaning(character: Character, locale: "ko" | "ja") {
  return locale === "ja" ? character.meaningJa : character.meaningKo;
}

export function getExampleMeaning(example: Example, locale: "ko" | "ja") {
  return locale === "ja" ? example.meaningJa : example.meaningKo;
}
