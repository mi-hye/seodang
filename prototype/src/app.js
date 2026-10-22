import {songLesson,songProgress,resumeSongLesson} from './song-state.js';
import {recordStudyCompletion} from './study-state.js';
import {missionForCommunity} from './mission-state.js';
import {videoLesson,videoProgress,resumeVideoLesson,lessonNumberWithVideo} from './video-lesson-state.js';
import {expertCatalog,expertProgress} from './expert-state.js';
import {scenarioProgress,scenarioLessons,scenarioTitle} from './scenario-state.js';
import {analytics,openAnalytics} from './analytics.js';
import {learningSnapshot,createLearningTracker} from './analytics-learning.js';
const learningTracker=createLearningTracker(analytics);
learningTracker.visibility(!document.hidden);
import {japaneseLessonUI,courseGroup,displayLevel,retiredPractice} from './curriculum.js';
import {lessonTitle} from './lesson-title.js';
import {developmentMode} from './build-config.js';
import {practiceHasWriting,practiceRoundCount,advancePractice} from './practice-state.js';
import {t,setUILanguage,loadUILanguage,confirmReset} from './i18n.js';
import {nextKorean,koreanLessons,koreanProgress,koreanUnlocked,koreanStageZero,followingKorean} from './korean-state.js';
import {basicLessons,basicProgress,basicUnlocked,nextBasic,basicLevel,basicSinglePass,followingBasic} from './basics-state.js';
import {renderLearningMap} from './learning-map.js';
import {readingProgress} from './reading-state.js';
import {dialogueProgress} from './dialogue-state.js';
import {listeningUnlocked} from './listening-state.js';
import {labelsUnlocked} from "./labels-state.js";
import { sentenceProgress,sentenceId,sentenceLessons,nextSentence } from "./sentence-state.js";
import { showSheet, closeSheet } from "./sheet.js";
import { selectedLevel, kanaLetters, kanaLessons, normalizeKana, kanaSolvedCount } from "./kana-state.js";
import { renderHeader, installFocusModality } from "./header.js";
installFocusModality();
import { episode, expressions } from "./content.js";
import { freshState, reduce, episodeAudioId } from "./engine.js";
import { load, save, reset, STORAGE_KEY } from "./storage.js";
import { assets, AudioPlayer, audioManifest, checkJapaneseVoice } from "./media.js";
import { icon, button, bag, expressionCard, expressionImage, audioButton, esc, homeCaseCard as renderHomeCaseCard } from "./ui.js";
const app = document.querySelector("#app"),
  panel = document.querySelector("#panel");
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
    removeItem() {
      throw Error();
    },
  };
}
let loaded = load(storage),
  state = loaded.state,
  storageError = loaded.error,
  blocked = loaded.blocked;
await loadUILanguage(state);
setUILanguage(state);
const needsKoreanGuide=state.onboarded&&state.courseDirection==='ja-ko'&&state.koreanGuideSeenVersion!==1;
if(needsKoreanGuide)window.location.replace('setup.html#guide');
const enteringCase = state.courseDirection==='ko-ja' && window.location.hash === "#case" && [2,3,4,5,6,7].includes(selectedLevel(state));
if (!state.onboarded && !enteringCase) window.location.replace("index.html");
let view = enteringCase ? (selectedLevel(state) === 7 ? "expert" : selectedLevel(state) >= 5 ? "reading" : selectedLevel(state) === 4 ? "dialogue" : selectedLevel(state) === 2 ? "sentence" : "play") : "home",
  panelKind = "",
  panelTrigger = null,
  courseRequest = 0,
  lastAdvance = -Infinity,
  toast = "";
const player = new AudioPlayer();
player.onPlayback=source=>learningTracker.audio(source);
document.addEventListener('visibilitychange',()=>learningTracker.visibility(!document.hidden));
window.addEventListener('pagehide',()=>learningTracker.visibility(false));
window.addEventListener('pageshow',()=>learningTracker.visibility(!document.hidden));
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>learningTracker.activity(),{capture:true,passive:true});
setInterval(()=>learningTracker.tick(),15000);
function updatePassagePlayback(){for(const el of app.querySelectorAll('[data-passage-pause]')){const paused=player.state==='paused';el.disabled=player.state==='idle';el.innerHTML=icon(paused?'play':'pause');el.setAttribute('aria-label',paused?el.dataset.resumeLabel:el.dataset.pauseLabel);}}
player.onStateChange=updatePassagePlayback;
const progress = () =>
  ({ intro: 0, learn: 1, investigate: 2, solved: 3, transfer: 4, summary: 5 })[
    state.episode.step
  ];
let scenarioModule,scenarioStyles;
async function loadScenario(){
 scenarioModule ||= await import('./scenario.js');
 scenarioStyles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/scenario.css';link.onload=resolve;link.onerror=()=>{link.remove();scenarioStyles=null;reject(Error('Scenario styles unavailable'));};document.head.append(link);});
 await Promise.all([scenarioStyles,loadPractice('scenario')]);
}
function scenario(){return scenarioProgress(state).phase==='done'?practiceModule.renderPracticeComplete(state,top,false):scenarioModule.renderScenario(state,top);}
function speakScenario(part){if(pendingPractice())return;const sequence=scenarioModule?.scenarioIntroAudio(state);if(sequence){void player.playSequence(sequence,state.settings.sound,message=>{toast=message;render();},{rate:0.8*(state.settings.audioRate??1)});return;}const entry=scenarioModule?.currentScenarioAudio(state,part);if(entry)void player.play(entry,state.settings.sound,message=>{toast=message;render();},{rate:entry.playbackRate*(state.settings.audioRate??1)});}
let practiceModule,practiceStyles,disposePractice,lessonSession,entryBusy=false;
const practiceKinds=['kana','basic','labels','listening','play','sentence','dialogue','reading','korean'];
const reviewKinds=[...practiceKinds,'scenario','video'];
async function loadPractice(kind){
 practiceModule ||= await import('./practice.js');
 lessonSession ||= await import('./lesson-session.js');
 practiceStyles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/practice.css';link.onload=resolve;link.onerror=()=>{link.remove();practiceStyles=null;reject(Error('Practice styles unavailable'));};document.head.append(link);});
 await Promise.all([practiceStyles,kind?practiceModule.prepareContent(kind):Promise.resolve()]);

}
function pendingPractice(){return reviewKinds.includes(view)?practiceModule?.practiceState(state,view):undefined;}
function commit(action) {
  if(['kana-restart','labels-restart','sentence-restart','restart'].includes(action.type)&&pendingPractice()){const entries={...state.practices};delete entries[practiceModule.practiceKey(state,view)];state={...state,practices:entries};}
  if(action.type==='video-start'&&action.restart&&state.practices){const entries={...state.practices};delete entries[`${state.courseDirection}:video:${action.id??state.videoActive}`];state={...state,practices:entries};}
  const analyticsBefore=learningSnapshot(state,view);
  const next=reduce(state,action);
  state=practiceModule&&reviewKinds.includes(view)?practiceModule.interceptCompletion(state,next,view,action):next;
  state=recordStudyCompletion(state,analyticsBefore,learningSnapshot(state,view));
  learningTracker.transition(analyticsBefore,learningSnapshot(state,view),action.type,learningSnapshot(next,view));
  if (!blocked) storageError = save(storage, state);
}
function navigate(next) {
  if(next==='expert'||next!=='video'&&reviewKinds.includes(next))void import('./audio-download-ui.js').then(m=>m.prefetchLesson(state,next,message=>{toast=message;render();}));
  else void import('./audio-download-ui.js').then(m=>m.cancelLessonDownload());
  completedKind=null;
  player.stop();
  view = next;
  learningTracker.enter(learningSnapshot(state,view));
  toast = "";
  render(true);
  if (next === "scenario") speakScenario();
  if (next === "korean") speakKorean();
  if (next === "basic") speakBasic();
  if (next === "play") speakEpisodeAudio();
  if (next === "kana") speakKana();
  if (next === "sentence") speakSentence();
  if (next === "labels") speakLabels();
  if(next==="listening")speakListening();
  if(next==="dialogue")speakDialogue();
  if(next==="reading")speakReading();
}
function speakEpisodeAudio() {
  if(pendingPractice())return;
  if (view !== "play") return;
  const id = episodeAudioId(state);
  if (!id) return;
  void player.play(audioManifest[id], state.settings.sound, (message) => {
    toast = message;
    render();
  });
}
function top(title, back = true) {
  if(!completedKind&&reviewKinds.includes(view))title=lessonTitle(state,view,title);
  return renderHeader(title || "서당", { backAction: "home", backLabel: "학습 홈으로", backDisabled: !back, backHidden: !back });
}
let communityModule,communityStyles,disposeCommunity,communityScreen='feed';
async function loadCommunity(){
 communityModule ||= await import('./community.js');
 communityStyles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/community.css';link.onload=resolve;link.onerror=()=>{link.remove();communityStyles=null;reject(Error('Community styles unavailable'));};document.head.append(link);});
 await communityStyles;
}
function community(){const header=top(japaneseLessonUI(state)?'交流':'교류',false).replace('<span class="app-header-title',`${button(icon('people'),'community-inbox','app-header-back',`aria-label="${japaneseLessonUI(state)?'メッセージ':'대화함'}"`)}<span class="app-header-title`);return `${header}<main class="community" data-community-root></main>${tabs()}`;}
function tabs() {
  const japanese=japaneseLessonUI(state);
  const items=[
    ['home','book',japanese?'学習':'학습'],
    ['my','chart',japanese?'記録':'기록'],
    ['community','people',japanese?'交流':'교류'],
  ];
  return `<nav class="tabs" aria-label="${japanese?'メインメニュー':'주 메뉴'}">${items.map(([id,i,label])=>button(`${icon(i)}<span>${esc(label)}</span>`,id,view===id?'tab active':'tab',`aria-current="${view===id?'page':'false'}"`)).join('')}</nav>`;
}
function currentPracticeKey(){
 return Object.keys(state.practices||{}).find(key=>{
  const [direction,kind,id]=key.split(':');
  const level=kind==='korean'?koreanLessons.find(l=>l.id===id)?.level:kind==='reading'?Number(id):kind==='kana'?0:kind==='basic'?basicLevel(id):({play:2,sentence:2,dialogue:4}[kind]??2);
  return !retiredPractice(key)&&direction===state.courseDirection&&courseGroup(level)===courseGroup(selectedLevel(state));
 });
}
function homeCaseCard(props){
 let kind=props.action,s=state;
 if(kind==='practice-resume'){const key=currentPracticeKey();if(key){const [,k,id]=key.split(':');kind=k;if(k==='kana')s={...state,kana:{...state.kana,active:Number(id)}};if(k==='basic')s={...state,basics:{...state.basics,active:Number(id)}};if(k==='korean')s={...state,korean:{...state.korean,active:id}};if(k==='reading')s={...state,onboardingLevel:Number(id)};if(k==='sentence')s={...state,sentenceActive:Number(id)};if(k==='scenario')s={...state,scenarioActive:id};if(k==='video')s={...state,videoActive:id};}}
 else if(kind==='sentence')s={...state,sentenceActive:Number(props.id??nextSentence(state))};
 else if(kind==='reading'&&props.id!==undefined)s={...state,onboardingLevel:props.id};
 else if(kind==='kana'){const k=normalizeKana(state.kana),active=k.lessons[k.active].phase==='summary'?Math.max(0,k.lessons.findIndex(l=>!l.caseSolved)):k.active;s={...state,kana:{...k,active}};}
 else if(kind==='korean')s={...state,korean:{...state.korean,active:nextKorean(state).id}};
 else if(kind==='basic')s={...state,basics:{...state.basics,active:nextBasic(state)}};
 const parts=props.title.split(' · '),prefix=parts.length>1?parts.shift()+' · ':'';
 return renderHomeCaseCard({...props,title:prefix+lessonTitle(s,kind,parts.join(' · '))});
}
function caseCard() {
  const music=resumeSongLesson(state);if(music)return renderHomeCaseCard({title:`${music.number}. ${music.title}`,action:'song',id:music.id,actionLabel:t('학습 이어하기')});
  const v=resumeVideoLesson(state);if(v)return renderHomeCaseCard({title:`${v.number}. ${t(v.title)}`,action:'video',id:v.id,actionLabel:t('학습 이어하기')});
  if(selectedLevel(state)===7){const list=expertCatalog[state.courseDirection];let id=list.findIndex((_,i)=>expertProgress(state,i).started&&!expertProgress(state,i).completed);if(id<0)id=list.findIndex((_,i)=>!expertProgress(state,i).completed);if(id<0)id=0;const p=expertProgress(state,id);return renderHomeCaseCard({title:`${lessonNumberWithVideo(state,id+1)}. ${t(list[id].title)}`,action:'expert',id,actionLabel:t(p.completed?'다시 학습하기':p.started?'학습 이어하기':'학습 시작하기')});}
  const extra=scenarioLessons.find(l=>l.level===courseGroup(selectedLevel(state))&&scenarioProgress(state,l.id).started&&!scenarioProgress(state,l.id).completed);
  if(extra)return renderHomeCaseCard({title:`${displayLevel(extra.level)}단계 · ${lessonNumberWithVideo(state,extra.number[state.courseDirection])}. ${scenarioTitle(state,extra)}`,action:'scenario',id:extra.id,actionLabel:t('학습 이어하기')});
  const pendingKey=currentPracticeKey();
  if(pendingKey){
    const [,kind,id]=pendingKey.split(':');
    const title=kind==='scenario'?scenarioTitle(state,scenarioLessons.find(l=>l.id===id)):kind==='korean'?koreanLessons.find(l=>l.id===id)?.title:kind==='kana'?kanaLessons[Number(id)]?.caseTitle:kind==='basic'?basicLessons.find(l=>l.id===Number(id))?.title:kind==='sentence'?sentenceLessons.find(l=>l.id===Number(id))?.title:({labels:'그림에 이름표 붙이기',listening:'듣고 사진 고르기',play:'카페에 남겨진 가방',sentence:'가방 주인을 찾아요',dialogue:'카페에서 주문하기',reading:selectedLevel(state)===7?'생각 나누기':selectedLevel(state)===6?'조건과 이유를 읽고 판단하기':'글을 읽고 핵심 찾기'}[kind]);
    return homeCaseCard({title,action:'practice-resume',actionLabel:japaneseLessonUI(state)?'学習を続ける':'학습 이어하기'});
  }
  if(state.courseDirection==='ja-ko'){const l=nextKorean(state),p=koreanProgress(state,l.id);return homeCaseCard({title:`レベル${displayLevel(l.level)} · ${l.title}`,action:'korean',actionLabel:(p.completed?'もう一度学ぶ':p.started?'学習を続ける':'学習を始める')});}

  const level = selectedLevel(state);
  if (level === 0) {
    const k = normalizeKana(state.kana), count = kanaSolvedCount(k);
    if(k.lessons.every(l=>l.completed)){const id=nextBasic(state),p=basicProgress(state,id),l=basicLessons.find(l=>l.id===id);return homeCaseCard({title:`${displayLevel(level)}단계 · ${l.title}`,action:'basic',actionLabel:t(p.completed?'다시 학습하기':p.started?'학습 이어하기':'학습 시작하기')});}
    const next = k.lessons[k.active].phase === "summary" ? Math.max(0, k.lessons.findIndex(l => !l.caseSolved)) : k.active;
    const lesson = kanaLessons[next], progress = k.lessons[next];
    return homeCaseCard({coverText:lesson.letters.slice(0,5).map(l=>l.text).join(" "),title:`1단계 · ${lesson.caseTitle}`,description:`${lesson.rangeLabel} / 쓰기 · 읽기 · 카드 짝 맞추기`,action:"kana",actionLabel:count===kanaLessons.length?"글자 다시 연습하기":progress.started?"학습 이어하기":"학습 시작하기"});
  }
  if(level===2){const id=nextSentence(state),p=sentenceProgress(state,id);return homeCaseCard({title:`2단계 · ${sentenceLessons.find(l=>l.id===id).title}`,action:"sentence",id,actionLabel:p.completed?"다시 학습하기":p.started?"학습 이어하기":"학습 시작하기"});}
  if(level===4){const p=dialogueProgress(state);return homeCaseCard({image:assets.cafe.src,imageAlt:'カフェ',title:'3단계 · 따뜻한 커피를 포장해요',description:'질문을 듣고 원하는 음료와 포장 여부를 말해요.',action:'dialogue',actionLabel:p.phase==='done'?'다시 학습하기':p.started?'학습 이어하기':'학습 시작하기'});}
  if(level>=5){const id=level===5&&readingProgress(state,5).completed?6:level,p=readingProgress(state,id);return homeCaseCard({id,title:`4단계 · ${id===5?'안내·메시지에서 정보 찾기':'조건과 이유를 연결해 판단하기'}`,action:'reading',actionLabel:t(p.completed?'다시 학습하기':p.started?'학습 이어하기':'학습 시작하기')});}

  const complete=state.episode.step==='summary';
  return homeCaseCard({image:assets.cafe.src,imageAlt:'카페',title:'2단계 · 카페에 남겨진 가방',description:'색과 위치를 나타내는 일본어 표현을 배워요.',action:complete?'review':'play',actionLabel:complete?'배운 표현 복습하기':state.episode.started?'학습 이어하기':'학습 시작하기'});
}
let kanaModule, sentenceModule, sentenceStyles;
async function loadSentences() {
  sentenceModule ||= await import('./sentences.js');
  if (!sentenceStyles) sentenceStyles = new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href='src/sentences.css';
    link.onload=resolve;link.onerror=()=>{link.remove();sentenceStyles=null;reject(Error('Sentence styles unavailable'));};document.head.append(link);
  });
  await sentenceStyles;
}
function sentence() { return sentenceModule.renderSentences(state,top); }
function speakSentence() {
  if(pendingPractice())return;
  const entry=sentenceModule.currentSentenceAudio(state);
  if(entry) void player.play(entry,state.settings.sound,message=>{toast=message;render();});
}
let labelsModule,labelsStyles;
async function loadLabels(){
 labelsModule ||= await import('./labels.js');
 if(!labelsStyles)labelsStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/labels.css';link.onload=resolve;link.onerror=()=>{link.remove();labelsStyles=null;reject(Error('Labels styles unavailable'));};document.head.append(link);});
 await labelsStyles;
}
let videoModule,videoStyles,disposeVideo;
async function loadVideo(){
 videoModule ||= await import('./video-lesson.js');
 videoStyles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/video-lesson.css';link.onload=resolve;link.onerror=()=>{link.remove();videoStyles=null;reject(Error('Video lesson styles unavailable'));};document.head.append(link);});
 await Promise.all([videoStyles,loadPractice('video')]);
}
function video(){return videoProgress(state).phase==='done'?practiceModule.renderPracticeComplete(state,top,false):videoModule.renderVideoLesson(state,title=>renderHeader(title,{backLabel:t('학습 홈으로')}));}
let songModule,songStyles;
async function loadSong(){
 songModule ||= await import('./song-lesson.js');
 songStyles ||= Promise.all(['video-lesson.css','song-lesson.css'].map(name=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=`src/${name}`;link.onload=resolve;link.onerror=()=>{link.remove();songStyles=null;reject(Error('Song lesson styles unavailable'));};document.head.append(link);})));
 await Promise.all([songStyles,loadPractice()]);
}
function song(){return songProgress(state).phase==='done'?practiceModule.renderPracticeComplete(state,top,false):songModule.renderSongLesson(state,title=>renderHeader(title,{backLabel:t('학습 홈으로')}));}
let expertModule;
async function loadExpert(){expertModule ||= await import('./expert.js');await Promise.all([loadReading(),loadPractice('reading'),expertModule.prepareExpert()]);}
function expert(){return expertProgress(state).phase==='done'?practiceModule.renderPracticeComplete(state,top,false):expertModule.renderExpert(state,title=>renderHeader(title,{backLabel:t('학습 홈으로')}));}
function speakExpert(force=false){const entry=expertModule?.expertAudio(state);if(entry)void player.play(entry,force||state.settings.sound,message=>{toast=message;render();},{rate:state.settings.audioRate??1});}
let readingModule,readingStyles;
async function loadReading(){
 readingModule ||= await import('./reading.js');
 if(!readingStyles)readingStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/reading.css';link.onload=resolve;link.onerror=()=>{link.remove();readingStyles=null;reject(Error('Reading styles unavailable'));};document.head.append(link);});
 await readingStyles;
 await readingModule.prepareReading(selectedLevel(state));
}
function reading(){return readingModule.renderReading(state);}
function speakReading(rate=state.settings.audioRate??1){if(pendingPractice())return;const entry=readingModule.currentReadingAudio(state);if(entry)void player.play(entry,state.settings.sound,()=>{toast='音声を再生できませんでした。もう一度お試しください。';render();},{rate});}
let dialogueModule,dialogueStyles;
async function loadDialogue(){
 dialogueModule ||= await import('./dialogue.js');
 if(!dialogueStyles)dialogueStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/dialogue.css';link.onload=resolve;link.onerror=()=>{link.remove();dialogueStyles=null;reject(Error('Dialogue styles unavailable'));};document.head.append(link);});
 await dialogueStyles;
}
function dialogue(){return dialogueModule.renderDialogue(state,top);}
function speakDialogue(){if(pendingPractice())return;const entry=dialogueModule.currentDialogueAudio(state);if(entry)void player.play(entry,state.settings.sound,message=>{toast=message;render();});}
function listening(){return labelsModule.renderListening(state,top);}
function speakListening(){if(pendingPractice())return;const entry=labelsModule.listeningAudio(state);if(entry)void player.play(entry,state.settings.sound,message=>{toast=message;render();});}
async function showMap(){navigate('home');}
function labels(){return labelsModule.renderLabels(state,top);}
function speakLabels(){if(pendingPractice())return;const entry=labelsModule.labelsAudio(state);if(entry)void player.play(entry,state.settings.sound,message=>{toast=message;render();});}
let kanaStyles;
async function loadKana() {
  kanaModule ||= await import('./kana.js');
  if (!kanaStyles) kanaStyles = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'src/kana.css';
    link.onload = resolve;
    link.onerror = () => { link.remove(); kanaStyles = null; reject(Error('Styles unavailable')); };
    document.head.append(link);
  });
  await kanaStyles;
}
function kana() { return kanaModule.renderKana(state, top); }
function speakKana() {
  if(pendingPractice())return;
  const entry = kanaModule.kanaAudio(state);
  if (entry) void player.play(entry, state.settings.sound, message => { toast = message; render(); });
}

let koreanModule,koreanStyles,disposeKoreanWriting;
async function loadKorean(){
 koreanModule ||= await import('./korean.js');
 koreanStyles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/korean.css';link.onload=resolve;link.onerror=()=>{link.remove();koreanStyles=null;reject(Error('Styles unavailable'));};document.head.append(link);});await koreanStyles;
}
function korean(){return koreanModule.renderKorean(state,top);}
function speakKoreanIntro(){const entries=koreanModule.koreanIntroAudio(state);if(entries.length)void player.playSequence(entries,state.settings.sound,()=>{toast='音声を再生できませんでした。もう一度お試しください。';render();});}
function speakKorean(){if(pendingPractice())return;const phase=koreanProgress(state,state.korean.active).phase;if(phase==='scenario'){speakKoreanIntro();return;}if(phase==='intro')return;const entry=koreanStageZero(state.korean.active)&&koreanProgress(state,state.korean.active).phase==='learn'?koreanModule.koreanExampleAudio(state)||koreanModule.koreanAudio(state):koreanModule.koreanAudio(state);void player.play(entry,state.settings.sound,()=>{toast='音声を再生できませんでした。もう一度お試しください。';render();},{rate:entry?.playbackRate??state.settings.audioRate??1});}
let basicModule,basicStyles;
async function loadBasics(){
 basicModule ||= await import('./basics.js');
 if(!basicStyles)basicStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/basics.css';link.onload=resolve;link.onerror=()=>{link.remove();basicStyles=null;reject(Error('Styles unavailable'));};document.head.append(link);});
 await basicStyles;
}
function basic(){return basicModule.renderBasic(state,top);}
function speakBasic(){if(pendingPractice()||basicProgress(state,state.basics.active).phase==='intro')return;void player.play(basicModule.basicAudio(state),state.settings.sound,message=>{toast=message;render();});}

let studyModule,studyStyles,studyItems=[];
async function loadStudy(){
 studyModule ||= await import('./study.js');
 if(!studyStyles)studyStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/study.css';link.onload=resolve;link.onerror=()=>{link.remove();studyStyles=null;reject(Error('Study styles unavailable'));};document.head.append(link);});
 await studyStyles;studyItems=await studyModule.studyCatalog(state);
}
function study(){return studyModule.renderStudy(state,studyItems,title=>renderHeader(title,{backAction:'my',backLabel:'학습 기록'}));}
function home() {
  return `${top("서당", false)}<main class="page home">${renderLearningMap(state,{resumeCard:caseCard()})}</main>${tabs()}`;
}
function review() {
  if (selectedLevel(state) === 2) return sentenceModule.renderSentenceReview(state,top,tabs);
  if (selectedLevel(state) === 0) {
    const learned = kanaLetters.filter(l => state.kana?.learned.includes(l.id));
    return `${top("배운 글자")}<main class="page notebook-page">${learned.length ? learned.map(l => `<article class="review-expression"><div class="audio-text-row"><h2 lang="ja">${l.text}</h2>${button(icon("sound"), "letter-audio", "icon-button", `data-id="${l.id}" aria-label="다시 듣기"`)}</div><p>${l.reading}</p></article>`).join('') : '<div class="empty-notebook"><h2>아직 배운 글자가 없어요.</h2></div>'}${button('글자 학습하기', 'kana')}</main>${tabs()}`;
  }
  const learned = expressions.filter((e) => state.encountered.includes(e.id));
  return `${top("배운 표현")}<main class="page notebook-page">${
    learned.length
      ? learned.map((e) => `<article class="review-expression">${expressionImage(e)}<div class="audio-text-row"><h2 lang="ja">${esc(e.text)}</h2>${audioButton(`case01.${e.id}.ja`, state.settings.sound, "다시 듣기", true)}</div><p>${esc(e.meaning)}</p></article>`).join("")
      : `<div class="empty-notebook">${icon("cards")}<h2>아직 배운 표현이 없어요.</h2></div>`
  }${state.episode.step === "summary" ? button("다시 학습하기", "restart", "secondary") : button(learned.length ? "학습 이어하기" : "학습 시작하기", "play")}</main>${tabs()}`;
}

// Growth comparison and daily mission screens load on demand from the records page.
let growthModule,missionModule,growthStyles,growthScreen='overview',growthNotice='',growthError='',growthPending,missionError='',missionPending,draftTimer=null;
const uiText=(ko,ja)=>japaneseLessonUI(state)?ja:ko;
async function loadGrowthStyles(){
 growthStyles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/growth.css';link.onload=resolve;link.onerror=()=>{link.remove();growthStyles=null;reject(Error('Growth styles unavailable'));};document.head.append(link);});
 await growthStyles;
}
async function loadGrowth(kind){
 await loadRecords();
 if(kind==='growth')growthModule ||= await import('./growth-view.js');else missionModule ||= await import('./mission-view.js');
 await loadGrowthStyles();
}
const growthHeader=title=>renderHeader(title,{backAction:'my',backLabel:'학습 기록'});
function growth(){return growthModule.renderGrowth(state,growthHeader,{screen:growthScreen,notice:growthNotice,error:growthError,pendingText:growthPending});}
function mission(){return missionModule.renderMission(state,growthHeader,{error:missionError,pendingText:missionPending});}
// Typing saves a draft shortly after input stops, and before any other action or page hide.
function flushDraft(){
 if(draftTimer===null)return;
 clearTimeout(draftTimer);draftTimer=null;
 const field=app.querySelector('[data-growth-draft],[data-mission-draft]');if(!field)return;
 if(field.matches('[data-growth-draft]'))commit({type:'growth-draft',text:field.value});
 else commit({type:'mission-draft',text:field.value,lessonKey:field.dataset.lessonKey,lessonOn:field.dataset.lessonOn});
}
// Save failures keep the typed text on screen and leave the stored record unchanged.
function saveWriting(action,{onSaved,onFailed}){
 const before=state;commit(action);
 if(state===before)return onFailed('empty');
 if(blocked||storageError){state=before;return onFailed('storage');}
 onSaved();
}
let recordsModule, recordsStyles, recordOffset=0, recordSelected;
function my() { return recordsModule.renderRecords(state,top,tabs,{offset:recordOffset,selected:recordSelected}); }
async function loadRecords() {
 recordsModule ||= await import('./records.js');
 if(!recordsStyles) recordsStyles=new Promise((resolve,reject)=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href='src/records.css';
  link.onload=resolve;link.onerror=()=>{link.remove();recordsStyles=null;reject(Error('Records styles unavailable'));};document.head.append(link);
 });
 await recordsStyles;
}

function scene() {
  return `<div class="scene"><img src="${assets.cafe.src}" alt="왼쪽 창문과 오른쪽 출입문이 있는 카페"></div>`;
}
function investigation() {
  const e=state.episode;
  const request=`<aside class="guest-request" aria-label="손님이 찾는 가방 메모"><h2>손님이 찾는 가방</h2>${episode.clues.map(c=>`<div class="request-line"><span class="request-category">${c.id==='color'?'색':'위치'}</span>${button(`<span lang="ja">${c.text}</span>`,'clue','request-phrase',`data-id="${c.id}" aria-label="${c.text} 뜻 보기"`)}${audioButton(`case01.${c.expressionId}.ja`,state.settings.sound,`${c.text} 듣기`,true)}</div>`).join('')}</aside>`;
  const target=(o,n)=>`<button class="bag-target ${e.selected===o.id?'selected':''}" data-action="select" data-id="${o.id}" aria-label="${o.label}" aria-pressed="${e.selected===o.id}">${bag(o.color)}<span class="object-number">${String(n).padStart(2,'0')}</span></button>`;
  return `<div class="investigation">${request}<div class="room"><img src="${assets.cafe.src}" alt="왼쪽 창문과 오른쪽 출입문이 있는 카페 사진"><div class="room-labels"><span>창가 자리</span><span>출입문</span></div><div class="bag-position window-red">${target(episode.objects[2],3)}</div><div class="bag-position door-blue">${target(episode.objects[1],2)}</div><div class="bag-position window-blue">${target(episode.objects[0],1)}</div></div></div>`;
}

function transferScene() {
  return `<div class="transfer-room"><img src="${assets.cafe.src}" alt="이번에는 창문이 오른쪽, 문이 왼쪽에 있어요"><div class="transfer-door">문</div><div class="transfer-window">창문</div><div class="transfer-objects">${episode.transfer.objects.map((o, i) => button(`<span class="object-symbol">${icon(o.symbol === "cup" ? "cup" : o.symbol === "book" ? "book" : "leaf")}</span><span class="object-number">${String(i + 1).padStart(2, "0")}</span>`, "transfer", "transfer-object " + o.place, `aria-label="${o.label}" data-id="${o.id}" ${state.episode.transfer === "passed" ? "disabled" : ""}`)).join("")}</div></div>`;
}
function play() {
  const e = state.episode;
  const labels = [
    "이야기",
    "표현 익히기",
    "메모 읽기",
    "표현 확인",
    "다시 써 보기",
    "마무리",
  ];
  let body = "";
  if (e.step === "intro")
    body = `${scene()}<section class="reading dialogue-slab"><span class="speaker">${episode.intro[0].speaker}</span><h2>색과 위치 표현을 배워요</h2>${button(`표현 익히기 ${icon("arrow")}`, "next")}</section>`;
  if (e.step === "learn")
    body = `<section class="reading learning-sheet"><span class="eyebrow">표현 익히기</span><h1>${e.lesson ? "어디에 있을까요?" : "어떤 가방일까요?"}</h1>${expressionCard(expressions[e.lesson], { meaning: true, picture: true, compactAudio: true, showReading: true, sound: state.settings.sound, beginner: state.support === "beginner" })}<div class="button-pair">${button("이전", "previous-lesson", "secondary")}${button(e.lesson ? "메모 보기" : "다음", "next")}</div></section>`;
  if (e.step === "investigate")
    body = `${investigation()}<section class="reading investigation-slab"><div class="section-row"><h2>${e.selected?'선택한 가방을 확인해 주세요':'메모와 같은 가방을 골라요'}</h2></div>${e.feedback?`<div class="feedback" role="status">${esc(e.feedback)}</div>`:''}${button('확인하기','submit','primary',e.selected?'':'disabled')}</section>`;
  if (e.step === "solved")
    body = `${scene()}<section class="reading solved-slab"><span class="eyebrow">${icon("check")} 사건 해결</span><h1>창문 옆 파란 가방이에요</h1><div class="solution-explanation"><p><b lang="ja">あおい かばん</b> · 파란 가방<br><b lang="ja">まどの そば</b> · 창문 옆</p></div>${button(`다음 문제 ${icon("arrow")}`, "next")}</section>`;
  if (e.step === "transfer")
    body = `<section class="reading transfer-sheet"><h1>표현에 맞는 물건을 골라요</h1><div class="transfer-prompt" lang="ja">${episode.transfer.prompt}</div>${transferScene()}${e.feedback ? `<div class="feedback ${e.transfer === "passed" ? "success" : ""}" role="status">${esc(e.feedback)}</div>` : ""}${e.transfer === "passed" ? button(`배운 표현 정리하기 ${icon("arrow")}`, "next") : ""}</section>`;
  if (e.step === "summary")
    body = `<section class="reading summary"><div class="summary-top"><span class="completion">${icon("check")}</span><h1>학습 완료</h1></div><div class="summary-scroll"><h2>배운 표현</h2><div class="summary-expressions">${expressions.map((x, i) => `<div><span class="expression-index">0${i + 1}</span><b lang="ja">${x.text}</b><span>${x.meaning}</span></div>`).join("")}</div></div><div class="case-complete-actions button-pair">${button("다시 풀기", "restart", "secondary")}${button("다음 사건으로", "stories", "primary", 'disabled aria-label="다음 사건으로, 준비 중입니다" title="다음 사건을 준비 중이에요"')}</div></section>`;
  return `${top("카페에 남겨진 가방")}<main class="play play-${e.step}">${e.step !== "intro" ? "" : `<div class="play-heading">${audioButton(episode.intro[0].audioId, state.settings.sound, "직원 말 다시 듣기")}</div>`}<div class="progress-heading"><span>${labels[progress()]}</span><ol class="steps" aria-label="사건 진행">${labels.map((l, i) => `<li class="${i <= progress() ? "filled" : ""}" ${i === progress() ? 'aria-current="step"' : ""}><span class="sr-only">${l}</span></li>`).join("")}</ol></div>${body}</main>`;
}
let disposeSpeaking,disposeWriting,disposeMatching,disposeCompletionSound,completedKind=null;
let disposeMapCharacter,mapCharacterRequest=0;
function clearMapCharacter(){mapCharacterRequest++;disposeMapCharacter?.();disposeMapCharacter=null;}
async function mountMapCharacter(){
  const host=app.querySelector('.map-mascot');if(!host||host.dataset.pose==='running')return;
  const request=mapCharacterRequest;
  try{
    const {mountOnboardingCharacter}=await import('./onboarding-character.js');
    if(request!==mapCharacterRequest||!host.isConnected)return;
    disposeMapCharacter=mountOnboardingCharacter(host,{state:'idle',pose:host.dataset.pose||'standing',reducedMotion:state.settings.motion==='off'});
  }catch{/* The original pose remains visible if the optional renderer is unavailable. */}
}
function render(scroll = false) {
  disposeCompletionSound?.();disposeCompletionSound=null;
  disposeVideo?.();disposeVideo=null;
  disposeCommunity?.();disposeCommunity=null;
  clearMapCharacter();
  disposePractice?.();disposePractice=null;

  setUILanguage(state);
  disposeSpeaking?.();disposeSpeaking=null;
  disposeKoreanWriting?.();disposeKoreanWriting=null;
  disposeMatching?.();
  disposeMatching=null;
  disposeWriting?.();
  disposeWriting = null;
  const focus = document.activeElement?.dataset;
  document.documentElement.style.setProperty(
    "--text-scale",
    state.settings.textScale,
  );
  document.documentElement.dataset.motion = state.settings.motion;
  document.documentElement.classList.toggle("library-theme", ["home", "my", "community", "growth", "mission"].includes(view));
  app.innerHTML = `<div class="shell view-${view}">${storageError ? `<aside class="storage-warning" role="status">${esc(t(storageError))}</aside>` : ""}${completedKind?(completedKind==='korean'&&state.korean.active==='1-10'?koreanModule.renderKoreanLettersComplete(top):practiceModule.renderPracticeComplete(state,top,hasNextLesson(completedKind))):pendingPractice()?practiceModule.renderPractice(state,view,top):{ home, study, community, growth, mission, video, song, expert, scenario, korean, basic, review, my, play, kana, sentence, labels, listening, dialogue, reading }[view]()}${toast ? `<div class="toast" role="status">${esc(t(toast))}</div>` : ""}</div>`;
  if(lessonSession&&['scenario','video'].includes(view)&&practiceModule?.caseTasksForReview?.(state,view)&&!completedKind){app.querySelector('.lesson-progress,.scenario-progress')?.remove();app.querySelector('.app-header')?.insertAdjacentHTML('afterend',lessonSession.progressBar(state,view));}
  if(!completedKind&&lessonSession&&practiceKinds.includes(view))app.querySelector('.app-header')?.insertAdjacentHTML('afterend',lessonSession.progressBar(state,view));
  if(lessonSession&&(practiceKinds.includes(view)||pendingPractice()))lessonSession.centerLesson(app,state,view,Boolean(completedKind));
  if(view==='expert'&&expertProgress(state).phase==='done'){lessonSession.centerLesson(app,state,view,true);app.querySelector('.practice-complete h1')?.focus({preventScroll:true});}
  if(view==='scenario'&&scenarioProgress(state).phase==='done'){lessonSession.centerLesson(app,state,view,true);app.querySelector('.practice-complete h1')?.focus({preventScroll:true});}
  if(view==='video'){disposeVideo=videoModule.mountVideoPlayer(app,state);if(videoProgress(state).phase==='done'){lessonSession.centerLesson(app,state,view,true);app.querySelector('.practice-complete h1')?.focus({preventScroll:true});}}
  if(view==='song'){disposeVideo=songModule.mountSongPlayer(app,state);if(songProgress(state).phase==='done'){lessonSession.centerLesson(app,state,view,true);app.querySelector('.practice-complete h1')?.focus({preventScroll:true});}}
  if(view==='community')disposeCommunity=communityModule.mountCommunity(app.querySelector('[data-community-root]'),state,{initialScreen:communityScreen,mission:missionForCommunity(state),onMissionUsed:()=>commit({type:'mission-shared'})});
  void mountMapCharacter();
  updatePassagePlayback();
  if(pendingPractice())disposePractice=practiceModule.mountPractice(app,state,view,{play:(entry,onError)=>player.play(entry,true,onError),stop:()=>player.stop(),onAnswer:correct=>learningTracker.answer(correct),advance:finishPracticeStep});
  if(!completedKind&&!pendingPractice()&&view==='basic'&&basicProgress(state,state.basics.active).phase==='write')disposePractice=practiceModule.mountPractice(app,basicModule.basicWritingState(state),'basic',{play:(entry,onError)=>player.play(entry,true,onError),stop:()=>player.stop(),advance:()=>{player.stop();commit({type:'basic-next'});if(basicProgress(state,state.basics.active).phase==='done')completedKind='basic';render(true);if(!completedKind&&!pendingPractice())speakBasic();}});
  if(!completedKind&&!pendingPractice()&&view === "korean")disposeKoreanWriting=koreanModule.mountKoreanWriting(app);
  if(view==='expert'&&expertProgress(state).phase==='speak')disposeSpeaking=expertModule.mountExpertSpeaking(app,{stop:()=>player.stop(),advance:()=>{commit({type:'expert-next'});render(true);}});
  if(!pendingPractice()&&view==='scenario'&&scenarioProgress(state).phase==='speak')disposeSpeaking=scenarioModule.mountScenarioSpeaking(app,{stop:()=>player.stop(),advance:()=>{commit({type:'scenario-speak-next'});render(true);speakScenario();}});
  if(!pendingPractice()&&view==='sentence'&&sentenceProgress(state).phase==='speak')disposeSpeaking=sentenceModule.mountSentenceSpeaking(app,{stop:()=>player.stop(),advance:()=>{commit({type:'sentence-speak-next'});render(true);speakSentence();}});
  if(!pendingPractice()&&view==='korean'&&koreanProgress(state,state.korean.active).phase==='speak')disposeSpeaking=koreanModule.mountKoreanSpeaking(app,{stop:()=>player.stop(),advance:()=>{commit({type:'korean-speak-next'});render(true);speakKorean();}});
  if (!completedKind&&!pendingPractice()&&view === "kana") {
    disposeWriting = kanaModule.mountWriting(app);
    disposeMatching = kanaModule.mountMatching(app, ({keyboard,...action})=>{
      commit(action);render();
      if(keyboard)app.querySelector('.kana-match-node:not(:disabled), [data-action="kana-next"]')?.focus({preventScroll:true});
    });
  }
  if(!completedKind&&!pendingPractice()&&view==='labels')disposeMatching=labelsModule.mountMatching(app,({keyboard,...action})=>{commit({...action,type:'labels-match'});if(state.labels.phase==='summary'){navigate('listening');return;}render();if(keyboard)app.querySelector('.kana-match-node:not(:disabled), [data-action="labels-next"]')?.focus({preventScroll:true});});
  if (scroll) window.scrollTo(0, 0);
  else if (focus?.action)
    app
      .querySelector(
        `[data-action="${focus.action}"]${focus.id ? `[data-id="${focus.id}"]` : ""}`,
      )
      ?.focus({ preventScroll: true });
}
async function openPanel(kind, id) {
  disposePractice?.();disposePractice=null;
  player.stop();
  if (!panel.open) panelTrigger = document.activeElement;
  panelKind = kind;
  panel.classList.toggle("settings-panel", kind === "settings");
  const { renderPanel } = await import(kind === "kana-chart" ? (state.courseDirection === "ja-ko" ? "./korean-chart.js" : "./kana-chart.js") : "./panels.js");
  panel.innerHTML = renderPanel(kind, state, kind === "settings" ? "learning" : id);
  showSheet(panel);
  panel.querySelector(kind === "settings" ? "#panel-title" : "button, select, input")?.focus({ preventScroll: true });
}
function closePanel() {
  closeSheet(panel);
  if(pendingPractice()||(view==='basic'&&basicProgress(state,state.basics.active).phase==='write'))render();
  panelKind = "";
  if (panelTrigger?.isConnected) panelTrigger.focus({ preventScroll: true });
  else app.querySelector('[data-action="settings"]')?.focus({ preventScroll: true });
}
async function finishPracticeStep(){
 const key=practiceModule.practiceKey(state,view),previous=practiceModule.practiceState(state,view);if(!previous)return;
 const analyticsBefore=learningSnapshot(state,view);
 player.stop();const progress=advancePractice(previous,practiceRoundCount(key),practiceHasWriting(key)),kind=view;
 if(progress){state={...state,practices:{...state.practices,[key]:progress}};learningTracker.transition(analyticsBefore,learningSnapshot(state,view));if(!blocked)storageError=save(storage,state);render(true);return;}
 const practices={...state.practices};delete practices[key];state=reduce({...state,practices},previous.action);
 state=recordStudyCompletion(state,analyticsBefore,learningSnapshot(state,view));
 learningTracker.transition(analyticsBefore,learningSnapshot(state,view));
 if(!blocked)storageError=save(storage,state);
 completedKind=kind;render(true);
 disposeCompletionSound=practiceModule.playIntroductionCompletionSound(state,kind);
 app.querySelector('.practice-complete h1')?.focus({preventScroll:true});
}
function hasNextLesson(kind){
 if(kind==='kana'||kind==='labels'||kind==='listening')return true;
 if(kind==='basic')return true;
 if(kind==='korean')return Boolean(followingKorean(state.korean.active));
 if(kind==='reading')return selectedLevel(state)===5;
 if(kind==='sentence')return sentenceLessons.findIndex(l=>l.id===sentenceId(state))<sentenceLessons.length-1;
 return false;
}
async function nextCompletedLesson(){
 const kind=completedKind;if(!kind)return;
 try{
  if(kind==='sentence'&&sentenceLessons.findIndex(l=>l.id===sentenceId(state))<sentenceLessons.length-1){commit({type:'sentence-start',id:sentenceLessons[sentenceLessons.findIndex(l=>l.id===sentenceId(state))+1].id});navigate('sentence');return;}
  if(kind==='reading'&&selectedLevel(state)===5){commit({type:'level',value:6});await loadReading();commit({type:'reading-start'});navigate('reading');return;}
  if(kind==='basic'&&state.basics.active===6){commit({type:'level',value:2});await loadPractice('play');commit({type:'start'});navigate('play');return;}
  if(kind==='basic'&&followingBasic(state.basics.active)){commit({type:'basic-start',id:followingBasic(state.basics.active)});navigate('basic');return;}
  if(kind==='basic'){await loadSentences();commit({type:'level',value:2});commit({type:'sentence-start',id:sentenceLessons[0].id});navigate('sentence');return;}
  if(kind==='korean'&&state.korean.active==='1-10'){commit({type:'level',value:2});commit({type:'korean-start',id:'3-1'});navigate('korean');return;}
  if(kind==='korean'){const id=state.korean.active,next=followingKorean(id);if(next){commit({type:'korean-start',id:next.id});navigate('korean');return;}}
  if(kind==='kana'){if(state.kana.active<kanaLessons.length-1){commit({type:'kana-start',lesson:state.kana.active+1});navigate('kana');}else{await loadBasics();await loadPractice('basic');commit({type:'basic-start',id:7});navigate('basic');}return;}
  if(kind==='labels'){await loadPractice('listening');navigate('listening');return;}
  if(kind==='listening'){await loadBasics();await loadPractice('basic');commit({type:'basic-start',id:6});navigate('basic');return;}
  navigate('home');
 }catch{navigate('home');}
}
async function handle(event) {
  const el = event.target.closest("[data-action]");
  if (!el || el.disabled) return;

  const a = el.dataset.action,
    id = el.dataset.id;
  flushDraft();
  if(a==='study-review'){
    if(entryBusy)return;entryBusy=true;el.disabled=true;
    try{await loadStudy();navigate('study');}
    catch{toast=t('복습을 불러오지 못했어요. 다시 눌러 주세요.');render();}finally{entryBusy=false;if(el.isConnected)el.disabled=false;}return;
  }
  if(a==='study-lesson'){
    if(view!=='study'||entryBusy)return;
    const lesson=studyItems.find(l=>l.key===id);if(!lesson?.completed)return;
    commit({type:'level',value:lesson.level});
    const target=document.createElement('button');target.dataset.action=lesson.kind;target.dataset.id=lesson.id;
    await handle({target});return;
  }
  if(a==='song'){
    if(entryBusy||!songLesson(state,id))return;entryBusy=true;el.disabled=true;
    try{await loadSong();commit({type:'song-start',id});navigate('song');}catch{toast=t('학습을 불러오지 못했어요. 다시 눌러 주세요.');render();}finally{entryBusy=false;if(el.isConnected)el.disabled=false;}return;
  }
  if(a.startsWith('song-')){if(view!=='song')return;const before=state;commit(a==='song-restart'?{type:'song-start',restart:true}:{type:a,id});render(a!=='song-select'&&a!=='song-check');disposeCompletionSound=songModule.playSongFeedback(app,before,state);return;}
  if(a==='video'){
    if(entryBusy||!videoLesson(state,id))return;entryBusy=true;el.disabled=true;
    try{await loadVideo();commit({type:'video-start',id});navigate('video');}catch{toast='학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}finally{entryBusy=false;if(el.isConnected)el.disabled=false;}return;
  }
  if(a.startsWith('video-')){if(view!=='video')return;const before=state;commit(a==='video-restart'?{type:'video-start',restart:true}:{type:a,id});render(a!=='video-select'&&a!=='video-check');disposeCompletionSound=videoModule.playVideoSceneFeedback(app,before,state);return;}
  if(a==='analytics-consent'){const {askAnalyticsConsent}=await import('./analytics-consent.js');closePanel();await askAnalyticsConsent(state);openAnalytics(state);learningTracker.enter(learningSnapshot(state,view));return;}
  if(a==='audio-downloads'){player.stop();const {openAudioDownloads}=await import('./audio-download-ui.js');await openAudioDownloads(state);return;}
  if(a==='lesson-kanji'){el.disabled=true;player.stop();try{const {openLessonKanji}=await import('./lesson-kanji.js');await openLessonKanji(id,{trigger:el});}catch{toast='한자 학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}finally{if(el.isConnected)el.disabled=false;}return;}
  if(a==='passage-pause'){if(player.state==='paused')void player.resume();else player.pause();return;}
  if(a==='completed-next'){el.disabled=true;if(view==='song'&&songProgress(state).phase==='done'||view==='video'&&videoProgress(state).phase==='done'||view==='scenario'&&scenarioProgress(state).phase==='done'||view==='expert'&&expertProgress(state).phase==='done'){navigate('home');return;}await nextCompletedLesson();return;}
  if(a==='practice-resume'){
    const saved=currentPracticeKey();
    if(!saved)return;const [,kind,lesson]=saved.split(':'),trigger=document.createElement('button');trigger.dataset.action=kind;if(['kana','basic','korean','reading','sentence','scenario','video'].includes(kind))trigger.dataset.id=lesson;await handle({target:trigger});return;
  }
  const entryKind=[...practiceKinds,'scenario','expert'].includes(a)?a:a==='kana-continue'||a==='kana-restart'?'kana':a==='labels-restart'?'labels':a==='sentence-restart'?'sentence':null;
  if(entryKind){if(entryBusy)return;el.disabled=true;try{await loadPractice(entryKind==='expert'?'reading':entryKind);}catch{el.disabled=false;toast=t('학습을 불러오지 못했어요. 다시 눌러 주세요.');render();return;}el.disabled=false;}
  if(entryKind&&[...practiceKinds,'scenario','expert','kana-continue'].includes(a)){
    if(entryBusy)return;entryBusy=true;
    try{
      const target=lessonSession.entryState(state,entryKind,id);
      if(lessonSession.shouldOfferResume(target,entryKind)){
        player.stop();const choice=await lessonSession.askResume(japaneseLessonUI(state));
        if(!choice)return;
        if(choice==='restart'){state=lessonSession.restartLesson(target,entryKind);if(!blocked)storageError=save(storage,state);}
      }
    }finally{entryBusy=false;}
  }
  if(a==='pronunciation'){
    if(state.courseDirection!=='ja-ko')return;
    el.disabled=true;
    try{const {openPronunciation}=await import('./korean-pronunciation.js');await openPronunciation(id,{trigger:el,stop:()=>player.stop(),play:(entry,onError)=>{if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});return player.play(entry,true,onError);}});}
    catch{toast='発音ガイドを開けませんでした。もう一度お試しください。';render();}
    finally{el.disabled=false;}return;
  }
  if(a==='guide'){player.stop();window.location.assign('setup.html#guide');return;}
  if(a==='expert'){
    if(selectedLevel(state)!==7)return;el.disabled=true;
    try{await loadExpert();commit({type:'expert-start',id:id??0});navigate('expert');}
    catch{toast='학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}
    finally{el.disabled=false;}return;
  }
  if(a.startsWith('expert-')){
    if(view!=='expert')return;
    if(a==='expert-audio'){if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});speakExpert(true);return;}
    const before=expertProgress(state),moving=['expert-next','expert-previous'].includes(a);
    if(moving){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();}
    commit({type:a,id});const after=expertProgress(state);render(moving&&(before.phase!==after.phase||before.index!==after.index||before.sentence!==after.sentence||before.part!==after.part));return;
  }
  if(a==='scenario'){
    if(!scenarioLessons.some(l=>l.id===id&&l.level===courseGroup(selectedLevel(state))))return;
    el.disabled=true;
    try{await loadScenario();commit({type:'scenario-start',id});navigate('scenario');}
    catch{toast=t('학습을 불러오지 못했어요. 다시 눌러 주세요.');render();}return;
  }
  if(a.startsWith('scenario-')){
    if(view!=='scenario')return;
    if(a==='scenario-audio'){if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});speakScenario(id);return;}
    const choiceAudio=a==='scenario-select'&&el.dataset.choiceAudio?el.dataset.choiceAudio:null;
    if(choiceAudio&&!state.settings.sound)commit({type:'setting',key:'sound',value:true});
    const tokenAudio=a==='scenario-token'?scenarioModule?.currentScenarioTokenAudio(state,id):null;
    const moving=['scenario-next','scenario-previous'].includes(a);
    if(moving)player.stop();commit({type:a,id});render(moving);if(choiceAudio)speakScenario(choiceAudio);if(tokenAudio)void player.play(tokenAudio,state.settings.sound,message=>{toast=message;render();},{rate:state.settings.audioRate??1});if(moving&&scenarioProgress(state).phase!=='speak')speakScenario();else if(a==='scenario-check'&&state.scenarioActive==='8'&&scenarioProgress(state).checked)speakScenario('reply');return;
  }
  if(a==='korean'){
    const lesson=id||nextKorean(state).id;if(state.courseDirection!=='ja-ko'||!koreanUnlocked(state,lesson))return;
    el.disabled=true;try{await loadKorean();commit({type:'korean-start',id:lesson});navigate('korean');}catch{toast='学習を読み込めませんでした。';render();}return;
  }
  if(a.startsWith('korean-')){
    if(view!=='korean'||state.courseDirection!=='ja-ko')return;
    if(a==='korean-clear')return;
    if(a==='korean-stop'){player.stop();return;}
    if(a==='korean-intro-audio'){if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});speakKoreanIntro();return;}
    if(['korean-audio','korean-example-audio'].includes(a)){if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});const entry=a==='korean-example-audio'?koreanModule.koreanExampleAudio(state):koreanModule.koreanAudio(state);if(entry)void player.play(entry,true,()=>{},{rate:entry?.playbackRate??state.settings.audioRate??1});return;}
    const moving=['korean-next','korean-check','korean-previous'].includes(a);
    if(moving){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();}
    if(a==='korean-next'&&koreanProgress(state,state.korean.active).phase==='write')koreanModule.clearKoreanDraft(state);
    const before=koreanProgress(state,state.korean.active).index;
    commit({type:a,id});
    const progress=koreanProgress(state,state.korean.active);
    if(progress.phase==='done'){
      if(koreanStageZero(state.korean.active)){completedKind='korean';render(true);return;}
      const next=followingKorean(state.korean.active);
      if(next){commit({type:'korean-start',id:next.id});navigate('korean');}else navigate('home');return;
    }
    render(moving&&!(a==='korean-check'&&progress.retry));if(moving&&progress.phase!=='speak'&&(before!==progress.index||a==='korean-next'))speakKorean();return;
  }
  if(a==='kana-chart-switch'){
    if(panelKind!=='kana-chart')return;
    const {switchChart}=await import(state.courseDirection==='ja-ko'?'./korean-chart.js':'./kana-chart.js');switchChart(panel,state,id);return;
  }
  if(a==='kana-chart'){el.focus({preventScroll:true});await openPanel('kana-chart',id);return;}
  if(a==='map-locate'){
   const target=app.querySelector('.map-choice[aria-current="step"]');
   if(target){const motion=state.settings.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;target.focus({preventScroll:true});target.scrollIntoView({block:'center',behavior:motion?'smooth':'instant'});}
   return;
  }
  if(a==='basic'){
   const lesson=Number(id||nextBasic(state));if(!basicUnlocked(state,lesson))return;
   el.disabled=true;try{await loadBasics();commit({type:'level',value:basicLevel(lesson)});commit({type:'basic-start',id:lesson});navigate('basic');}catch{toast='학습을 불러오지 못했어요.';render();}return;
  }
  if(a.startsWith('basic-')){
   if(view!=='basic')return;
   if(a==='basic-audio'){if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});speakBasic();return;}
   const moving=['basic-next','basic-check','basic-previous'].includes(a);
   if(moving){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();}
   commit({type:a,id});const lesson=state.basics.active;
   if(basicProgress(state,lesson).phase==='done'){if(basicSinglePass(lesson)){completedKind='basic';render(true);return;}if(lesson>=7&&lesson<10){commit({type:'basic-start',id:lesson+1});navigate('basic');}else navigate('home');return;}
   render(moving&&!(a==='basic-check'&&basicProgress(state,lesson).retry));if(moving&&basicProgress(state,lesson).phase==='learn')speakBasic();return;
  }
  if(a==='reading'){
   if(id!==undefined&&[5,6,7].includes(Number(id)))commit({type:'level',value:Number(id)});
   if(![5,6,7].includes(selectedLevel(state)))return;
   el.disabled=true;try{await loadReading();commit({type:'reading-start'});navigate('reading');}catch{toast=japaneseLessonUI(state)?'読み込めませんでした。もう一度お試しください。':'학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a.startsWith('reading-')){
   if(view!=='reading')return;
   if(a==='reading-audio'){if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});speakReading();return;}
   if(a==='reading-stop'){player.stop();return;}
   const previousAudio=readingModule.currentReadingAudio(state)?.id;
   const advancing=['reading-next','reading-previous','reading-check'].includes(a);
   if(advancing){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;}
   commit({type:a,id});if(readingProgress(state,selectedLevel(state)).phase==='done'){try{await showMap();}catch{navigate('home');}return;}render(advancing&&!(a==='reading-check'&&readingProgress(state,selectedLevel(state)).retry));if(previousAudio!==readingModule.currentReadingAudio(state)?.id){player.stop();speakReading();}return;
  }
  if(a==='dialogue'){
   el.disabled=true;try{await loadDialogue();commit({type:'dialogue-start'});navigate('dialogue');}catch{toast='대화 학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a.startsWith('dialogue-')){
   if(view!=='dialogue')return;
   if(a==='dialogue-audio'){if(!state.settings.sound){commit({type:'setting',key:'sound',value:true});render();}void player.play(dialogueModule.dialogueAudio[id],state.settings.sound,message=>{toast=message;render();});return;}
   const advancing=['dialogue-next','dialogue-previous','dialogue-check'].includes(a);
   if(advancing){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();}
   commit({type:a,id});if(state.dialogue.phase==='done'){try{await showMap();}catch{navigate('home');}return;}render(advancing&&!(a==='dialogue-check'&&state.dialogue.feedback));if(advancing&&!state.dialogue.feedback)speakDialogue();return;
  }
  if(a==='listening'){
   if(!listeningUnlocked(state))return;
   el.disabled=true;
   try{await loadLabels();commit({type:'level',value:2});commit({type:'listening-start'});navigate('listening');}
   catch{toast='학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a==='listening-audio'){if(view!=='listening')return;if(!state.settings.sound){commit({type:'setting',key:'sound',value:true});render();}speakListening();return;}
  if(a==='listening-answer'){
   if(view!=='listening')return;
   const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();
   commit({type:a,id});
   if(state.listening.index===4){try{await loadBasics();commit({type:'basic-start',id:6});navigate('basic');}catch{navigate('home');}return;}
   render(true);speakListening();return;
  }
  if(a==='labels'||a==='labels-restart'){
   if(!labelsUnlocked(state))return;
   el.disabled=true;
   try{await loadLabels();commit({type:'level',value:2});commit({type:a==='labels-restart'?'labels-restart':'labels-start'});navigate(state.labels.phase==='summary'?'listening':'labels');}
   catch{toast='단어 학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a.startsWith('labels-')){
   if(view!=='labels')return;
   if(a==='labels-audio'){if(!state.settings.sound){commit({type:'setting',key:'sound',value:true});render();}speakLabels();return;}
   const advancing=a==='labels-next'||a==='labels-check';
   if(advancing){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();}
   commit({type:a,id});if(state.labels.phase==='summary'){navigate('listening');return;}render(advancing);if(advancing)speakLabels();return;
  }
  if(['community','community-profile','community-inbox'].includes(a)){el.disabled=true;try{await loadCommunity();communityScreen=a==='community-profile'?'profile':a==='community-inbox'?'inbox':'feed';if(panel.open)closePanel();navigate('community');}catch{toast=state.courseDirection==='ja-ko'?'交流を読み込めませんでした。':'커뮤니티를 불러오지 못했어요.';render();}return;}
  if(a==='growth'||a==='mission'){
    el.disabled=true;
    try{await loadGrowth(a);}catch{toast=uiText('화면을 불러오지 못했어요. 다시 눌러 주세요.','画面を読み込めませんでした。もう一度押してください。');render();return;}
    growthScreen='overview';growthNotice='';growthError='';growthPending=undefined;missionError='';missionPending=undefined;
    navigate(a);return;
  }
  if(a==='growth-write'||a==='growth-cancel'){
    if(view!=='growth')return;
    growthScreen=a==='growth-write'?'write':'overview';growthNotice='';growthError='';growthPending=undefined;
    render(true);if(a==='growth-write')app.querySelector('#growth-answer')?.focus({preventScroll:true});return;
  }
  if(a==='growth-save'){
    if(view!=='growth')return;
    const text=app.querySelector('#growth-answer')?.value??'';
    saveWriting({type:'growth-save',text,completed:recordsModule.completedLessons(state).length},{
      onSaved:()=>{growthScreen='overview';growthPending=undefined;growthError='';growthNotice=uiText('답을 저장했어요.','答えを保存しました。');},
      onFailed:reason=>{growthPending=text;growthError=reason==='empty'?uiText('답을 입력해 주세요.','答えを入力してください。'):uiText('저장하지 못했어요. 쓴 답은 화면에 남아 있어요. 저장 공간을 확인한 뒤 다시 눌러 주세요.','保存できませんでした。書いた答えは画面に残っています。保存領域を確認してから、もう一度押してください。');},
    });
    render(true);return;
  }
  if(a==='mission-save'||a==='mission-edit'||a==='mission-discard'){
    if(view!=='mission')return;
    if(a==='mission-discard'&&!confirm(uiText('쓰던 문장을 지우고 새 미션을 받을까요?','書きかけの文を消して、新しいミッションを受け取りますか？')))return;
    const text=app.querySelector('#mission-answer')?.value??'';
    saveWriting(a==='mission-save'?{type:a,text,lessonKey:el.dataset.lessonKey,lessonOn:el.dataset.lessonOn}:{type:a},{
      onSaved:()=>{missionPending=undefined;missionError='';},
      onFailed:reason=>{missionPending=a==='mission-save'?text:undefined;missionError=reason==='empty'?uiText('문장을 입력해 주세요.','文を入力してください。'):uiText('저장하지 못했어요. 쓴 문장은 화면에 남아 있어요. 저장 공간을 확인한 뒤 다시 눌러 주세요.','保存できませんでした。書いた文は画面に残っています。保存領域を確認してから、もう一度押してください。');},
    });
    render(true);return;
  }
  if(a==='mission-community'){
    if(view!=='mission')return;
    el.disabled=true;
    try{await loadCommunity();}catch{toast=uiText('교류를 불러오지 못했어요. 다시 눌러 주세요.','交流を読み込めませんでした。もう一度押してください。');render();return;}
    communityScreen='compose';navigate('community');return;
  }
  if(a==='my') {
    el.disabled=true;
    try { await loadRecords(); navigate('my'); }
    catch { toast='학습 기록을 불러오지 못했어요. 다시 눌러 주세요.';render(); }
    return;
  }
  if(a==='record-month'||a==='record-day') {
    if(a==='record-month') {
      recordOffset=Math.min(0,recordOffset+Number(id));
      const now=new Date(),date=new Date(now.getFullYear(),now.getMonth()+recordOffset,1);
      recordSelected=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;
    } else recordSelected=id;
    render();return;
  }
  if (a === "setup") { await openPanel("settings"); return; }
  if (a === "stories") {
    try {
      el.disabled = true;
      await showMap();
    } catch {
      el.disabled = false;
      toast = "학습 지도를 불러오지 못했어요. 다시 눌러 주세요.";
      render();
    }
    return;
  }
  if (a === 'sentence' || a === 'sentence-restart' || a === 'sentence-review' || (a === 'review' && selectedLevel(state) === 2)) {
    el.disabled=true;
    try {
      await loadSentences();
      if(a==='sentence-review'||a==='review') navigate('review');
      else {commit({type:a==='sentence-restart'?'sentence-restart':'sentence-start',id:a==='sentence-restart'?sentenceId(state):Number(id??nextSentence(state))});navigate('sentence');}
    } catch {toast='문장 학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}
    return;
  }
  if (a === 'sentence-audio') {
    await player.play(sentenceModule.sentenceAudioEntry(state,id),state.settings.sound,message=>{toast=message;render();});return;
  }
  if (a.startsWith('sentence-')) {
    if(view!=='sentence') return;
    const moves=['sentence-next','sentence-previous','sentence-submit'].includes(a)||(a==='sentence-check'&&sentenceId(state)===3);
    if(moves) {const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;}
    player.stop();commit({type:a,id});render(moves);
    if(moves)speakSentence();
    return;
  }
  if (["home", "review", "my"].includes(a)) {
    navigate(a);
    return;
  }
  if (a === "kana" || a === "kana-restart" || a === "kana-continue" || (a === "play" && selectedLevel(state) === 0)) {
    el.disabled = true;
    try {
      await loadKana();
      commit({type:'level',value:0});
      commit({ type: a === "kana-restart" ? "kana-restart" : "kana-start", ...(id !== undefined ? { lesson: Number(id) } : {}) });
      navigate("kana");
    } catch {
      el.disabled = false;
      toast = "글자 학습을 불러오지 못했어요. 다시 눌러 주세요.";
      render();
    }
    return;
  }
  if (a === "voice-help") {
    await player.stop();
    try {
      const result = await checkJapaneseVoice(true);
      if (result.highQuality === null) { toast = "이 환경에서는 음성 품질을 확인할 수 없어요. 기기 TTS 설정을 확인해 주세요."; render(); }
    } catch { toast = "음성 정보를 확인하지 못했어요. 다시 시도해 주세요."; render(); }
    return;
  }
  if (a === "kana-audio") {
    if (!state.settings.sound) commit({ type: "setting", key: "sound", value: true });
    render(); speakKana(); return;
  }
  if (a === "letter-audio") {
    const letter = kanaLetters.find(l => l.id === id);
    if (!letter) return;
    if (!state.settings.sound) commit({ type: "setting", key: "sound", value: true });
    const { kanaLetterAudio } = await import("./kana-audio.js");
    await player.play(kanaLetterAudio(letter), true, message => { toast = message; render(); });
    return;
  }
  if (a === "kana-help" || a === "kana-next" || a === "kana-previous" || a === "kana-answer" || a === "kana-solve" || a === "kana-quiz-restart") {
    if (view !== "kana") return;
    if (a === "kana-next" || a === "kana-previous") {
      const now = performance.now();
      if (now - lastAdvance < 450) return;
      lastAdvance = now;
      player.stop();
    }
    commit({type: a, id}); render(a === "kana-next" || a === "kana-previous");
    if (a === "kana-next" || a === "kana-previous" || a === "kana-quiz-restart" || a === "kana-help") speakKana();
    return;
  }
  if (a === "play") {
    commit({ type: "start" });
    navigate("play");
    return;
  }
  if (a === "next" || a === "previous-lesson") {
    const now = performance.now();
    if (now - lastAdvance < 450) return;
    lastAdvance = now;
    player.stop();
    commit({ type: a });
    render(true);
    speakEpisodeAudio();
    return;
  }
  if (a === "select") {
    commit({ type: "select", id });
    render();
    return;
  }
  if (a === "submit") {
    commit({ type: "submit" });
    render(state.episode.solved);
    return;
  }
  if (a === "clue") {
    commit({ type: "clue", id });
    render();
    await openPanel("clue", id);
    return;
  }
  if (a === "transfer") {
    commit({ type: "transfer", id });
    render();
    return;
  }
  if (
    a === "settings" ||
    a === "restart"
  ) {
    await openPanel(a);
    return;
  }
  if (a === "close") {
    closePanel();
    return;
  }
  if (a === "confirm-restart") {
    commit({ type: "restart" });
    closePanel();
    navigate("play");
    return;
  }
  if (a === "reset") {
    if (!(await confirmReset())) return;
    try {
      reset(storage);
      analytics.setConsent(false);
      state = freshState();
      blocked = false;
      storageError = "";
      closePanel();
      window.location.replace("index.html");
    } catch {
      toast = "저장소에 접근할 수 없어 초기화하지 못했어요.";
      render();
    }
    return;
  }
  if (a === "export") {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY) || JSON.stringify(state);
    } catch {
      raw = JSON.stringify(state);
    }
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "seodang-prototype-record.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (a === "audio") {
    await player.play(audioManifest[id], state.settings.sound, (message) => {
      toast = message;
      render();
    });
  }
}
// After any answer check, bring the new feedback into view on small screens.
const checkActions=/-(check|confirm|submit)$/;
function revealFeedback(){
  const target=[...app.querySelectorAll('main [role="status"], main .intent-result, main .repair-result')].find(el=>!el.classList.contains('sr-only')&&el.textContent.trim()&&el.getClientRects().length);
  if(!target)return;
  const rect=target.getBoundingClientRect(),top=app.querySelector('.app-header')?.getBoundingClientRect().bottom??0;
  if(rect.top>=top&&rect.bottom<=innerHeight)return;
  const motion=state.settings.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({block:'nearest',behavior:motion?'smooth':'instant'});
}
app.addEventListener("click", async event => {
  const action=event.target.closest?.("[data-action]")?.dataset.action;
  await handle(event);
  if(action&&checkActions.test(action))revealFeedback();
});
panel.addEventListener("click", event => {
  if (event.target === panel) {
    const rect = panel.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      closePanel();
      return;
    }
  }
  handle(event);
});
panel.addEventListener('keydown',event=>{
 const tab=event.target.closest('[data-action="kana-chart-switch"]');
 if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const tabs=[...panel.querySelectorAll('[role="tab"]')];
 const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(tabs.indexOf(tab)+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 tabs[next].click();
});
panel.addEventListener("cancel", (event) => {
  event.preventDefault();
  closePanel();
});
panel.addEventListener("change", async (event) => {
  const el = event.target,
    key = el.dataset.setting;
  if(key==='course'){
    if(!developmentMode)return;
    const request=++courseRequest,direction=el.value;
    try{await loadUILanguage({courseDirection:direction});}catch{if(request===courseRequest)el.value=state.courseDirection;return;}
    if(request!==courseRequest)return;
    player.stop();commit({type:'course',value:direction});
    if(!state.levelGuideSeen?.[`${direction}:${selectedLevel(state)}`]){window.location.assign('setup.html#guide');return;}
    view='home';toast='';render(true);
    const {renderPanel}=await import('./panels.js');panel.innerHTML=renderPanel('settings',state,'learning');panel.querySelector('[data-setting=course]')?.focus();return;
  }
  if (key === "difficulty") {
    player.stop();
    commit({ type: "level", value: Number(el.value) });
    view = "home";
    toast = "";
    render(true);
    const {renderPanel}=await import('./panels.js');panel.innerHTML=renderPanel('settings',state,'learning');panel.querySelector('[data-setting=difficulty]')?.focus();
    return;
  }
  if (key) {
    player.stop();
    commit({
      type: "setting",
      key,
      value:
        el.type === "checkbox"
          ? el.checked
          : key === "textScale"
            ? Number(el.value)
            : el.value,
    });
    render();
  }
});
window.addEventListener("pagehide", () => {flushDraft();clearMapCharacter();disposeSpeaking?.();disposePractice?.();disposeCompletionSound?.();player.stop();});
window.addEventListener("pageshow",event=>{if(event.persisted){if(pendingPractice())render();else void mountMapCharacter();}});
document.addEventListener("visibilitychange", () => { if (document.hidden) {flushDraft();player.stop();} else openAnalytics(state); });
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    blocked = true;
    storageError =
      "다른 탭에서 기록이 바뀌었어요. 충돌을 막기 위해 저장을 멈췄어요. 새로고침하면 최신 기록을 불러옵니다.";
    render();
  }
});
if (enteringCase && selectedLevel(state) === 2) {
  try {await loadSentences();commit({type:'sentence-start'});} catch {view='home';toast='문장 학습을 불러오지 못했어요. 다시 눌러 주세요.';}
}
if(enteringCase && selectedLevel(state)===7){try{await loadExpert();commit({type:'expert-start',id:state.expertActive??0});}catch{view='home';toast='학습을 불러오지 못했어요.';}}
if(enteringCase && [5,6].includes(selectedLevel(state))){try{await loadReading();commit({type:'reading-start'});}catch{view='home';toast='학습을 불러오지 못했어요.';}}
if(enteringCase && selectedLevel(state)===4){try{await loadDialogue();commit({type:'dialogue-start'});}catch{view='home';toast='대화 학습을 불러오지 못했어요. 다시 눌러 주세요.';}}
if(enteringCase&&practiceKinds.includes(view)){try{await loadPractice(view);}catch{view="home";}}
if(!needsKoreanGuide)render();
if(enteringCase&&(view==='expert'||practiceKinds.includes(view)))void import('./audio-download-ui.js').then(m=>m.prefetchLesson(state,view,message=>{toast=message;render();}));
if(enteringCase && view==='reading')speakReading();
else if(enteringCase && view==='dialogue')speakDialogue();
else if (enteringCase && view==='sentence') speakSentence();
else if (enteringCase && view==='play') speakEpisodeAudio();

app.addEventListener('input',event=>{
 const field=event.target;if(!field.matches?.('[data-growth-draft],[data-mission-draft]'))return;
 const growthField=field.matches('[data-growth-draft]');
 if(growthField)growthPending=field.value;else missionPending=field.value;
 const count=app.querySelector('[data-growth-count]');if(count)count.textContent=`${field.value.length} / ${field.maxLength}`;
 const save=app.querySelector(growthField?'[data-action="growth-save"]':'[data-action="mission-save"]');if(save)save.disabled=!field.value.trim();
 clearTimeout(draftTimer);draftTimer=setTimeout(flushDraft,400);
});
app.addEventListener('input',event=>{const input=event.target;if(!input.matches('[data-audio-rate]'))return;const rate=Number(input.value);commit({type:'setting',key:'audioRate',value:rate});player.setRate(rate);const output=input.closest('.passage-speed').querySelector('[data-audio-rate-label]');const label=`${rate===1?output.dataset.normalLabel+' ':''}${rate.toFixed(1)}×`;output.textContent=label;input.setAttribute('aria-valuetext',label);});

if(state.onboarded&&!needsKoreanGuide){
 openAnalytics(state);learningTracker.enter(learningSnapshot(state,view));
 if(analytics.consent===null&&view==='home'){const {askAnalyticsConsent}=await import('./analytics-consent.js');await askAnalyticsConsent(state);openAnalytics(state);}
}
