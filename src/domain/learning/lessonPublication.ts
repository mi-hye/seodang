import { parseServerLesson, seoulDateKey, SERVER_LESSON_STAGES, type ServerLesson } from "./serverLesson.ts";

export type ReviewedLesson = ServerLesson & {
  curriculum_note: string;
  generator: string;
  reviewer: string;
  reviewed_at: string;
  review_status: "approved";
  review_notes: string[];
};

export function validateLessonPublication(input: unknown, now = new Date()): ReviewedLesson[] {
  if (!Array.isArray(input) || input.length !== 4) throw new Error("Exactly four reviewed stages for one date are required");
  const rows = input.map((raw) => {
    const lesson = parseServerLesson(raw);
    if (raw.review_status !== "approved" || typeof raw.generator !== "string" || !raw.generator.trim() || raw.generator.length > 200
      || typeof raw.reviewer !== "string" || !raw.reviewer.trim() || raw.reviewer.length > 200 || raw.reviewer === raw.generator
      || typeof raw.curriculum_note !== "string" || !raw.curriculum_note.trim() || raw.curriculum_note.length > 1000
      || typeof raw.reviewed_at !== "string" || !Number.isFinite(Date.parse(raw.reviewed_at)) || Date.parse(raw.reviewed_at) > now.getTime()
      || !Array.isArray(raw.review_notes) || !raw.review_notes.length || !raw.review_notes.every((n: unknown) => typeof n === "string" && n.trim())) {
      throw new Error("Independent review metadata and curriculum note are required");
    }
    return { ...lesson, curriculum_note: raw.curriculum_note, generator: raw.generator,
      reviewer: raw.reviewer, reviewed_at: raw.reviewed_at, review_status: "approved" as const, review_notes: raw.review_notes };
  });
  if (new Set(rows.map((r) => r.lesson_date)).size !== 1 || new Set(rows.map((r) => r.stage)).size !== SERVER_LESSON_STAGES.length) {
    throw new Error("All four distinct stages must share one date");
  }
  const day = rows[0].lesson_date;
  if (day < seoulDateKey(now) || day > seoulDateKey(new Date(now.getTime() + 7 * 86400000))) throw new Error("Publish only today through the next seven days");
  return rows;
}

export const lessonContentEqual = (a: ServerLesson, b: ServerLesson) => JSON.stringify(parseServerLesson(a)) === JSON.stringify(parseServerLesson(b));

export function planLessonPublication(rows: ReviewedLesson[], existing: ReviewedLesson[]) {
  const pending: ReviewedLesson[] = [];
  for (const input of rows) {
    const row = { ...input, ...parseServerLesson(input) };
    const saved = existing.find((r) => r.lesson_date === row.lesson_date && r.stage === row.stage);
    if (saved) {
      if (saved.review_status !== "approved" || !lessonContentEqual(saved, row)) throw new Error(`${row.lesson_date}/${row.stage}: already exists; refusing overwrite`);
      continue;
    }
    for (const oldRow of existing.filter((r) => r.stage === row.stage && r.review_status === "approved")) {
      const old = parseServerLesson(oldRow);
      for (const quiz of row.questions) {
        const reused = old.questions.find((q) => q.id === quiz.id);
        if (reused && JSON.stringify(reused) !== JSON.stringify(quiz)) throw new Error(`Changed question requires a new ID: ${quiz.id}`);
        if ((row.stage === "sentences" || row.stage === "advanced") && old.questions.some((q) => similarity(q.cue, quiz.cue) >= 0.82)) {
          throw new Error(`${row.stage}: passage is too similar to ${old.lesson_date}`);
        }
      }
    }
    pending.push(row);
  }
  return pending;
}

function similarity(left: string, right: string) {
  const grams = (text: string) => {
    const chars = [...text.replace(/[\s、。！？「」『』]/g, "")];
    return new Set(chars.slice(0, -2).map((_, i) => chars.slice(i, i + 3).join("")));
  };
  const a = grams(left), b = grams(right);
  return a.size && b.size ? [...a].filter((g) => b.has(g)).length / Math.min(a.size, b.size) : 0;
}
