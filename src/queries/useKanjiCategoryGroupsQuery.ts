import { useQuery } from "@tanstack/react-query";

import { fetchKanjiCategoryGroups } from "../data/fetchKanjiCategories";

export function useKanjiCategoryGroupsQuery() {
  return useQuery({
    queryKey: ["kanji-category-groups"],
    queryFn: fetchKanjiCategoryGroups,
  });
}
