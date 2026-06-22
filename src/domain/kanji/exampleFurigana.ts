export type ExampleFuriganaPart = {
  text: string;
  reading: string | null;
};

export function normalizeReviewedFuriganaParts(
  parts?: Array<{ text?: unknown; reading?: unknown }> | null,
  expectedText?: string | null,
): ExampleFuriganaPart[] | null {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const normalized = parts
    .map((part) => ({
      text: typeof part.text === "string" ? part.text : "",
      reading:
        typeof part.reading === "string" && part.reading.trim()
          ? toHiragana(part.reading.trim())
          : null,
    }))
    .filter((part) => part.text);

  if (expectedText && normalized.map((part) => part.text).join("") !== expectedText) {
    return null;
  }

  return normalized.length > 0 ? normalized : null;
}

export function getReviewedExampleFuriganaPartsForDisplay({
  example,
  reviewedParts,
}: {
  example: string;
  reviewedParts: ExampleFuriganaPart[] | null;
}) {
  if (!reviewedParts) {
    return null;
  }

  return reviewedParts.map((part) => part.text).join("") === example
    ? reviewedParts
    : null;
}

export function buildExampleFuriganaParts({
  example,
  readingsByLiteral,
}: {
  example: string;
  readingsByLiteral: Record<string, KanjiReading>;
}): ExampleFuriganaPart[] {
  return Array.from(example).map((text) => ({
    text,
    reading: isKanji(text)
      ? getExampleFuriganaReading({
          example,
          literal: text,
          reading: readingsByLiteral[text],
        })
      : null,
  }));
}

export function getExampleFuriganaReading({
  example,
  literal,
  reading,
}: {
  example: string;
  literal: string;
  reading?: KanjiReading;
}) {
  if (!reading) {
    return null;
  }

  const literalIndex = example.indexOf(literal);
  const nextCharacter =
    literalIndex >= 0 ? example.charAt(literalIndex + literal.length) : "";
  const shouldPreferKunyomi = isHiragana(nextCharacter);
  const readingCandidates = shouldPreferKunyomi
    ? [...reading.kunyomi, ...reading.onyomi]
    : [...reading.onyomi, ...reading.kunyomi];

  for (const reading of readingCandidates) {
    const normalized = normalizeReading(reading, shouldPreferKunyomi);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function buildKanjiReadingsByLiteral(
  readings: Array<KanjiReading & { literal: string }>,
) {
  return Object.fromEntries(
    readings.map((reading) => [
      reading.literal,
      {
        kunyomi: reading.kunyomi,
        onyomi: reading.onyomi,
      },
    ]),
  ) satisfies Record<string, KanjiReading>;
}

export function getExampleKanjiIds(example?: string | null) {
  if (!example) {
    return [];
  }

  return unique(
    Array.from(example)
      .filter(isKanji)
      .map((literal) => toUnicodeId(literal)),
  );
}

export type KanjiReading = {
  kunyomi: string[];
  onyomi: string[];
};

function normalizeReading(reading: string, shouldUseStem: boolean) {
  const trimmed = reading.trim();

  if (!trimmed || trimmed === "-") {
    return null;
  }

  if (shouldUseStem && trimmed.includes(".")) {
    return toHiragana(trimmed.split(".")[0] || "");
  }

  return toHiragana(trimmed.replaceAll(".", ""));
}

function isHiragana(value: string) {
  return /^[ぁ-ゖ]$/.test(value);
}

function isKanji(value: string) {
  return /^\p{Script=Han}$/u.test(value);
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

function toUnicodeId(literal: string) {
  const codePoint = literal.codePointAt(0);

  if (codePoint == null) {
    return "";
  }

  return `u${codePoint.toString(16).padStart(5, "0")}`;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

const KATAKANA_START_CODE_POINT = 0x30a1;
const KATAKANA_END_CODE_POINT = 0x30f6;
const KANA_CODE_POINT_OFFSET = 0x60;
