export type SpecialReading = {
  word: string;
  reading: string;
  meaningKo: string | null;
  meaningJa: string | null;
  noteKo: string | null;
  noteJa: string | null;
};

export function normalizeSpecialReadings(
  value?: Array<Partial<SpecialReading>> | null,
) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  return value
    .map((row) => ({
      word: normalizeRequiredString(row.word),
      reading: normalizeRequiredString(row.reading),
      meaningKo: normalizeNullableString(row.meaningKo),
      meaningJa: normalizeNullableString(row.meaningJa),
      noteKo: normalizeNullableString(row.noteKo),
      noteJa: normalizeNullableString(row.noteJa),
    }))
    .filter((row): row is SpecialReading =>
      Boolean(row.word && row.reading && (row.meaningKo || row.meaningJa)),
    );
}

export function hasSpecialReadings(
  specialReadings?: Array<SpecialReading | undefined> | null,
) {
  return Array.isArray(specialReadings) && specialReadings.some(Boolean);
}

export function getSpecialReadingBody(
  specialReading: SpecialReading | undefined,
  locale: "ko" | "ja",
) {
  if (!specialReading) {
    return null;
  }

  return locale === "ko" ? specialReading.meaningKo : null;
}

export function getSpecialReadingNote(
  specialReading: SpecialReading,
  locale: "ko" | "ja",
) {
  const preferred =
    locale === "ja" ? specialReading.noteJa : specialReading.noteKo;
  const fallback = locale === "ja" ? specialReading.noteKo : specialReading.noteJa;

  return preferred ?? fallback;
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
