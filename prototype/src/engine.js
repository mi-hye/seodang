import {reduceReading} from './reading-state.js';
import {reduceDialogue} from './dialogue-state.js';
import {reduceListening} from './listening-state.js';
import { reduceLabels } from "./labels-state.js";
import { recordLearning } from "./learning-history.js";
import { reduceSentence } from "./sentence-state.js";
import { reduceKana } from "./kana-state.js";
import { episode, expressions } from "./content.js";
export const freshEpisode = () => ({
  contentVersion: 1,
  started: false,
  step: "intro",
  dialogue: 0,
  lesson: 0,
  clues: [],
  selected: null,
  attempts: 0,
  hintLevel: 0,
  solved: false,
  transfer: "not_attempted",
  transferAttempts: 0,
  feedback: "",
});
export const freshState = () => ({
  schemaVersion: 1,
  courseDirection: "ko-ja",
  onboarded: false,
  support: "beginner",
  settings: { sound: true, motion: "system", textScale: 1 },
  episode: freshEpisode(),
  encountered: [],
});
export function episodeAudioId(state) {
  const e = state.episode;
  if (e.step === 'intro') return episode.intro[0].audioId;
  if (e.step === 'learn') return `case01.${expressions[e.lesson].id}.ja`;
  return null;
}
export function reduce(state, action, now) {
  return recordLearning(state, reduceCore(state, action), action, now);
}
function reduceCore(state, action) {
  const s = structuredClone(state),
    e = s.episode;
  if(action.type.startsWith("reading-")){
    const level=s.onboardingLevel;
    if([5,6,7].includes(level)){s.readings||={};s.readings[level]=reduceReading(s.readings[level],action,level);}
    return s;
  }
  if(action.type.startsWith("dialogue-")){s.dialogue=reduceDialogue(s.dialogue,action);return s;}
  if (action.type.startsWith("kana-")) { s.kana = reduceKana(s.kana, action); return s; }
  if (action.type.startsWith("sentence-")) { s.sentence = reduceSentence(s.sentence, action); return s; }
  if(action.type.startsWith("listening-")){s.listening=reduceListening(s,action);return s;}
  if (action.type.startsWith("labels-")) {
    s.labels = reduceLabels(s, action);
    if(state.labels?.phase==='match' && s.labels.phase==='summary'){
      s.onboardingLevel=1;s.support='beginner';
      s.listening=reduceListening(s,{type:'listening-start'});
    }
    return s;
  }
  switch (action.type) {
    case "ui-guide-complete":
      s.uiGuideSeenVersion=2;
      break;
    case "level":
      if (Number.isInteger(action.value) && action.value >= 1 && action.value <= 7) {
        s.onboardingLevel = action.value;
        s.support = action.value <= 2 ? "beginner" : "phrase";
      }
      break;
    case "onboard":
      s.onboarded = true;
      s.support = action.value;
      break;
    case "start":
      e.started = true;
      break;
    case "next":
      e.started = true;
      if (e.step === "intro") {
        e.dialogue = 0;
        e.step = "learn";
      } else if (e.step === "learn") {
        s.encountered = [
          ...new Set([...s.encountered, expressions[e.lesson].id]),
        ];
        if (e.lesson < expressions.length - 1) e.lesson++;
        else e.step = "investigate";
      } else if (e.step === "solved") e.step = "transfer";
      else if (e.step === "transfer" && e.transfer === "passed")
        e.step = "summary";
      break;
    case "previous-lesson":
      if (e.step === "learn") {
        if (e.lesson > 0) e.lesson--;
        else { e.step = "intro"; e.dialogue = 0; }
      }
      break;
    case "clue":
      if (
        e.step === "investigate" &&
        episode.clues.some((c) => c.id === action.id)
      ) {
        e.clues = [...new Set([...e.clues, action.id])];
        e.feedback = "";
      }
      break;
    case "select":
      if (
        e.step === "investigate" &&
        episode.objects.some((o) => o.id === action.id)
      ) {
        e.selected = action.id;
        e.feedback = "";
      }
      break;
    case "submit":
      if (e.step !== "investigate") break;
      if (!e.selected) {
        e.feedback = "메모와 같은 가방을 골라 주세요.";
        break;
      }
      e.attempts++;
      const o = episode.objects.find((o) => o.id === e.selected);
      if (o.color !== "blue")
        e.feedback =
          "あおい는 파란색이에요. 가방의 색을 다시 확인해 볼까요?";
      else if (o.place !== "window")
        e.feedback =
          "색은 맞아요. 위치를 나타내는 まどの そば를 다시 확인해 볼까요?";
      else {
        e.solved = true;
        e.step = "solved";
        e.feedback = "";
      }
      break;
    case "hint":
      e.hintLevel = Math.min(3, e.hintLevel + 1);
      break;
    case "transfer":
      if (e.step !== "transfer" || e.transfer === "passed") break;
      e.transferAttempts++;
      e.transfer = action.id === episode.transfer.answer ? "passed" : "retry";
      e.feedback =
        e.transfer === "passed"
          ? ""
          : "이번에는 창문이 오른쪽에 있어요. まどの そば는 창문 옆이에요. 가까이 놓인 물건을 다시 골라 보세요.";
      break;
    case "setting":
      if (Object.hasOwn(s.settings, action.key))
        s.settings[action.key] = action.value;
      break;
    case "restart":
      s.episode = freshEpisode();
      break;
  }
  return s;
}
