export type ExampleWord = {
  word: string;
  reading: string;
  meaningKo: string | null;
  meaningJa: string | null;
};

export function normalizeExampleWords(
  value?: Array<Partial<ExampleWord>> | null,
) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map((row) => ({
      word: normalizeRequiredString(row.word),
      reading: normalizeReading(row.reading),
      meaningKo: normalizeNullableString(row.meaningKo),
      meaningJa: normalizeNullableString(row.meaningJa),
    }))
    .filter((row): row is ExampleWord => Boolean(row.word && row.reading))
    .filter((row) => {
      const key = `${row.word}:${row.reading}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function getVisibleExampleWords({
  words,
  exampleJa,
}: {
  words: ExampleWord[];
  exampleJa?: string | null;
}) {
  if (!exampleJa) {
    return words;
  }

  return words.filter((word) => !exampleJa.includes(word.word));
}

export function getExampleWordBody(word: ExampleWord, locale: "ko" | "ja") {
  return locale === "ko" ? word.meaningKo : null;
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeReading(value: unknown) {
  return typeof value === "string" && value.trim()
    ? toHiragana(value.trim())
    : null;
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toHiragana(value: string) {
  return Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0);

      if (
        codePoint != null &&
        codePoint >= KATAKANA_START_CODE_POINT &&
        codePoint <= KATAKANA_END_CODE_POINT
      ) {
        return String.fromCodePoint(codePoint - KANA_CODE_POINT_OFFSET);
      }

      return character;
    })
    .join("");
}

const KATAKANA_START_CODE_POINT = 0x30a1;
const KATAKANA_END_CODE_POINT = 0x30f6;
const KANA_CODE_POINT_OFFSET = 0x60;
