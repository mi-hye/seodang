import { useQuery } from "@tanstack/react-query";

import { fetchFeaturedKanjiCharacters } from "../data/fetchKanjiCharacters";

export function useFeaturedKanjiCharactersQuery(limit = 3) {
  return useQuery({
    queryKey: ["kanji-characters", "featured", limit],
    queryFn: () => fetchFeaturedKanjiCharacters(limit),
  });
}
