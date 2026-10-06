import { parseServerLesson, type ServerLessonStage } from "../domain/learning/serverLesson";
import { supabaseFetchJson } from "./supabaseFetch";

export async function fetchDailyLesson(date: string, stage: ServerLessonStage, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    const query = new URLSearchParams({ select: "lesson_date,stage,schema_version,questions",
      lesson_date: `eq.${date}`, stage: `eq.${stage}`, review_status: "eq.approved", limit: "1" });
    const rows = await supabaseFetchJson<unknown[]>(`/rest/v1/daily_lessons?${query}`, "Failed to fetch daily lesson", { signal: controller.signal });
    if (!Array.isArray(rows)) throw new Error("Invalid daily lesson response");
    if (!rows.length) return null;
    const lesson = parseServerLesson(rows[0]);
    if (lesson.lesson_date !== date || lesson.stage !== stage) throw new Error("Daily lesson request mismatch");
    return lesson;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
