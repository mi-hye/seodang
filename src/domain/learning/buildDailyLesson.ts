import type { CharacterProgress, DailyLesson, DailyLessonItem, DismissedReviewCharacter } from "../../types/app-state";
import { buildReviewQueue } from "../review/buildReviewQueue.ts";
import { localDateKey } from "../review/writingActivity.ts";

export const DAILY_LESSON_SIZE = 3;

// Content is selected once at the start, not reshuffled after each attempt.
export function buildDailyLesson(input: {
  now: Date;
  candidates: { id: string }[];
  categoryKey: string;
  progress: Record<string, CharacterProgress>;
  dismissed: Record<string, DismissedReviewCharacter>;
}): DailyLesson {
  const { now, candidates, categoryKey, progress, dismissed } = input;
  const items: DailyLessonItem[] = [];
  const add = (characterId: string, kind: DailyLessonItem["kind"], category?: string) => {
    if (items.length < DAILY_LESSON_SIZE && !items.some((item) => item.characterId === characterId)) {
      items.push({ characterId, kind, categoryKey: category });
    }
  };
  const due = buildReviewQueue(progress, { now, limit: DAILY_LESSON_SIZE, dismissedCharacterIds: dismissed });
  const candidateIds = new Set(candidates.map((item) => item.id));
  for (const item of due.slice(0, 2)) add(item.characterId, "review", candidateIds.has(item.characterId) ? categoryKey : undefined);
  for (const item of candidates) {
    if (!progress[item.id]?.successes) add(item.id, "new", categoryKey);
  }
  for (const item of due) add(item.characterId, "review", candidateIds.has(item.characterId) ? categoryKey : undefined);
  // A completed course still offers a short maintenance lesson, oldest first.
  const practiced = [...candidates].sort((a, b) => (progress[a.id]?.lastPracticedAt ?? "").localeCompare(progress[b.id]?.lastPracticedAt ?? ""));
  for (const item of practiced) add(item.id, "review", categoryKey);
  return { id: `lesson-${now.getTime()}`, day: localDateKey(now), startedAt: now.toISOString(), items };
}
