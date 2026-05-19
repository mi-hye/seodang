import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { fetchKanjiCategoryGroups } from "../data/fetchKanjiCategories";
import {
  fetchAllCategoryIdsForCounts,
  fetchCategoryMappingsByCharacterIds,
} from "../data/fetchKanjiCategoryProgress";
import {
  fetchAllKanjiCharacters,
  fetchKanjiCategoryCharactersByKey,
  fetchKanjiCharacterById,
  fetchKanjiCharactersByIds,
} from "../data/fetchKanjiCharacters";
import { fetchKanjiStrokeDataByLiteral } from "../data/fetchKanjiStrokeData";

const CATALOG_QUERY_VERSION = "2026-05-18-progress-v2";

export function useKanjiCategoryGroupsQuery(locale: "ko" | "ja") {
  return useQuery({
    queryKey: ["kanji-category-groups", CATALOG_QUERY_VERSION, locale],
    queryFn: () => fetchKanjiCategoryGroups(locale),
  });
}

export function useKanjiCharactersByCategoryQuery(
  categoryKey: string | undefined,
  locale: "ko" | "ja"
) {
  return useInfiniteQuery({
    queryKey: [
      "kanji-category-characters",
      CATALOG_QUERY_VERSION,
      categoryKey,
      locale,
    ],
    queryFn: ({ pageParam = 0 }) =>
      fetchKanjiCategoryCharactersByKey({
        categoryKey,
        locale,
        limit: 20,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasMore) {
        return undefined;
      }

      return lastPage.offset + lastPage.characters.length;
    },
    initialPageParam: 0,
    enabled: Boolean(categoryKey),
  });
}

export function useKanjiCharactersByIdsQuery(characterIds: string[]) {
  return useQuery({
    queryKey: ["kanji-characters", "ids", ...characterIds],
    queryFn: () => fetchKanjiCharactersByIds(characterIds),
    enabled: characterIds.length > 0,
    placeholderData: (previousData) =>
      previousData?.filter((character) => characterIds.includes(character.id)) ?? [],
  });
}

export function useFavoriteKanjiCharactersQuery(characterIds: string[]) {
  return useQuery({
    queryKey: ["kanji-characters", "favorites", ...characterIds],
    queryFn: () => fetchKanjiCharactersByIds(characterIds),
  });
}

export function useKanjiCharacterQuery(characterId?: string) {
  return useQuery({
    queryKey: ["kanji-character", characterId],
    queryFn: () => fetchKanjiCharacterById(characterId),
    enabled: Boolean(characterId),
  });
}

export function useKanjiCategoryProgressMappingsQuery(characterIds: string[]) {
  return useQuery({
    queryKey: ["kanji-category-progress-mappings", ...characterIds],
    queryFn: () => fetchCategoryMappingsByCharacterIds(characterIds),
    enabled: characterIds.length > 0,
    staleTime: 1000 * 60 * 10,
  });
}

export function useKanjiCategoryTotalsQuery() {
  return useQuery({
    queryKey: ["kanji-category-total-mappings", CATALOG_QUERY_VERSION],
    queryFn: fetchAllCategoryIdsForCounts,
    staleTime: 1000 * 60 * 10,
  });
}

export function useAllKanjiCharactersQuery() {
  return useQuery({
    queryKey: ["kanji-characters", "all"],
    queryFn: fetchAllKanjiCharacters,
    staleTime: 1000 * 60 * 10,
  });
}

export function useKanjiStrokeDataQuery(literal?: string) {
  return useQuery({
    queryKey: ["kanji-stroke-data", literal],
    queryFn: () => fetchKanjiStrokeDataByLiteral(literal ?? ""),
    enabled: Boolean(literal),
  });
}
