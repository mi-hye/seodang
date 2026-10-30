import {comparisonAttachment,migrateComparisonPlacement} from './comparison-attachments.js';
import {validStudy} from './study-state.js';
import {validVideoLessons} from './video-lesson-state.js';
import {validSongs} from './song-state.js';
import {validExperts} from './expert-state.js';
import {validScenarios} from './scenario-state.js';
import {canonicalLevel,validCourseLevel,retiredPractice,retiredAlphabetPractice} from './curriculum.js';
import {normalizeCasePractice,practiceHasWriting,practiceRoundCount,validPractices,normalizePractice,isRetiredVideoReview} from './practice-state.js';
import {validKorean,normalizeKorean,koreanStageZero,koreanExplanation} from './korean-state.js';
import {validBasics,normalizeBasics} from './basics-state.js';
import {validReadings} from './reading-state.js';
import {validDialogue} from './dialogue-state.js';
import {validListening,freshListening} from './listening-state.js';
import { validLabels } from "./labels-state.js";
import { validHistory } from "./learning-history.js";
import { validSentence,validSentenceCourses } from "./sentence-state.js";
import { validKana, normalizeKana } from "./kana-state.js";
import { freshState } from "./engine.js";
import {validGrowth} from './growth-state.js';
import {validMissions} from './mission-state.js';
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
    s?.schemaVersion === 1 && (s.comparisonResume===undefined||s.comparisonResume===null||Boolean(comparisonAttachment(s.comparisonResume))) && validStudy(s.studyTools) && validGrowth(s.growth) && validMissions(s.missions) && validVideoLessons(s) && validSongs(s) && validScenarios(s) && validExperts(s) && validPractices(s.practices) &&
    (s.koreanGuideSeenVersion===undefined||s.koreanGuideSeenVersion===1) &&
    validKorean(s.korean) &&
    (s.courseLevels===undefined||(s.courseLevels&&typeof s.courseLevels==='object'&&!Array.isArray(s.courseLevels)&&Object.entries(s.courseLevels).every(([key,value])=>['ko-ja','ja-ko'].includes(key)&&validCourseLevel(value,key)))) &&
    validHistory(s.history) && validBasics(s.basics) &&
    validReadings(s.readings) &&
    ["ko-ja", "ja-ko"].includes(s.courseDirection) &&
    (s.uiGuideSeenVersion === undefined || [1,2,3].includes(s.uiGuideSeenVersion)) &&
    (s.onboardingLevel === undefined || (validCourseLevel(s.onboardingLevel,s.courseDirection))) &&
    (s.kana === undefined || validKana(s.kana)) &&
    (s.dialogue === undefined || validDialogue(s.dialogue)) &&
    (s.listening === undefined || validListening(s.listening)) &&
    (s.labels === undefined || validLabels(s.labels)) &&
    (s.sentence === undefined || validSentence(s.sentence)) && validSentenceCourses(s) &&
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
// The old dev navigator used the lesson ID (3) as a choice index and only
// enumerated three of the six introduction sentences. Repair only that known
// legacy shape; unrelated malformed records still remain blocked and untouched.
export function repairIntroductionProgress(state){
 const p=state?.sentenceLessons?.[3],practice=state?.practices?.['ko-ja:sentence:3'];
 if(!p||p.version!==1||p.phase!=='solve'||!['0','1','2','3',null].includes(p.selected))return false;
 if(practice&&practice.action?.type!=='sentence-submit')return false;
 p.phase=practice?'arrange':'learn';p.index=practice?5:Math.min(p.index,5);p.selected=practice?'2':null;p.tokens=[];p.checked=false;p.feedback='';
 if(practice){practice.count=6;practice.action={type:'sentence-check'};}
 return true;
}
export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { state: freshState(), blocked: false, error: "" };
    const state = JSON.parse(raw);
    const repaired=repairIntroductionProgress(state);
    if(repaired&&valid(state)){
      const backupKey=STORAGE_KEY+'.backup.introduction-v2';
      if(storage.getItem(backupKey)===null)storage.setItem(backupKey,raw);
    }
    if (!valid(state))
      return {
        state: freshState(),
        blocked: true,
        error:
          "기록을 열 수 없어 임시로 시작했어요. 기존 기록은 보관돼요. 내 기록에서 초기화할 수 있어요.",
      };
    // Keep the clip progress and completed records. Only the superseded generic
    // review gate is removed, after validating the complete saved record.
    if(state.practices)for(const key of Object.keys(state.practices))if(isRetiredVideoReview(key))delete state.practices[key];
    if(state.kana&&state.kana.version!==9&&state.practices){
      const old=Object.entries(state.practices).filter(([key])=>key.startsWith('ko-ja:kana:'));
      if(old.length){state.previousKanaPractices=Object.fromEntries(old);state.practices=Object.fromEntries(Object.entries(state.practices).filter(([key])=>!key.startsWith('ko-ja:kana:')));}
    }
    if (state.kana) state.kana = normalizeKana(state.kana);
    if (state.korean) state.korean = normalizeKorean(state.korean);
    if(state.korean&&state.practices)for(const [key,practice] of Object.entries(state.practices)){
      const [direction,kind,id]=key.split(':');if(direction!=='ja-ko'||kind!=='korean'||!koreanStageZero(id))continue;
      const progress=state.korean.lessons[id];if(progress&&!progress.completed){const reordered=['1-1','1-2','1-3','1-4'].includes(id);progress.index=reordered?0:Math.min(practice.index,practice.count-1);progress.phase=reordered?(koreanExplanation(id)?'intro':'learn'):koreanExplanation(id)?'learn':practice.mode===2?'write':'quiz';progress.selected=null;progress.retry=false;}
      delete state.practices[key];
    }

    for(const [key,type,p] of [['ko-ja:sentence:3','sentence',state.sentenceLessons?.[3]],...['3-1','3-2','3-3','3-4'].map(id=>[`ja-ko:korean:${id}`,'korean',state.korean?.lessons?.[id]])]){const practice=state.practices?.[key];if(practice&&p&&practice.action.type===`${type}-check`){p.phase='speak';p.selected=null;practice.action={type:`${type}-speak-next`};}}
    if (state.basics) state.basics = normalizeBasics(state.basics);
    // Repair the previous build's cross-level handoff once, preserving level 2 progress.
    if(state.courseDirection==='ko-ja' && state.labels?.completed && !state.listening){
      state.listening={...freshListening(),started:true};
      if([1,2].includes(state.onboardingLevel)){state.onboardingLevel=2;state.support='beginner';}
    }
    state.episode.started ??= Boolean(
      state.encountered.length || state.episode.dialogue,
    );
    if(state.practices?.['ko-ja:basic:7']?.action.type==='basic-check')state.practices['ko-ja:basic:7'].action={type:'basic-next'};
    migrateLevelLayout(state);
    migrateComparisonPlacement(state);
    if(state.practices)state.practices=Object.fromEntries(Object.entries(state.practices).map(([key,p])=>[key,normalizePractice(normalizeCasePractice(key==='ko-ja:basic:7'&&[8,9].includes(p.count)?{...p,count:6,index:(p.count===9?[0,1,2,2,3,4,4,5,5]:[0,1,2,3,4,4,5,5])[p.index]}:p,key),practiceRoundCount(key),practiceHasWriting(key))]));
    if(state.practices?.['ko-ja:basic:7']){
      delete state.practices['ko-ja:basic:7'];
      if(state.basics?.lessons?.[7]&&!state.basics.lessons[7].completed)state.basics.lessons[7]={...state.basics.lessons[7],started:true,index:5,phase:'write',selected:null,retry:false};
    }
    if(state.practices?.['ko-ja:basic:8']){
      delete state.practices['ko-ja:basic:8'];
      if(state.basics?.lessons?.[8]&&!state.basics.lessons[8].completed)state.basics.lessons[8]={...state.basics.lessons[8],started:true,index:4,phase:'write',selected:null,retry:false};
    }
    const contracted=state.practices?.['ko-ja:basic:10'];
    if(contracted){if(contracted.count===12){contracted.count=6;contracted.index=Math.min(5,Math.floor(contracted.index/2));}contracted.action={type:'basic-next'};}
    if(repaired&&valid(state))storage.setItem(STORAGE_KEY,JSON.stringify(state));
    return { state, blocked: false, error: "" };
  } catch {
    return {
      state: freshState(),
      blocked: true,
      error:
        "기록을 읽지 못했어요. 계속 학습할 수 있지만 새로고침하면 진도가 사라질 수 있어요.",
    };
  }
}
export function save(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return "";
  } catch {
    return "기록을 저장하지 못했어요. 새로고침하면 진도가 사라질 수 있어요.";
  }
}
export function reset(storage) {
  storage.removeItem(STORAGE_KEY);
}

// IDs and pending practice keys stay stable; only the displayed course grouping changes.
export function migrateLevelLayout(s){
 // Newly retired lessons also apply to records already on the current layout.
 for(const [key,p] of Object.entries(s.practices||{}))if(retiredAlphabetPractice(key)||s.levelLayoutVersion!==3&&retiredPractice(key)){s.archivedPractices||={};s.archivedPractices[key]=p;delete s.practices[key];}
 if(s.levelLayoutVersion===3)return s;
 if(s.levelLayoutVersion!==2){
 if(s.levelLayoutVersion!==1){
 const levelFor=direction=>direction==='ja-ko'?0:(s.basics?.active>=7?0:(s.labels?.started||s.labels?.completed||s.listening?.started||s.basics?.active===6)?1:0);
 if(s.onboardingLevel===1)s.onboardingLevel=levelFor(s.courseDirection);
 for(const direction of Object.keys(s.courseLevels||{}))if(s.courseLevels[direction]===1)s.courseLevels[direction]=levelFor(direction);
 }
 if(s.onboardingLevel===1)s.onboardingLevel=2;
 for(const direction of Object.keys(s.courseLevels||{}))if(s.courseLevels[direction]===1)s.courseLevels[direction]=2;
 }
 if(s.onboardingLevel!==undefined)s.onboardingLevel=canonicalLevel(s.onboardingLevel);
 for(const direction of Object.keys(s.courseLevels||{}))s.courseLevels[direction]=canonicalLevel(s.courseLevels[direction]);
 if(['1-11','2-1'].includes(s.korean?.active))s.korean.active='3-1';
 s.levelLayoutVersion=3;return s;
}
