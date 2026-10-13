import {validReadings} from './reading-state.js';
import {validDialogue} from './dialogue-state.js';
import {validListening,freshListening} from './listening-state.js';
import { validLabels } from "./labels-state.js";
import { validHistory } from "./learning-history.js";
import { validSentence } from "./sentence-state.js";
import { validKana, normalizeKana } from "./kana-state.js";
import { freshState } from "./engine.js";
export const STORAGE_KEY = "seodang.web-prototype.v1";
const steps = [
  "intro",
  "learn",
  "investigate",
  "solved",
  "transfer",
  "summary",
];
export function valid(s) {
  return (
    s?.schemaVersion === 1 &&
    validHistory(s.history) &&
    validReadings(s.readings) &&
    s.courseDirection === "ko-ja" &&
    (s.uiGuideSeenVersion === undefined || [1,2,3].includes(s.uiGuideSeenVersion)) &&
    (s.onboardingLevel === undefined || (Number.isInteger(s.onboardingLevel) && s.onboardingLevel >= 1 && s.onboardingLevel <= 7)) &&
    (s.kana === undefined || validKana(s.kana)) &&
    (s.dialogue === undefined || validDialogue(s.dialogue)) &&
    (s.listening === undefined || validListening(s.listening)) &&
    (s.labels === undefined || validLabels(s.labels)) &&
    (s.sentence === undefined || validSentence(s.sentence)) &&
    typeof s.onboarded === "boolean" &&
    ["beginner", "phrase"].includes(s.support) &&
    s.episode?.contentVersion === 1 &&
    steps.includes(s.episode.step) &&
    Number.isInteger(s.episode.dialogue) &&
    s.episode.dialogue >= 0 &&
    s.episode.dialogue <= 1 &&
    Number.isInteger(s.episode.lesson) &&
    s.episode.lesson >= 0 &&
    s.episode.lesson <= 1 &&
    Array.isArray(s.episode.clues) &&
    s.episode.clues.every((x) => ["color", "position"].includes(x)) &&
    new Set(s.episode.clues).size === s.episode.clues.length &&
    [null, "bag-window-blue", "bag-door-blue", "bag-window-red"].includes(
      s.episode.selected,
    ) &&
    typeof s.episode.solved === "boolean" &&
    ["not_attempted", "retry", "passed"].includes(s.episode.transfer) &&
    [s.episode.attempts, s.episode.hintLevel, s.episode.transferAttempts].every(
      (n) => Number.isInteger(n) && n >= 0,
    ) &&
    s.episode.hintLevel <= 3 &&
    typeof s.episode.feedback === "string" &&
    Array.isArray(s.encountered) &&
    s.encountered.every((x) => ["blue-bag", "near-window"].includes(x)) &&
    typeof s.settings?.sound === "boolean" &&
    ["system", "off"].includes(s.settings.motion) &&
    [1, 1.2].includes(s.settings.textScale)
  );
}
export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { state: freshState(), blocked: false, error: "" };
    const state = JSON.parse(raw);
    if (!valid(state))
      return {
        state: freshState(),
        blocked: true,
        error:
          "다른 버전이거나 읽을 수 없는 기록이 있어요. 원본을 보존하고 임시 세션으로 시작합니다. 내 학습에서 기록을 내보내거나 초기화할 수 있어요.",
      };
    if (state.kana) state.kana = normalizeKana(state.kana);
    // Repair the previous build's cross-level handoff once, preserving level 2 progress.
    if(state.labels?.completed && !state.listening){
      state.listening={...freshListening(),started:true};
      if([1,2].includes(state.onboardingLevel)){state.onboardingLevel=1;state.support='beginner';}
    }
    state.episode.started ??= Boolean(
      state.encountered.length || state.episode.dialogue,
    );
    return { state, blocked: false, error: "" };
  } catch {
    return {
      state: freshState(),
      blocked: true,
      error:
        "기록을 읽지 못했어요. 이번 세션은 계속할 수 있지만 새로고침하면 진행이 사라질 수 있어요.",
    };
  }
}
export function save(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return "";
  } catch {
    return "기기에 저장하지 못했어요. 현재 플레이는 유지되지만 새로고침하면 진행이 사라질 수 있어요.";
  }
}
export function reset(storage) {
  storage.removeItem(STORAGE_KEY);
}
