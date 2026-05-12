import { useQuery } from "@tanstack/react-query";

import { fetchKanjiStrokeDataByLiteral } from "../data/fetchKanjiStrokeData";

export function useKanjiStrokeDataQuery(literal?: string) {
  return useQuery({
    queryKey: ["kanji-stroke-data", literal],
    queryFn: () => fetchKanjiStrokeDataByLiteral(literal ?? ""),
    enabled: Boolean(literal),
  });
}
