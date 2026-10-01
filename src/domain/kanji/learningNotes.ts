export type KanjiOrigin = {
  ja: string;
  ko: string | null;
};

export type OldForm = {
  literal: string;
  noteJa: string | null;
  noteKo: string | null;
};

export type VerbCollocation = {
  word: string;
  reading: string;
  verbs: string[];
  meaningKo: string | null;
};

export function normalizeKanjiOrigin(
  value?: Partial<KanjiOrigin> | null,
): KanjiOrigin | null {
  if (!isPlainObject(value)) return null;

  const ja = normalizeString(value.ja);
  if (!ja) return null;

  return {
    ja,
    ko: normalizeString(value.ko),
  };
}

export function getKanjiOriginBody(
  origin: KanjiOrigin,
  locale: "ko" | "ja",
) {
  return locale === "ko" ? origin.ko ?? origin.ja : origin.ja;
}

export function normalizeOldForms(
  value?: Array<string | Partial<OldForm>> | null,
): OldForm[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          literal: normalizeString(item),
          noteJa: null,
          noteKo: null,
        };
      }

      if (!isPlainObject(item)) return null;

      return {
        literal: normalizeString(item.literal),
        noteJa: normalizeString(item.noteJa),
        noteKo: normalizeString(item.noteKo),
      };
    })
    .filter((item): item is OldForm => Boolean(item?.literal))
    .filter((item) => {
      if (seen.has(item.literal)) return false;
      seen.add(item.literal);
      return true;
    });
}

export function getOldFormNote(oldForm: OldForm, locale: "ko" | "ja") {
  return locale === "ko" ? oldForm.noteKo ?? oldForm.noteJa : oldForm.noteJa;
}

export function normalizeVerbCollocations(
  value?: Array<Partial<VerbCollocation>> | null,
): VerbCollocation[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item) => {
      if (!isPlainObject(item)) return null;

      const word = normalizeString(item.word);
      const reading = normalizeString(item.reading);
      const verbs = Array.isArray(item.verbs)
        ? item.verbs.map(normalizeString).filter((verb): verb is string => Boolean(verb))
        : [];

      if (!word || !reading || verbs.length === 0) return null;

      return {
        word,
        reading: toHiragana(reading),
        verbs: [...new Set(verbs)],
        meaningKo: normalizeString(item.meaningKo),
      };
    })
    .filter((item): item is VerbCollocation => item != null)
    .filter((item) => {
      const key = `${item.word}:${item.reading}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toHiragana(value: string) {
  return Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0);

      if (codePoint != null && codePoint >= 0x30a1 && codePoint <= 0x30f6) {
        return String.fromCodePoint(codePoint - 0x60);
      }

      return character;
    })
    .join("");
}
