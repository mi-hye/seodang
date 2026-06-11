export type KanjiCategoryGroup = {
  id: string;
  groupKey: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  categories: KanjiCategory[];
};

export type KanjiCategory = {
  id: string;
  groupId: string;
  categoryKey: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  visibleLocales: string[];
  totalCharacters: number;
};

import { throwIfForcedFetchFailure } from "./debugFetchFailure";
import { supabaseFetchJson } from "./supabaseFetch";

export async function fetchKanjiCategoryGroups(
  locale: "ko" | "ja",
  debugScope = "categories",
) {
  throwIfForcedFetchFailure(debugScope);

  const params = new URLSearchParams({ locale });
  return supabaseFetchJson<KanjiCategoryGroup[]>(
    `/functions/v1/kanji-catalog?${params.toString()}`,
    "Failed to fetch kanji category groups",
  );
}
