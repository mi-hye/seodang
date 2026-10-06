import type { DailyLesson, GuidedProgress, GuidedReviewQuizzes, LearningStage, LessonQuiz } from "../../types/app-state.ts";
import { localDateKey } from "../review/writingActivity.ts";

export const SERVER_LESSON_STAGES = ["kana", "words", "sentences", "advanced"] as const;
export type ServerLessonStage = typeof SERVER_LESSON_STAGES[number];
export type ServerLesson = {
  lesson_date: string;
  stage: ServerLessonStage;
  schema_version: 1;
  questions: LessonQuiz[];
};

export function seoulDateKey(now: Date) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

const text = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const bilingual = (value: unknown) => record(value) && text(value.ko, 1000) && text(value.ja, 1000);

// Shared by the public API reader and the publisher. Never trust a JSON cast.
export function parseServerLesson(value: unknown): ServerLesson {
  if (!record(value) || !isDateKey(value.lesson_date) || value.schema_version !== 1
    || !SERVER_LESSON_STAGES.includes(value.stage as ServerLessonStage)
    || !Array.isArray(value.questions) || value.questions.length !== 3) throw new Error("Invalid daily lesson envelope");
  const stage = value.stage as ServerLessonStage;
  const ids = new Set<string>();
  const questions = value.questions.map((q: unknown): LessonQuiz => {
    if (!record(q) || !text(q.id, 160) || !q.id.startsWith(`server:${stage}:`) || ids.has(q.id)
      || !["choice", "order"].includes(q.mode as string) || !text(q.cue, 6000)
      || !bilingual(q.prompt) || !bilingual(q.hint) || !Array.isArray(q.choices) || !Array.isArray(q.answer)
      || q.choices.length < 2 || q.choices.length > 8 || !q.choices.every((c) => text(c, 500))
      || new Set(q.choices).size !== q.choices.length || !q.answer.every((a) => q.choices instanceof Array && q.choices.includes(a))
      || new Set(q.answer).size !== q.answer.length
      || q.answer.length !== (q.mode === "choice" ? 1 : q.choices.length)
      || (["sentences", "advanced"].includes(stage) && (q.mode !== "choice" || q.choices.length !== 4 || q.cue.length < 60))) {
      throw new Error("Invalid daily lesson question");
    }
    ids.add(q.id);
    // Strip untrusted completion flags, prototype keys and other extra fields.
    return { id: q.id, mode: q.mode as LessonQuiz["mode"], cue: q.cue,
      prompt: { ko: (q.prompt as LessonQuiz["prompt"]).ko, ja: (q.prompt as LessonQuiz["prompt"]).ja },
      hint: { ko: (q.hint as LessonQuiz["hint"]).ko, ja: (q.hint as LessonQuiz["hint"]).ja },
      choices: [...q.choices] as string[], answer: [...q.answer] as string[] };
  });
  return { lesson_date: value.lesson_date, stage, schema_version: 1, questions };
}

export function reviewIntervalDays(completions: number) {
  return [1, 3, 7, 14, 30][Math.min(4, Math.max(0, completions - 1))];
}

export function buildServerLesson(content: ServerLesson, progress: GuidedProgress, reviews: GuidedReviewQuizzes, now: Date): DailyLesson {
  const verified = parseServerLesson(content);
  if (verified.lesson_date !== seoulDateKey(now)) throw new Error("Daily lesson date changed");
  const due = (verified.stage === "kana" || verified.stage === "words")
    ? Object.values(reviews).filter((entry) => {
      const saved = progress[entry.quiz.id];
      return entry.stage === verified.stage && saved
        && now.getTime() - Date.parse(saved.lastCompletedAt) >= reviewIntervalDays(saved.completions) * 86400000;
    }).sort((a, b) => progress[a.quiz.id].lastCompletedAt.localeCompare(progress[b.quiz.id].lastCompletedAt)).slice(0, 1)
    : [];
  // At most one review; new questions follow the curriculum order supplied by
  // the reviewed package. A repeated ID keeps its original content/version.
  const questions = [...new Map([...due.map((e) => e.quiz), ...verified.questions].map((q) => [q.id, q])).values()].slice(0, 3);
  return { id: `server-${verified.lesson_date}-${verified.stage}-${now.getTime()}`, day: localDateKey(now),
    startedAt: now.toISOString(), stage: verified.stage, source: "server", contentDate: verified.lesson_date,
    items: questions.map((q, index) => {
      const shift = (Number(verified.lesson_date.slice(-2)) + index + 1) % q.choices.length;
      return { characterId: q.id, kind: progress[q.id] ? "review" : "new", quiz: {
        ...q, choices: [...q.choices.slice(shift), ...q.choices.slice(0, shift)],
      } };
    }) };
}

export function rememberReviewQuiz(reviews: GuidedReviewQuizzes, quiz: LessonQuiz, stage: LearningStage | undefined, progress: GuidedProgress): GuidedReviewQuizzes {
  if (stage !== "kana" && stage !== "words") return reviews;
  const next = { ...reviews, [quiz.id]: { stage, quiz } };
  // Keep learner-owned snapshots, independent of server content retention.
  return Object.fromEntries(Object.entries(next).sort(([a], [b]) =>
    (progress[b]?.lastCompletedAt ?? "").localeCompare(progress[a]?.lastCompletedAt ?? "")).slice(0, 120));
}
