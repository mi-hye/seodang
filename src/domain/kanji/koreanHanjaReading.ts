import type { KanjiCharacter } from "../../data/characters";

type KoreanReadingMetadata = {
  koreanHanjaMeaning?: unknown;
  koreanHanjaMeanings?: unknown;
  koreanReadingHangul?: unknown;
  koreanReadingHanguls?: unknown;
};

export function getKoreanHanjaReadingLabel(character: KanjiCharacter) {
  const metadata = character.metadata as KoreanReadingMetadata | null;
  const readings = normalizeStringList(
    metadata?.koreanReadingHangul ?? metadata?.koreanReadingHanguls,
  );
  const meanings = normalizeStringList(
    metadata?.koreanHanjaMeaning ?? metadata?.koreanHanjaMeanings,
  );

  if (readings.length === 0) {
    return null;
  }

  if (meanings.length === 0) {
    return readings.join(", ");
  }

  return `${meanings.join(", ")} ${readings.join(", ")}`;
}

function normalizeStringList(value: unknown) {
  const values = Array.isArray(value) ? value : [value];

  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
