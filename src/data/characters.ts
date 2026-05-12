export type Example = {
  word: string;
  reading: string;
  meaningKo: string;
};

export type Character = {
  id: string;
  literal: string;
  meaningKo: string;
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
    onyomi: ["ガク"],
    kunyomi: ["まなぶ"],
    strokeCount: 8,
    jlptLevel: "N5",
    examples: [
      { word: "学校", reading: "がっこう", meaningKo: "학교" },
      { word: "学ぶ", reading: "まなぶ", meaningKo: "배우다" },
    ],
  },
  {
    id: "nichi",
    literal: "日",
    meaningKo: "날, 해",
    onyomi: ["ニチ", "ジツ"],
    kunyomi: ["ひ", "か"],
    strokeCount: 4,
    jlptLevel: "N5",
    examples: [
      { word: "日本", reading: "にほん", meaningKo: "일본" },
      { word: "日よう日", reading: "にちようび", meaningKo: "일요일" },
    ],
  },
  {
    id: "sen",
    literal: "先",
    meaningKo: "먼저, 앞",
    onyomi: ["セン"],
    kunyomi: ["さき"],
    strokeCount: 6,
    jlptLevel: "N5",
    examples: [
      { word: "先生", reading: "せんせい", meaningKo: "선생님" },
      { word: "先に", reading: "さきに", meaningKo: "먼저" },
    ],
  },
  {
    id: "kou",
    literal: "校",
    meaningKo: "학교",
    onyomi: ["コウ"],
    kunyomi: [],
    strokeCount: 10,
    jlptLevel: "N5",
    examples: [
      { word: "学校", reading: "がっこう", meaningKo: "학교" },
      { word: "校門", reading: "こうもん", meaningKo: "교문" },
    ],
  },
];

export function getCharacterById(characterId?: string) {
  return sampleCharacters.find((character) => character.id === characterId);
}
