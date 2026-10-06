import { useQuery } from "@tanstack/react-query";
import { fetchDailyLesson } from "../data/fetchDailyLesson";
import type { LearningStage } from "../types/app-state";

export function useDailyLessonQuery(date: string, stage: LearningStage | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["daily-lesson", date, stage],
    queryFn: ({ signal }) => {
      if (!stage || stage === "starter") throw new Error("Writing lessons use personal review history");
      return fetchDailyLesson(date, stage, signal);
    },
    enabled: enabled && Boolean(stage && stage !== "starter"),
    staleTime: 60_000,
    retry: 1,
    networkMode: "always",
  });
}
