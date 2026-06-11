export const DEFAULT_CHARACTER_LIST_LIMIT = 20;

export function getDefaultCharacterListWindow(
  characterIds: string[],
  limit = DEFAULT_CHARACTER_LIST_LIMIT,
) {
  return characterIds.slice(0, limit);
}

export function getNextCharacterListLimit(
  currentLimit: number,
  totalCharacters: number,
) {
  return Math.min(currentLimit + DEFAULT_CHARACTER_LIST_LIMIT, totalCharacters);
}
