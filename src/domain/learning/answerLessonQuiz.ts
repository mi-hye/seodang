import type { PersistedAppState } from "../../types/app-state";
import { getTodayLesson, completeLessonItem } from "./dailyLessonProgress.ts";
import { migrateLearningPet, rewardLearningPet } from "../pet/learningPet.ts";
import { rememberReviewQuiz } from "./serverLesson.ts";

export function answerLessonQuiz(state: PersistedAppState, input: {
  lessonId: string; questionId: string; answer: string[];
}, now = new Date()): PersistedAppState {
  const lesson = getTodayLesson(state.dailyLesson, now);
  const item = lesson?.items.find((entry) => !entry.completedAt);
  const quiz = item?.quiz;
  if (!lesson || lesson.id !== input.lessonId || !item || !quiz || quiz.id !== input.questionId) return state;
  if (input.answer.length !== quiz.answer.length || input.answer.some((answer, index) => answer !== quiz.answer[index])) return state;
  const practicedAt = now.toISOString();
  const nextLesson = completeLessonItem(lesson, { lessonId: lesson.id, characterId: item.characterId, passed: true, practicedAt }, now);
  if (nextLesson === lesson) return state;
  const previous = state.guidedProgress?.[quiz.id];
  const guidedProgress = { ...state.guidedProgress, [quiz.id]: { completions: (previous?.completions ?? 0) + 1, lastCompletedAt: practicedAt } };
  return {
    ...state,
    dailyLesson: nextLesson,
    guidedProgress,
    guidedReviewQuizzes: rememberReviewQuiz(state.guidedReviewQuizzes ?? {}, quiz, lesson.stage, guidedProgress),
    learningPet: rewardLearningPet(migrateLearningPet(state.learningPet), {
      characterId: item.characterId, attemptId: `${lesson.id}:${quiz.id}`, passed: true, practicedAt,
    }, now),
    // Recognition is not handwriting: do not create writing attempts, scores,
    // review deadlines or graph entries for a multiple-choice answer.
  };
}
