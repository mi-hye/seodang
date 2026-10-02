import type { DailyLesson, DailyLessonItem, GuidedProgress, LearningStage } from "../../types/app-state";
import { localDateKey } from "../review/writingActivity.ts";
import { ADVANCED_QUESTIONS, INTERMEDIATE_QUESTIONS, KANA_QUESTIONS, SENTENCE_QUESTIONS, WORD_QUESTIONS } from "./guidedContent.ts";

export function buildGuidedLesson(stage: LearningStage, progress: GuidedProgress, now: Date): DailyLesson {
  const pick = (pool: DailyLessonItem[], count: number) => {
    const due = pool.filter((item) => {
      const saved = progress[item.quiz!.id];
      return saved && now.getTime() - new Date(saved.lastCompletedAt).getTime() >= 3 * 86400000;
    }).sort((a, b) => progress[a.quiz!.id].lastCompletedAt.localeCompare(progress[b.quiz!.id].lastCompletedAt));
    const unseen = pool.filter((item) => !progress[item.quiz!.id]);
    const rest = [...pool].sort((a, b) => (progress[a.quiz!.id]?.lastCompletedAt ?? "").localeCompare(progress[b.quiz!.id]?.lastCompletedAt ?? ""));
    return [...new Map([...due.slice(0, 1), ...unseen, ...due, ...rest].map((item) => [item.quiz!.id, item])).values()]
      .slice(0, count).map((item) => ({ ...item, kind: progress[item.quiz!.id] ? "review" as const : "new" as const }));
  };
  let items: DailyLessonItem[];
  if (stage === "starter") items = pick(KANA_QUESTIONS, 3);
  else if (stage === "kana") items = pick(WORD_QUESTIONS, 3);
  else if (stage === "words") items = pick(SENTENCE_QUESTIONS, 3);
  else if (stage === "sentences") items = pick(INTERMEDIATE_QUESTIONS, 3);
  else items = pick(ADVANCED_QUESTIONS, 3);
  // Predictable shuffling keeps resumes stable without always placing the
  // correct answer first. The stored plan owns the exact option order.
  items = items.map((item, index) => {
    const quiz = item.quiz!;
    const shift = (now.getDate() + index + 1) % quiz.choices.length;
    return { ...item, quiz: { ...quiz, choices: [...quiz.choices.slice(shift), ...quiz.choices.slice(0, shift)] } };
  });
  if (stage === "starter") {
    const target = items[0];
    items.push({ characterId: target.characterId, categoryKey: target.categoryKey, kind: target.kind });
  }
  return { id: "guided-" + now.getTime() + "-" + stage, day: localDateKey(now), startedAt: now.toISOString(), stage, items };
}
