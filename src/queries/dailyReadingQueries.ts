import { useQuery } from "@tanstack/react-query";

import { fetchDailyReadings } from "../data/fetchDailyReadings";

export const dailyReadingQueryKeys = {
  byDate: (readingDate: string) => ["daily-readings", readingDate] as const,
};

export function useDailyReadingsQuery(readingDate: string) {
  return useQuery({
    queryKey: dailyReadingQueryKeys.byDate(readingDate),
    queryFn: () => fetchDailyReadings(readingDate),
    staleTime: 1000 * 60 * 30,
  });
}
