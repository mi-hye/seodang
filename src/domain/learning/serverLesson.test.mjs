import test from "node:test";
import assert from "node:assert/strict";
import { buildServerLesson, parseServerLesson, seoulDateKey, reviewIntervalDays, rememberReviewQuiz } from "./serverLesson.ts";
import { validateLessonPublication, planLessonPublication } from "./lessonPublication.ts";
import { WORD_QUESTIONS, SENTENCE_QUESTIONS, INTERMEDIATE_QUESTIONS, ADVANCED_QUESTIONS } from "./guidedContent.ts";
import { canStartDailyLesson } from "./dailyLessonProgress.ts";
import { answerLessonQuiz } from "./answerLessonQuiz.ts";
import { createLearningPet } from "../pet/learningPet.ts";

const now = new Date("2026-10-06T06:00:00Z");
const pools = { kana: WORD_QUESTIONS, words: SENTENCE_QUESTIONS, sentences: INTERMEDIATE_QUESTIONS, advanced: ADVANCED_QUESTIONS };
function bundle(stage = "kana") {
  return { lesson_date: "2026-10-06", stage, schema_version: 1,
    questions: pools[stage].slice(0, 3).map(({ quiz }) => ({ ...structuredClone(quiz), id: `server:${stage}:${quiz.id}:v1` })),
    curriculum_note: "기초부터 순서대로", review_status: "approved", generator: "author", reviewer: "reviewer",
    reviewed_at: now.toISOString(), review_notes: ["정답·오답·힌트·난이도 검수"] };
}
const reviewedDay = () => Object.keys(pools).map(bundle);

test("KST content date changes at 15:00 UTC, not host midnight", () => {
  assert.equal(seoulDateKey(new Date("2026-10-06T14:59:59Z")), "2026-10-06");
  assert.equal(seoulDateKey(new Date("2026-10-06T15:00:00Z")), "2026-10-07");
});
test("accepts all four server stages and strips untrusted completion flags", () => {
  for (const stage of Object.keys(pools)) {
    const input = bundle(stage);
    input.questions[0].completedAt = now.toISOString();
    const parsed = parseServerLesson(input);
    assert.equal(parsed.questions[0].completedAt, undefined);
    const lesson = buildServerLesson(parsed, {}, {}, now);
    assert.equal(lesson.items.length, 3);
    assert.equal(lesson.source, "server");
    assert.ok(lesson.items.every((i) => !i.completedAt));
  }
});
test("rejects malformed dates, schema, stages, bilingual text and impossible answers", () => {
  for (const mutate of [
    (b) => b.lesson_date = "2026-02-30", (b) => b.stage = "starter", (b) => b.schema_version = 2,
    (b) => b.questions = [], (b) => b.questions[0].hint.ko = "", (b) => b.questions[0].choices = ["いぬ", "いぬ"],
    (b) => b.questions[0].answer = ["not a choice"], (b) => b.questions[0].id = "server:words:wrong-stage",
    (b) => b.questions[1].id = b.questions[0].id, (b) => b.questions[0] = null,
    (b) => b.questions[0].choices = "string", (b) => b.questions[0].answer = [],
  ]) { const b = bundle(); mutate(b); assert.throws(() => parseServerLesson(b)); }
  assert.throws(() => parseServerLesson(null));
  const reading = bundle("advanced"); reading.questions[0].cue = "短い";
  assert.throws(() => parseServerLesson(reading));
  const order = bundle("words"); order.questions[1].answer.pop();
  assert.throws(() => parseServerLesson(order));
});
test("rejects stale/future packages and preserves started lessons", () => {
  const b = bundle(); b.lesson_date = "2026-10-07";
  assert.throws(() => buildServerLesson(b, {}, {}, now));
  const original = buildServerLesson(bundle(), {}, {}, now);
  const replacement = buildServerLesson(bundle(), {}, {}, new Date(now.getTime() + 1000));
  assert.equal(canStartDailyLesson(original, replacement, "kana", now), false);
  assert.equal(canStartDailyLesson(undefined, replacement, "words", now), false);
  assert.deepEqual(JSON.parse(JSON.stringify(original)), original);
});
test("mixes at most one due review into two new curriculum-ordered questions", () => {
  const q = { ...bundle().questions[0], id: "server:kana:old-v1" };
  const history = { [q.id]: { completions: 2, lastCompletedAt: "2026-10-03T06:00:00Z" } };
  const reviews = { [q.id]: { stage: "kana", quiz: q } };
  const lesson = buildServerLesson(bundle(), history, reviews, now);
  assert.deepEqual(lesson.items.map((i) => i.quiz.id), [q.id, ...bundle().questions.slice(0,2).map((q) => q.id)]);
  assert.deepEqual(lesson.items.map((i) => i.kind), ["review", "new", "new"]);
  assert.equal(buildServerLesson(bundle("advanced"), history, reviews, now).items[0].kind, "new");
  assert.deepEqual([1,2,3,4,5,100].map(reviewIntervalDays), [1,3,7,14,30,30]);
});
test("completed server quizzes keep review snapshots without writing or reward duplication", () => {
  const original = { dailyLesson: buildServerLesson(bundle(), {}, {}, now), learningStage: "kana",
    guidedProgress: {}, learningPet: createLearningPet(), progressByCharacter: {} };
  const q = original.dailyLesson.items[0].quiz;
  const input = { lessonId: original.dailyLesson.id, questionId: q.id, answer: q.answer };
  const next = answerLessonQuiz(original, input, now);
  assert.equal(next.guidedReviewQuizzes[q.id].quiz.cue, q.cue);
  assert.equal(next.guidedProgress[q.id].completions, 1);
  assert.equal(next.progressByCharacter, original.progressByCharacter);
  assert.equal(answerLessonQuiz(next, input, now), next);
  assert.deepEqual(rememberReviewQuiz({}, q, "advanced", {}), {});
});
test("publication requires four reviewed stages, rejects self-review, supports idempotent retry", () => {
  const rows = validateLessonPublication(reviewedDay(), now);
  assert.equal(planLessonPublication(rows, []).length, 4);
  assert.equal(planLessonPublication(rows, rows).length, 0);
  assert.throws(() => validateLessonPublication(rows.slice(1), now));
  const own = reviewedDay(); own[0].reviewer = own[0].generator;
  assert.throws(() => validateLessonPublication(own, now));
  const changed = structuredClone(rows); changed[0].questions[0].cue = "変更";
  assert.throws(() => planLessonPublication(changed, rows));
  const pending = structuredClone(rows); pending[0].review_status = "pending";
  assert.throws(() => validateLessonPublication(pending, now));
});
test("publisher rejects passage recycling on another date", () => {
  const old = reviewedDay().map((r) => ({ ...r, lesson_date: "2026-10-05" }));
  assert.throws(() => planLessonPublication(reviewedDay(), old), /similar/);
});

test("JSONB key ordering does not turn identical content into a conflict", () => {
  const rows = validateLessonPublication(reviewedDay(), now);
  const reorder = (v) => Array.isArray(v) ? v.map(reorder) : v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).reverse().map(([k,value])=>[k,reorder(value)])) : v;
  assert.equal(planLessonPublication(rows, reorder(rows)).length, 0);
  const historical = reorder(rows.filter((r)=>r.stage==="kana").map((r)=>({...r,lesson_date:"2026-10-05"})));
  assert.equal(planLessonPublication(rows.filter((r)=>r.stage==="kana"), historical).length, 1);
});
