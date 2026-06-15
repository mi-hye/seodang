import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { fetchKanjiCategoryGroups } from "../data/fetchKanjiCategories";
import { fetchCategoryMappingsByCharacterIds } from "../data/fetchKanjiCategoryProgress";
import {
  fetchAllKanjiCharacters,
  fetchKanjiCategoryCharactersByKey,
  fetchKanjiCharacterById,
  fetchKanjiCharactersByIds,
} from "../data/fetchKanjiCharacters";
import { fetchKanjiStrokeDataByLiteral } from "../data/fetchKanjiStrokeData";

const CATALOG_QUERY_VERSION = "2026-06-15-edge-index-v1";

export const kanjiQueryKeys = {
  allCharacters: () => ["kanji-characters", "all"] as const,
  categoryCharacters: (
    categoryKey: string | undefined,
    locale: "ko" | "ja",
  ) =>
    [
      "kanji-category-characters",
      CATALOG_QUERY_VERSION,
      categoryKey,
      locale,
    ] as const,
  categoryGroups: (locale: "ko" | "ja") =>
    ["kanji-category-groups", CATALOG_QUERY_VERSION, locale] as const,
  categoryProgressMappings: (characterIds: string[]) =>
    ["kanji-category-progress-mappings", characterIds.join(",")] as const,
  character: (characterId: string | undefined, debugScope: string) =>
    ["kanji-character", characterId, debugScope] as const,
  charactersByIds: (characterIds: string[]) =>
    ["kanji-characters", "ids", ...characterIds] as const,
  favorites: (characterIds: string[] = []) =>
    ["kanji-characters", "favorites", ...characterIds] as const,
  favoritesRoot: () => ["kanji-characters", "favorites"] as const,
  strokeData: (literal: string | undefined, debugScope: string) =>
    ["kanji-stroke-data", literal, debugScope] as const,
};

export function useKanjiCategoryGroupsQuery(locale: "ko" | "ja") {
  return useQuery({
    queryKey: kanjiQueryKeys.categoryGroups(locale),
    queryFn: () => fetchKanjiCategoryGroups(locale, "categories"),
  });
}

export function useKanjiCharactersByCategoryQuery(
  categoryKey: string | undefined,
  locale: "ko" | "ja",
  debugScope = "list",
) {
  return useInfiniteQuery({
    queryKey: kanjiQueryKeys.categoryCharacters(categoryKey, locale),
    queryFn: ({ pageParam = 0 }) =>
      fetchKanjiCategoryCharactersByKey({
        categoryKey,
        locale,
        limit: 20,
        offset: pageParam,
        debugScope,
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
    queryKey: kanjiQueryKeys.charactersByIds(characterIds),
    queryFn: () => fetchKanjiCharactersByIds(characterIds),
    enabled: characterIds.length > 0,
    placeholderData: (previousData) =>
      previousData?.filter((character) => characterIds.includes(character.id)) ?? [],
  });
}

export function useFavoriteKanjiCharactersQuery(characterIds: string[]) {
  return useQuery({
    queryKey: kanjiQueryKeys.favorites(characterIds),
    queryFn: () => fetchKanjiCharactersByIds(characterIds),
  });
}

export function useKanjiCharacterQuery(
  characterId?: string,
  debugScope = "detail",
) {
  return useQuery({
    queryKey: kanjiQueryKeys.character(characterId, debugScope),
    queryFn: () => fetchKanjiCharacterById(characterId, debugScope),
    enabled: Boolean(characterId),
  });
}

export function useKanjiCategoryProgressMappingsQuery(characterIds: string[]) {
  return useQuery({
    queryKey: kanjiQueryKeys.categoryProgressMappings(characterIds),
    queryFn: () => fetchCategoryMappingsByCharacterIds(characterIds),
    enabled: characterIds.length > 0,
    staleTime: 1000 * 60 * 10,
  });
}

export function useAllKanjiCharactersQuery() {
  return useQuery({
    queryKey: kanjiQueryKeys.allCharacters(),
    queryFn: () => fetchAllKanjiCharacters("search"),
    staleTime: 1000 * 60 * 10,
  });
}

export function useKanjiStrokeDataQuery(
  literal?: string,
  debugScope = "practice",
) {
  return useQuery({
    queryKey: kanjiQueryKeys.strokeData(literal, debugScope),
    queryFn: () => fetchKanjiStrokeDataByLiteral(literal ?? "", debugScope),
    enabled: Boolean(literal),
  });
}
