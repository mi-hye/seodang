import type { KanjiCharacter } from "../../data/characters";

type SearchableKanjiCharacter = Pick<
  KanjiCharacter,
  | "literal"
  | "meaningKo"
  | "meaningJa"
  | "exampleKo"
  | "exampleJa"
  | "onyomi"
  | "kunyomi"
  | "metadata"
>;

type RankedCharacter<T> = {
  character: T;
  index: number;
  rank: number;
};

export function filterAndRankKanjiSearchResults<T extends SearchableKanjiCharacter>(
  characters: T[],
  searchText: string,
) {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return characters;
  }

  return characters
    .map((character, index) => ({
      character,
      index,
      rank: getSearchRank(character, normalizedSearch),
    }))
    .filter((result) => result.rank !== Number.POSITIVE_INFINITY)
    .sort(compareRankedCharacters)
    .map((result) => result.character);
}

function compareRankedCharacters<T>(
  left: RankedCharacter<T>,
  right: RankedCharacter<T>,
) {
  if (left.rank !== right.rank) {
    return left.rank - right.rank;
  }

  return left.index - right.index;
}

function getSearchRank(
  character: SearchableKanjiCharacter,
  normalizedSearch: string,
) {
  const fields = buildSearchFields(character);

  if (fields.some((field) => field === normalizedSearch)) {
    return 0;
  }

  if (fields.some((field) => field.startsWith(normalizedSearch))) {
    return 1;
  }

  if (fields.some((field) => field.includes(normalizedSearch))) {
    return 2;
  }

  return Number.POSITIVE_INFINITY;
}

function buildSearchFields(character: SearchableKanjiCharacter) {
  return [
    character.literal,
    character.meaningKo,
    character.meaningJa,
    character.exampleKo,
    character.exampleJa,
    ...character.onyomi,
    ...character.kunyomi,
    ...(character.metadata?.meaningEn ?? []),
  ]
    .filter(Boolean)
    .map((field) => normalizeSearchText(String(field)))
    .filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}
