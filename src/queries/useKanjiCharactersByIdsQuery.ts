import { useQuery } from "@tanstack/react-query";

import { fetchKanjiCharactersByIds } from "../data/fetchKanjiCharacters";

export function useKanjiCharactersByIdsQuery(characterIds: string[]) {
  return useQuery({
    queryKey: ["kanji-characters", "ids", ...characterIds],
    queryFn: () => fetchKanjiCharactersByIds(characterIds),
    enabled: characterIds.length > 0,
  });
}
