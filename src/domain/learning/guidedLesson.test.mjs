import test from "node:test";
import assert from "node:assert/strict";
import { buildGuidedLesson } from "./buildGuidedLesson.ts";
import { answerLessonQuiz } from "./answerLessonQuiz.ts";
import { LEARNING_STAGES, isLearningStage, selectLearningStage } from "./learningStage.ts";
import { getTodayLesson, completeLessonItem, needsStarterWritingLesson, canStartDailyLesson } from "./dailyLessonProgress.ts";
import { getKanaCharacterId } from "../../data/kanaCatalog.ts";
import { KANA_QUESTIONS, WORD_QUESTIONS, SENTENCE_QUESTIONS, INTERMEDIATE_QUESTIONS, ADVANCED_QUESTIONS } from "./guidedContent.ts";
import { createLearningPet, rewardLearningPet, getTodayPetRewards } from "../pet/learningPet.ts";

const now = new Date(2026, 9, 2, 12);
const stateFor = (stage = "starter") => ({
  learningStage: stage, dailyLesson: buildGuidedLesson(stage, {}, now),
  learningPet: createLearningPet(), progressByCharacter: {}, recordedAttemptIds: [],
  writingActivity: { startedAt: now.toISOString(), days: {} }, guidedProgress: {},
});
const answer = (state, patch = {}) => {
  const quiz = state.dailyLesson.items.find((item) => !item.completedAt)?.quiz;
  return { lessonId: state.dailyLesson.id, questionId: quiz?.id, answer: quiz?.answer, ...patch };
};

test("every offered stage has a distinct real first lesson", () => {
  assert.equal(LEARNING_STAGES.length, 5);
  const lessons = LEARNING_STAGES.map((stage) => buildGuidedLesson(stage, {}, now));
  assert.equal(lessons[0].items.filter((item) => item.quiz).length, 0);
  assert.deepEqual(lessons[0].items.map((item) => item.characterId), [..."あいう"].map(getKanaCharacterId));
  assert.ok(lessons[0].items.every((item) => item.categoryKey === "kana_hiragana"));
  assert.equal(lessons[0].items.at(-1).quiz, undefined);
  assert.ok(lessons[1].items.every((item) => item.quiz?.id.startsWith("word:")));
  assert.ok(lessons[2].items.some((item) => item.quiz?.mode === "order"));
  assert.ok(lessons[3].items.every((item) => item.quiz?.id.startsWith("intermediate:")));
  assert.ok(lessons[4].items.every((item) => item.quiz?.id.startsWith("advanced:")));
  assert.equal(new Set(lessons.map((lesson) => lesson.items.map((item) => item.quiz?.id).join(","))).size, 5);
  assert.deepEqual(lessons.map((lesson) => lesson.items.length), [3, 3, 3, 3, 3]);
});

test("question content has valid answers, unique tokens and both locale hints", () => {
  const all = [...KANA_QUESTIONS, ...WORD_QUESTIONS, ...SENTENCE_QUESTIONS, ...INTERMEDIATE_QUESTIONS, ...ADVANCED_QUESTIONS];
  assert.equal(KANA_QUESTIONS.length, 92);
  assert.equal(new Set(all.map((item) => item.quiz.id)).size, all.length);
  for (const { quiz } of all) {
    assert.equal(new Set(quiz.choices).size, quiz.choices.length);
    assert.ok(quiz.answer.every((token) => quiz.choices.includes(token)));
    assert.ok(quiz.prompt.ko && quiz.prompt.ja && quiz.hint.ko && quiz.hint.ja);
    assert.equal(quiz.answer.length, quiz.mode === "choice" ? 1 : quiz.choices.length);
  }
});

test("higher stages use separate multi-sentence reading and nuanced four-choice pools", () => {
  for (const pool of [INTERMEDIATE_QUESTIONS, ADVANCED_QUESTIONS]) {
    assert.ok(pool.length >= 6);
    for (const { quiz } of pool) {
      assert.equal(quiz.mode, "choice");
      assert.equal(quiz.choices.length, 4);
      assert.ok(quiz.cue.length > 55);
    }
  }
  assert.ok(ADVANCED_QUESTIONS.every(({ quiz }) => quiz.cue.length >= 80));
  const ids = LEARNING_STAGES.map((stage) => new Set(buildGuidedLesson(stage, {}, now).items.map((item) => item.quiz?.id).filter(Boolean)));
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    assert.equal([...ids[i]].filter((id) => ids[j].has(id)).length, 0);
  }
});

test("advanced selection, persistence, completion and shared rewards work without losing history", () => {
  const original = stateFor("words");
  const selected = selectLearningStage(original, "advanced");
  assert.equal(isLearningStage(selected.learningStage), true);
  assert.equal(selected.progressByCharacter, original.progressByCharacter);
  let state = JSON.parse(JSON.stringify({ ...selected, dailyLesson: buildGuidedLesson("advanced", selected.guidedProgress, now) }));
  for (let i = 0; i < 3; i++) state = answerLessonQuiz(state, answer(state), now);
  assert.ok(state.dailyLesson.items.every((item) => item.completedAt));
  assert.equal(getTodayPetRewards(state.learningPet, now), 3);
  assert.equal(Object.keys(state.guidedProgress).length, 3);
  assert.deepEqual(state.writingActivity, original.writingActivity);
  const tomorrow = buildGuidedLesson("advanced", state.guidedProgress, new Date(2026, 9, 3, 12));
  assert.ok(tomorrow.items.every((item) => !state.guidedProgress[item.quiz.id]));
});

test("existing saved four-stage plans retain their original questions until completed", () => {
  const legacy = stateFor("sentences");
  legacy.dailyLesson.items = [{ characterId: "dialogue:morning", kind: "new", quiz: {
    id: "dialogue:morning", mode: "choice", cue: "おはようございます", choices: ["おはようございます", "さようなら"],
    answer: ["おはようございます"], prompt: { ko: "인사", ja: "あいさつ" }, hint: { ko: "아침", ja: "朝" },
  } }];
  const selected = selectLearningStage(legacy, "sentences");
  assert.equal(selected.dailyLesson, legacy.dailyLesson);
  const next = answerLessonQuiz(selected, answer(selected), now);
  assert.ok(next.dailyLesson.items[0].completedAt);
});

test("correct quizzes progress and earn food without fabricating writing history", () => {
  const original = stateFor("kana");
  const input = answer(original);
  const next = answerLessonQuiz(original, input, now);
  assert.equal(next.dailyLesson.items[0].completedAt, now.toISOString());
  assert.equal(next.learningPet.food, 2);
  assert.equal(next.progressByCharacter, original.progressByCharacter);
  assert.equal(next.writingActivity, original.writingActivity);
  assert.equal(next.recordedAttemptIds, original.recordedAttemptIds);
  assert.equal(next.guidedProgress[input.questionId].completions, 1);
  assert.equal(answerLessonQuiz(next, input, now), next);
});

test("wrong, stale, out-of-order and forged answers never award or advance", () => {
  const state = stateFor("kana");
  for (const patch of [{ answer: [] }, { answer: ["wrong"] }, { lessonId: "old" }, { questionId: "wrong" },
    { questionId: state.dailyLesson.items[1].quiz.id, answer: state.dailyLesson.items[1].quiz.answer }]) {
    assert.equal(answerLessonQuiz(state, answer(state, patch), now), state);
  }
  assert.equal(answerLessonQuiz(state, answer(state), new Date(2026, 9, 3)), state);
});

test("sentence ordering checks the complete ordered sequence", () => {
  let state = stateFor("words");
  state = answerLessonQuiz(state, answer(state), now);
  const input = answer(state);
  assert.equal(state.dailyLesson.items[1].quiz.mode, "order");
  assert.equal(answerLessonQuiz(state, { ...input, answer: [...input.answer].reverse() }, now), state);
  const next = answerLessonQuiz(state, input, now);
  assert.equal(next.dailyLesson.items.filter((item) => item.completedAt).length, 2);
});

test("shared daily cap survives stage changes and free writing", () => {
  let state = stateFor("words");
  state.learningPet = rewardLearningPet(state.learningPet, { characterId: "free", attemptId: "free", passed: true, practicedAt: now.toISOString() }, now);
  for (let i = 0; i < 3; i++) state = answerLessonQuiz(state, answer(state), now);
  assert.equal(getTodayPetRewards(state.learningPet, now), 3);
  const switched = selectLearningStage(state, "sentences");
  assert.equal(switched.learningPet, state.learningPet);
  assert.equal(switched.guidedProgress, state.guidedProgress);
  assert.equal(switched.dailyLesson, undefined);
  const changed = { ...switched, dailyLesson: buildGuidedLesson("sentences", switched.guidedProgress, now) };
  const next = answerLessonQuiz(changed, answer(changed), now);
  assert.equal(next.learningPet.food, 4);
  assert.equal(next.dailyLesson.items[0].completedAt, now.toISOString());
});

test("initial selection preserves legacy records and selecting the same stage preserves the plan", () => {
  const legacy = { ...stateFor(), learningStage: undefined, favoriteCharacterIds: { x: true }, isPro: true, learningPet: { ...createLearningPet(), totalFed: 8, food: 5 } };
  const selected = selectLearningStage(legacy, "words");
  assert.equal(selected.learningWelcomeSeen, true);
  assert.equal(selected.onboardingStep, "done");
  assert.equal(selected.favoriteCharacterIds, legacy.favoriteCharacterIds);
  assert.equal(selected.progressByCharacter, legacy.progressByCharacter);
  assert.equal(selected.learningPet, legacy.learningPet);
  assert.equal(selected.isPro, true);
  const state = stateFor("words");
  assert.equal(selectLearningStage(state, "words").dailyLesson, state.dailyLesson);
  assert.equal(isLearningStage("unknown"), false);
  assert.equal(selectLearningStage(state, "unknown"), state);
});

test("saved quizzes resume; future lessons prioritize unseen content and one due review", () => {
  let state = stateFor("words");
  state = answerLessonQuiz(state, answer(state), now);
  const saved = JSON.parse(JSON.stringify(state));
  assert.deepEqual(getTodayLesson(saved.dailyLesson, now), state.dailyLesson);
  assert.deepEqual(answer(saved), answer(state));
  const tomorrow = new Date(2026, 9, 3, 12);
  assert.equal(getTodayLesson(saved.dailyLesson, tomorrow), undefined);
  const next = buildGuidedLesson("words", saved.guidedProgress, tomorrow);
  assert.notEqual(next.items[0].quiz.id, state.dailyLesson.items[0].quiz.id);
  const due = buildGuidedLesson("words", saved.guidedProgress, new Date(2026, 9, 6, 12));
  assert.equal(due.items[0].kind, "review");
  assert.equal(due.items[0].quiz.id, state.dailyLesson.items[0].quiz.id);
});

test("writing finishes the beginner lesson but repeating the same unit earns no extra food", () => {
  const state = stateFor();
  let lesson = state.dailyLesson;
  let pet = state.learningPet;
  for (const item of lesson.items) {
    const input = { lessonId: lesson.id, characterId: item.characterId, passed: true, practicedAt: now.toISOString(), attemptId: item.characterId };
    assert.equal(completeLessonItem(lesson, { ...input, passed: false }, now), lesson);
    lesson = completeLessonItem(lesson, input, now);
    pet = rewardLearningPet(pet, input, now);
    assert.equal(rewardLearningPet(pet, { ...input, attemptId: "repeat-" + item.characterId }, now), pet);
  }
  assert.ok(lesson.items.every((item) => item.completedAt));
  assert.equal(getTodayPetRewards(pet, now), 3);
});

const writingRecord = (literal, patch = {}) => ({
  characterId: getKanaCharacterId(literal), attempts: 1, successes: 1, failures: 0,
  averageScore: 90, lastScore: 90, lastPracticedAt: new Date(2026, 9, 1).toISOString(),
  nextReviewAt: new Date(2026, 9, 4).toISOString(), ...patch,
});

test("beginner writing advances by actual writing history, not recognition quiz history", () => {
  const records = Object.fromEntries([..."あいう"].map((literal) => [getKanaCharacterId(literal), writingRecord(literal)]));
  const next = buildGuidedLesson("starter", {}, now, records);
  assert.deepEqual(next.items.map((item) => item.characterId), [..."えおか"].map(getKanaCharacterId));
  const quizOnly = { [getKanaCharacterId("あ")]: { completions: 4, lastCompletedAt: now.toISOString() } };
  assert.equal(buildGuidedLesson("starter", quizOnly, now).items[0].characterId, getKanaCharacterId("あ"));
});

test("beginner review uses only hiragana and respects due dates and dismissals", () => {
  const records = Object.fromEntries([..."あいうア日"].map((literal) => [getKanaCharacterId(literal), writingRecord(literal, {
    nextReviewAt: literal === "い" ? new Date(2026, 9, 4).toISOString() : now.toISOString(),
  })]));
  const next = buildGuidedLesson("starter", {}, now, records, { [getKanaCharacterId("う")]: { dismissedAt: now.toISOString() } });
  assert.deepEqual(next.items.map((item) => [item.characterId, item.kind]), [
    [getKanaCharacterId("あ"), "review"], [getKanaCharacterId("え"), "new"], [getKanaCharacterId("お"), "new"],
  ]);
});

test("unfinished legacy beginner quizzes are replaced once; completed and other stage lessons stay intact", () => {
  const replacement = buildGuidedLesson("starter", {}, now);
  const legacy = { ...replacement, id: "old-starter", items: [...KANA_QUESTIONS.slice(0, 3), { characterId: getKanaCharacterId("あ"), categoryKey: "kana_hiragana", kind: "new" }] };
  for (const completedCount of [0, 1, 3]) {
    const saved = { ...legacy, items: legacy.items.map((item, index) => index < completedCount ? { ...item, completedAt: now.toISOString() } : item) };
    assert.equal(needsStarterWritingLesson(saved), true);
    assert.equal(canStartDailyLesson(saved, replacement, "starter", now), true);
    assert.equal(canStartDailyLesson(saved, buildGuidedLesson("kana", {}, now), "starter", now), false);
    assert.equal(canStartDailyLesson(saved, legacy, "starter", now), false);
    assert.equal(saved.items.filter((item) => item.completedAt).length, completedCount);
  }
  const finished = { ...legacy, items: legacy.items.map((item) => ({ ...item, completedAt: now.toISOString() })) };
  assert.equal(needsStarterWritingLesson(finished), false);
  assert.equal(canStartDailyLesson(finished, replacement, "starter", now), false);
  assert.equal(canStartDailyLesson(replacement, replacement, "starter", now), false);
  const words = buildGuidedLesson("words", {}, now);
  assert.equal(needsStarterWritingLesson(words), false);
  assert.equal(canStartDailyLesson(words, words, "words", now), false);
  assert.equal(canStartDailyLesson(undefined, replacement, "starter", now), true);
  assert.equal(canStartDailyLesson(undefined, replacement, "starter", new Date(2026, 9, 3)), false);
});
