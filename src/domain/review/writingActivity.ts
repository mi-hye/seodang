import type { WritingActivity } from "../../types/app-state";

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function recordWritingActivity(
  activity: WritingActivity | undefined,
  input: { practicedAt: string; score: number; passed: boolean },
): WritingActivity | undefined {
  const date = new Date(input.practicedAt);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(input.score)) return activity;
  const key = localDateKey(date);
  const previous = activity?.days[key];
  return {
    startedAt: activity?.startedAt ?? input.practicedAt,
    days: {
      ...activity?.days,
      [key]: {
        attempts: (previous?.attempts ?? 0) + 1,
        successes: (previous?.successes ?? 0) + Number(input.passed),
        totalScore: (previous?.totalScore ?? 0) + input.score,
        lastPracticedAt: previous && previous.lastPracticedAt > input.practicedAt
          ? previous.lastPracticedAt : input.practicedAt,
      },
    },
  };
}
