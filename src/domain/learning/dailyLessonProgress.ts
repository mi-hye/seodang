import type { DailyLesson } from "../../types/app-state";
import { localDateKey } from "../review/writingActivity.ts";

export function getTodayLesson(lesson: DailyLesson | undefined, now: Date) {
  return lesson?.day === localDateKey(now) ? lesson : undefined;
}

export function completeLessonItem(lesson: DailyLesson | undefined, input: {
  lessonId?: string; characterId: string; passed: boolean; practicedAt: string;
}, now = new Date()): DailyLesson | undefined {
  if (!lesson || lesson.id !== input.lessonId || !input.passed) return lesson;
  const practiced = new Date(input.practicedAt);
  if (!Number.isFinite(practiced.getTime()) || practiced.getTime() > now.getTime()
    || practiced.getTime() < new Date(lesson.startedAt).getTime()
    || localDateKey(practiced) !== lesson.day || !getTodayLesson(lesson, now)) return lesson;
  const next = lesson.items.findIndex((item) => !item.completedAt);
  if (next < 0 || lesson.items[next].characterId !== input.characterId) return lesson;
  return { ...lesson, items: lesson.items.map((item, index) => index === next ? { ...item, completedAt: input.practicedAt } : item) };
}
