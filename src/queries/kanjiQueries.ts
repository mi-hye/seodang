import { useQuery } from "@tanstack/react-query";

import { fetchKanjiCategoryGroups } from "../data/fetchKanjiCategories";
import {
  fetchFeaturedKanjiCharacters,
  fetchKanjiCategoryCharactersByKey,
  fetchKanjiCharacterById,
  fetchKanjiCharactersByIds,
} from "../data/fetchKanjiCharacters";
import { fetchKanjiStrokeDataByLiteral } from "../data/fetchKanjiStrokeData";

export function useKanjiCategoryGroupsQuery(locale: "ko" | "ja") {
  return useQuery({
    queryKey: ["kanji-category-groups", locale],
    queryFn: () => fetchKanjiCategoryGroups(locale),
  });
}

export function useKanjiCharactersByCategoryQuery(
  categoryKey: string | undefined,
  locale: "ko" | "ja"
) {
  return useQuery({
    queryKey: ["kanji-category-characters", categoryKey, locale],
    queryFn: () => fetchKanjiCategoryCharactersByKey(categoryKey, locale),
    enabled: Boolean(categoryKey),
  });
}

export function useKanjiCharactersByIdsQuery(characterIds: string[]) {
  return useQuery({
    queryKey: ["kanji-characters", "ids", ...characterIds],
    queryFn: () => fetchKanjiCharactersByIds(characterIds),
    enabled: characterIds.length > 0,
  });
}

export function useKanjiCharacterQuery(characterId?: string) {
  return useQuery({
    queryKey: ["kanji-character", characterId],
    queryFn: () => fetchKanjiCharacterById(characterId),
    enabled: Boolean(characterId),
  });
}

export function useFeaturedKanjiCharactersQuery(limit = 3) {
  return useQuery({
    queryKey: ["kanji-characters", "featured", limit],
    queryFn: () => fetchFeaturedKanjiCharacters(limit),
  });
}

export function useKanjiStrokeDataQuery(literal?: string) {
  return useQuery({
    queryKey: ["kanji-stroke-data", literal],
    queryFn: () => fetchKanjiStrokeDataByLiteral(literal ?? ""),
    enabled: Boolean(literal),
  });
}
