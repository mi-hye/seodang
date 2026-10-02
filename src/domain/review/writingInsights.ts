import type { CharacterProgress, DismissedReviewCharacter, WritingActivity } from "../../types/app-state";
import { buildReviewQueue } from "./buildReviewQueue.ts";
import { localDateKey } from "./writingActivity.ts";

export function buildActivityMonth(activity: WritingActivity | undefined, month: Date) {
  const year = month.getFullYear();
  const index = month.getMonth();
  const days = Array.from({ length: new Date(year, index + 1, 0).getDate() }, (_, offset) => {
    const date = new Date(year, index, offset + 1);
    const key = localDateKey(date);
    return { key, date, activity: activity?.days[key] };
  });
  const attempts = days.reduce((sum, day) => sum + (day.activity?.attempts ?? 0), 0);
  return {
    days,
    leadingBlanks: new Date(year, index, 1).getDay(),
    attempts,
    activeDays: days.filter((day) => (day.activity?.attempts ?? 0) > 0).length,
    averageScore: attempts ? Math.round(days.reduce((sum, day) => sum + (day.activity?.totalScore ?? 0), 0) / attempts) : null,
  };
}

export function buildReviewForecast(
  progress: Record<string, CharacterProgress>,
  dismissed: Record<string, DismissedReviewCharacter>,
  now: Date,
) {
  const dueNow = buildReviewQueue(progress, { now, dismissedCharacterIds: dismissed, limit: Infinity });
  const dueIds = new Set(dueNow.map((item) => item.characterId));
  const deferredIds = new Set(buildReviewQueue(progress, { now, limit: Infinity })
    .filter((item) => !dueIds.has(item.characterId)).map((item) => item.characterId));
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return { date, key: localDateKey(date), count: 0 };
  });
  let laterCount = 0;
  for (const item of Object.values(progress)) {
    if (dueIds.has(item.characterId)) continue;
    if (deferredIds.has(item.characterId)) {
      days[1].count += 1;
      continue;
    }
    const scheduled = new Date(item.nextReviewAt ?? "");
    if (!Number.isFinite(scheduled.getTime()) || scheduled <= now) continue;
    const day = days.find((candidate) => candidate.key === localDateKey(scheduled));
    if (day) day.count += 1;
    else laterCount += 1;
  }
  return { dueNow, days, laterCount };
}
