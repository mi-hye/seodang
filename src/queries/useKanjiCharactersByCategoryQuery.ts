import { useQuery } from "@tanstack/react-query";

import { fetchKanjiCharactersByCategoryKey } from "../data/fetchKanjiCharacters";

export function useKanjiCharactersByCategoryQuery(categoryKey?: string) {
  return useQuery({
    queryKey: ["kanji-characters", "category", categoryKey],
    queryFn: () => fetchKanjiCharactersByCategoryKey(categoryKey),
    enabled: Boolean(categoryKey),
  });
}
