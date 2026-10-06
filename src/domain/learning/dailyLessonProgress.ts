import type { DailyLesson, LearningStage } from "../../types/app-state";
import { localDateKey } from "../review/writingActivity.ts";

export function getTodayLesson(lesson: DailyLesson | undefined, now: Date) {
  return lesson?.day === localDateKey(now) ? lesson : undefined;
}

// Only unfinished legacy beginner quizzes need replacing. Finished lessons and
// all earned writing/quiz history and pet rewards remain untouched.
export function needsStarterWritingLesson(lesson: DailyLesson | undefined) {
  return lesson?.stage === "starter" && lesson.items.some((item) => item.quiz)
    && lesson.items.some((item) => !item.completedAt);
}

export function canStartDailyLesson(current: DailyLesson | undefined, next: DailyLesson, stage: LearningStage | undefined, now: Date) {
  if (!next.items.length || !getTodayLesson(next, now) || (next.stage && next.stage !== stage)) return false;
  const today = getTodayLesson(current, now);
  return !today || Boolean(needsStarterWritingLesson(today) && next.stage === "starter"
    && next.items.every((item) => !item.quiz && item.categoryKey === "kana_hiragana"));
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
