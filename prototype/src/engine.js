import {reduceVideo} from './video-lesson-state.js';
import {reduceSong} from './song-state.js';
import {reduceExpert} from './expert-state.js';
import {reduceScenario} from './scenario-state.js';
import {canonicalLevel} from './curriculum.js';
import {reduceKorean} from './korean-state.js';
import {reduceBasics} from './basics-state.js';
import {reduceReading} from './reading-state.js';
import {reduceDialogue} from './dialogue-state.js';
import {reduceListening} from './listening-state.js';
import { reduceLabels } from "./labels-state.js";
import { recordLearning } from "./learning-history.js";
import { reduceSentence, sentenceId, sentenceProgress, setSentenceProgress } from "./sentence-state.js";
import { reduceKana } from "./kana-state.js";
import { episode, expressions } from "./content.js";
import {reduceGrowth} from './growth-state.js';
import {reduceMission} from './mission-state.js';
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
  levelLayoutVersion: 3,
  courseDirection: "ko-ja",
  onboarded: false,
  support: "beginner",
  settings: { sound: true, motion: "system", textScale: 1, audioRate: 1 },
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
  // Growth answers and missions are the learner's own writing; they never count as lesson activity.
  if(action.type.startsWith("growth-"))return reduceGrowth(state,action,now);
  if(action.type.startsWith("mission-"))return reduceMission(state,action,now);
  if(action.type.startsWith("video-")){const next=reduceVideo(state,action);return next===state?state:recordLearning(state,next,action,now);}
  if(action.type.startsWith("song-")){const next=reduceSong(state,action);return next===state?state:recordLearning(state,next,action,now);}
  if(action.type.startsWith("expert-")){const next=reduceExpert(state,action);return next===state?state:recordLearning(state,next,action,now);}
  if(action.type.startsWith("scenario-")){const next=reduceScenario(state,action);return next===state?state:recordLearning(state,next,action,now);}
  if(action.type.startsWith("korean-"))return state.courseDirection==='ja-ko'?{...state,korean:reduceKorean(state,action,now)}:state;
  return recordLearning(state, reduceCore(state, action), action, now);
}
function reduceCore(state, action) {
  const s = structuredClone(state),
    e = s.episode;
  if(action.type.startsWith("basic-")){s.basics=reduceBasics(s,action);return s;}
  if(action.type.startsWith("reading-")){
    const level=s.onboardingLevel;
    if([5,6,7].includes(level)){s.readings||={};s.readings[level]=reduceReading(s.readings[level],action,level);}
    return s;
  }
  if(action.type.startsWith("dialogue-")){s.dialogue=reduceDialogue(s.dialogue,action);return s;}
  if (action.type.startsWith("kana-")) { s.kana = reduceKana(s.kana, action); return s; }
  if(action.type.startsWith('sentence-')){const id=action.type==='sentence-start'&&action.id!==undefined?Number(action.id):sentenceId(s);if(![0,1,2,3].includes(id))return s;s.sentenceActive=id;const legacyPractice=id===3&&action.type==='sentence-start'&&s.practices?.['ko-ja:sentence:3'];if(legacyPractice&&legacyPractice.count===3){s.practices['ko-ja:sentence:3']={...legacyPractice,count:6,index:0,action:{type:'sentence-speak-next'}};setSentenceProgress(s,id,{...sentenceProgress(s,id),phase:'speak',index:5,selected:null,tokens:[],checked:false});}setSentenceProgress(s,id,reduceSentence(sentenceProgress(s,id),action,id));return s;}
  if(action.type.startsWith("listening-")){s.listening=reduceListening(s,action);return s;}
  if (action.type.startsWith("labels-")) {
    s.labels = reduceLabels(s, action);
    if(state.labels?.phase==='match' && s.labels.phase==='summary'){
      s.onboardingLevel=2;s.support='beginner';
      s.listening=reduceListening(s,{type:'listening-start'});
    }
    return s;
  }
  switch (action.type) {
    case "course":
      if(["ko-ja","ja-ko"].includes(action.value)){s.courseLevels||={};s.courseLevels[s.courseDirection]=s.onboardingLevel??0;s.courseDirection=action.value;s.onboardingLevel=canonicalLevel(s.courseLevels[action.value]??0);s.support=s.onboardingLevel<=2?"beginner":"phrase";}
      break;
    case "ui-guide-complete":
      s.uiGuideSeenVersion=2;
      break;
    case "level":
      if (Number.isInteger(action.value) && action.value >= 0 && action.value <= 7) {
        s.onboardingLevel = canonicalLevel(action.value);
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
          "あおい는 파란색이에요. 파란 가방을 골라 주세요.";
      else if (o.place !== "window")
        e.feedback =
          "색은 맞아요. まどの そば는 창문 옆이에요.";
      else {
        e.solved = true;
        e.step = "solved";
        e.feedback = "";
      }
      break;
    case "transfer":
      if (e.step !== "transfer" || e.transfer === "passed") break;
      e.transferAttempts++;
      e.transfer = action.id === episode.transfer.answer ? "passed" : "retry";
      e.feedback =
        e.transfer === "passed"
          ? ""
          : "まどの そば는 창문 옆이에요. 오른쪽 창문 옆 물건을 골라 주세요.";
      break;
    case "setting":
      if (action.key === "audioRate" && Number.isFinite(action.value)) s.settings.audioRate = Math.round(Math.max(0.5,Math.min(2,action.value))*10)/10;
      else if (Object.hasOwn(s.settings, action.key))
        s.settings[action.key] = action.value;
      break;
    case "restart":
      s.episode = freshEpisode();
      break;
  }
  return s;
}
