import { useQuery } from "@tanstack/react-query";

import { fetchKanjiCharacterById } from "../data/fetchKanjiCharacters";

export function useKanjiCharacterQuery(characterId?: string) {
  return useQuery({
    queryKey: ["kanji-character", characterId],
    queryFn: () => fetchKanjiCharacterById(characterId),
    enabled: Boolean(characterId),
  });
}
