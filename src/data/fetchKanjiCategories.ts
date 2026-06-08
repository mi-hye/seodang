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
import { requireSupabaseConfig } from "./supabaseEnv";

export async function fetchKanjiCategoryGroups(
  locale: "ko" | "ja",
  debugScope = "categories",
) {
  throwIfForcedFetchFailure(debugScope);
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();

  const params = new URLSearchParams({ locale });
  const response = await fetch(
    `${supabaseUrl}/functions/v1/kanji-catalog?${params.toString()}`,
    {
      headers: buildHeaders(supabaseAnonKey),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji category groups: ${response.status}`);
  }

  return (await response.json()) as KanjiCategoryGroup[];
}

function buildHeaders(supabaseAnonKey: string) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };
}
