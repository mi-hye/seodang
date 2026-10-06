import type { CharacterProgress, DailyLesson, DailyLessonItem, DismissedReviewCharacter, GuidedProgress, LearningStage } from "../../types/app-state";
import { BASIC_HIRAGANA, getKanaCharacterId } from "../../data/kanaCatalog.ts";
import { buildDailyLesson } from "./buildDailyLesson.ts";
import { localDateKey } from "../review/writingActivity.ts";
import { ADVANCED_QUESTIONS, INTERMEDIATE_QUESTIONS, SENTENCE_QUESTIONS, WORD_QUESTIONS } from "./guidedContent.ts";

export function buildGuidedLesson(stage: LearningStage, progress: GuidedProgress, now: Date,
  writingProgress: Record<string, CharacterProgress> = {}, dismissed: Record<string, DismissedReviewCharacter> = {}): DailyLesson {
  if (stage === "starter") {
    const candidates = [...BASIC_HIRAGANA].map((literal) => ({ id: getKanaCharacterId(literal) }));
    const ids = new Set(candidates.map((item) => item.id));
    const lesson = buildDailyLesson({ now, candidates, categoryKey: "kana_hiragana", dismissed,
      progress: Object.fromEntries(Object.entries(writingProgress).filter(([id]) => ids.has(id))) });
    return { ...lesson, id: "guided-writing-" + now.getTime() + "-starter", stage };
  }
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
  if (stage === "kana") items = pick(WORD_QUESTIONS, 3);
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
  return { id: "guided-" + now.getTime() + "-" + stage, day: localDateKey(now), startedAt: now.toISOString(), stage, items };
}
