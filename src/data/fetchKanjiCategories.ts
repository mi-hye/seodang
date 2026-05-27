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

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchKanjiCategoryGroups(locale: "ko" | "ja") {
  throwIfForcedFetchFailure("fetchKanjiCategoryGroups");

  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const params = new URLSearchParams({ locale });
  const response = await fetch(
    `${supabaseUrl}/functions/v1/kanji-catalog?${params.toString()}`,
    {
      headers: buildHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji category groups: ${response.status}`);
  }

  return (await response.json()) as KanjiCategoryGroup[];
}

function buildHeaders() {
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
  };
}
