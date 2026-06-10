export const DEFAULT_CHARACTER_LIST_LIMIT = 20;

export function getDefaultCharacterListWindow(characterIds: string[]) {
  return characterIds.slice(0, DEFAULT_CHARACTER_LIST_LIMIT);
}
