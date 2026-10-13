import {readingProgress} from './reading-state.js';
import {dialogueProgress} from './dialogue-state.js';
import {listeningProgress,listeningUnlocked} from './listening-state.js';
import {labelsUnlocked,labelsProgress} from "./labels-state.js";
import { sentenceProgress } from "./sentence-state.js";
import { showSheet, closeSheet } from "./sheet.js";
import { selectedLevel, kanaLetters, kanaLessons, normalizeKana, kanaSolvedCount } from "./kana-state.js";
import { renderHeader } from "./header.js";
import { episode, expressions } from "./content.js";
import { freshState, reduce, episodeAudioId } from "./engine.js";
import { load, save, reset, STORAGE_KEY } from "./storage.js";
import { assets, AudioPlayer, audioManifest, checkJapaneseVoice } from "./media.js";
import { icon, button, bag, expressionCard, expressionImage, audioButton, esc, homeCaseCard } from "./ui.js";
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
const enteringCase = window.location.hash === "#case" && [2,3,4,5,6,7].includes(selectedLevel(state));
if (enteringCase && selectedLevel(state) === 2 && !state.episode.started) {
  state = reduce(state, { type: "start" });
  if (!blocked) storageError = save(storage, state);
}
if (!state.onboarded && !enteringCase) window.location.replace("index.html");
let view = enteringCase ? (selectedLevel(state) >= 5 ? "reading" : selectedLevel(state) === 4 ? "dialogue" : selectedLevel(state) === 3 ? "sentence" : "play") : "home",
  panelKind = "",
  panelTrigger = null,
  lastAdvance = -Infinity,
  toast = "";
const player = new AudioPlayer();
const progress = () =>
  ({ intro: 0, learn: 1, investigate: 2, solved: 3, transfer: 4, summary: 5 })[
    state.episode.step
  ];
function commit(action) {
  state = reduce(state, action);
  if (!blocked) storageError = save(storage, state);
}
function navigate(next) {
  player.stop();
  view = next;
  toast = "";
  render(true);
  if (next === "play") speakEpisodeAudio();
  if (next === "kana") speakKana();
  if (next === "sentence") speakSentence();
  if (next === "labels") speakLabels();
  if(next==="listening")speakListening();
  if(next==="dialogue")speakDialogue();
  if(next==="reading")speakReading();
}
function speakEpisodeAudio() {
  if (view !== "play") return;
  const id = episodeAudioId(state);
  if (!id) return;
  void player.play(audioManifest[id], state.settings.sound, (message) => {
    toast = message;
    render();
  });
}
function top(title, back = true) {
  return renderHeader(title || "서당", { backAction: "home", backLabel: "학습 홈으로", backDisabled: !back, backHidden: !back });
}
function tabs() {
  return `<nav class="tabs" aria-label="주 메뉴">${[
    ["home", "book", "학습 홈"],
    ["stories", "cards", "학습 지도"],
    ["my", "leaf", "학습 기록"],
  ]
    .map(([id, i, t]) =>
      button(
        `${icon(i)}<span>${t}</span>`,
        id,
        view === id
          ? "tab active"
          : "tab",
        `aria-current="${view === id ? "page" : "false"}"`,
      ),
    )
    .join("")}</nav>`;
}
function caseCard() {
  const level = selectedLevel(state);
  if (level === 1) {
    const k = normalizeKana(state.kana), count = kanaSolvedCount(k);
    if(state.labels?.completed)return homeCaseCard({coverText:'かさ · ねこ',title:'1단계 · 듣고 사진 고르기',description:'배운 단어를 듣고 맞는 사진을 골라요.',action:'listening',actionLabel:listeningProgress(state).index===4?'다시 연습하기':'학습 이어하기'});
    if(k.lessons.every(l=>l.completed))return homeCaseCard({coverText:'かさ · ねこ',title:'1단계 · 그림에 이름표 붙이기',description:'배운 글자를 이어 단어를 읽어 봐요.',action:'labels',actionLabel:labelsProgress(state).completed?'단어 다시 연습하기':labelsProgress(state).started?'학습 이어하기':'학습 시작하기'});
    const next = k.lessons[k.active].phase === "summary" ? Math.max(0, k.lessons.findIndex(l => !l.caseSolved)) : k.active;
    const lesson = kanaLessons[next], progress = k.lessons[next];
    return homeCaseCard({coverText:lesson.letters.slice(0,5).map(l=>l.text).join(" "),title:`1단계 · ${lesson.caseTitle}`,description:`${lesson.rangeLabel} / 쓰기 · 읽기 · 카드 짝 맞추기`,action:"kana",actionLabel:count===kanaLessons.length?"글자 다시 연습하기":progress.started?"학습 이어하기":"학습 시작하기"});
  }
  if(level===3){const p=sentenceProgress(state);return homeCaseCard({image:assets.cafe.src,imageAlt:"카페",title:"3단계 · 가방 주인을 찾아요",description:"짧은 문장을 듣고 가방의 주인과 위치를 알아봐요.",action:p.phase==='summary'?"sentence-review":"sentence",actionLabel:p.phase==='summary'?"배운 문장 복습하기":p.started?"학습 이어하기":"학습 시작하기"});}
  if(level===4){const p=dialogueProgress(state);return homeCaseCard({image:assets.cafe.src,imageAlt:'カフェ',title:'4단계 · 카페에서 주문하기',description:'질문을 듣고 원하는 음료와 포장 여부를 말해요.',action:'dialogue',actionLabel:p.phase==='done'?'다시 학습하기':p.started?'학습 이어하기':'학습 시작하기'});}
  if(level>=5){const p=readingProgress(state,level),jp=level>=6;return homeCaseCard({image:assets.cafe.src,imageAlt:jp?'カフェ':'카페',title:level===7?'7 · 行間を聴く':jp?'6 · 読んで、考える':'5단계 · 글을 읽고 핵심 찾기',description:level===7?'音声から、含意・反語・論理を読み解きます。':jp?'文章を読んで、条件や理由を確かめましょう。':'안내문·메시지·의견 글에서 핵심 내용을 찾아요.',action:'reading',actionLabel:jp?(p.phase==='done'?'もう一度':p.started?'続ける':'始める'):(p.phase==='done'?'다시 학습하기':p.started?'학습 이어하기':'학습 시작하기')});}
  const complete=state.episode.step==='summary';
  return homeCaseCard({image:assets.cafe.src,imageAlt:'카페',title:'2단계 · 카페에 남겨진 가방',description:'색과 위치를 나타내는 일본어 표현을 배워요.',action:complete?'review':'play',actionLabel:complete?'배운 표현 복습하기':state.episode.started?'학습 이어하기':'학습 시작하기'});
}
let renderLearningMap, kanaModule, sentenceModule, sentenceStyles;
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
  const entry=sentenceModule.currentSentenceAudio(state);
  if(entry) void player.play(entry,state.settings.sound,message=>{toast=message;render();});
}
let labelsModule,labelsStyles;
async function loadLabels(){
 labelsModule ||= await import('./labels.js');
 if(!labelsStyles)labelsStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/labels.css';link.onload=resolve;link.onerror=()=>{link.remove();labelsStyles=null;reject(Error('Labels styles unavailable'));};document.head.append(link);});
 await labelsStyles;
}
let readingModule,readingStyles;
async function loadReading(){
 readingModule ||= await import('./reading.js');
 if(!readingStyles)readingStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/reading.css';link.onload=resolve;link.onerror=()=>{link.remove();readingStyles=null;reject(Error('Reading styles unavailable'));};document.head.append(link);});
 await readingStyles;
 await readingModule.prepareReading(selectedLevel(state));
}
function reading(){return readingModule.renderReading(state);}
function speakReading(){const entry=readingModule.currentReadingAudio(state);if(entry)void player.play(entry,state.settings.sound,()=>{toast='音声を再生できませんでした。もう一度お試しください。';render();});}
let dialogueModule,dialogueStyles;
async function loadDialogue(){
 dialogueModule ||= await import('./dialogue.js');
 if(!dialogueStyles)dialogueStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/dialogue.css';link.onload=resolve;link.onerror=()=>{link.remove();dialogueStyles=null;reject(Error('Dialogue styles unavailable'));};document.head.append(link);});
 await dialogueStyles;
}
function dialogue(){return dialogueModule.renderDialogue(state,top);}
function speakDialogue(){const entry=dialogueModule.currentDialogueAudio(state);if(entry)void player.play(entry,state.settings.sound,message=>{toast=message;render();});}
function listening(){return labelsModule.renderListening(state,top);}
function speakListening(){const entry=labelsModule.listeningAudio(state);if(entry)void player.play(entry,state.settings.sound,message=>{toast=message;render();});}
async function showMap(){
 ({renderLearningMap}=await import('./learning-map.js'));
 if(!mapStyles)mapStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/learning-map.css';link.onload=resolve;link.onerror=()=>{link.remove();mapStyles=null;reject(Error('Map styles unavailable'));};document.head.append(link);});
 await mapStyles;navigate('stories');
}
function labels(){return labelsModule.renderLabels(state,top);}
function speakLabels(){const entry=labelsModule.labelsAudio(state);if(entry)void player.play(entry,state.settings.sound,message=>{toast=message;render();});}
let kanaStyles, mapStyles;
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
  const entry = kanaModule.kanaAudio(state);
  if (entry) void player.play(entry, state.settings.sound, message => { toast = message; render(); });
}

function home() {
  return `${top("서당", false)}<main class="page home">${caseCard()}</main>${tabs()}`;
}
function stories() {
  return `${top("학습 지도")}<main class="page map-page">${renderLearningMap(state)}</main>${tabs()}`;
}
function review() {
  if (selectedLevel(state) === 3) return sentenceModule.renderSentenceReview(state,top,tabs);
  if (selectedLevel(state) === 1) {
    const learned = kanaLetters.filter(l => state.kana?.learned.includes(l.id));
    return `${top("배운 글자")}<main class="page notebook-page">${learned.length ? learned.map(l => `<article class="review-expression"><h2 lang="ja">${l.text}</h2><p>${l.reading}</p>${button(`${icon("sound")} 듣기`, "letter-audio", "text-button", `data-id="${l.id}"`)}</article>`).join('') : '<div class="empty-notebook"><h2>아직 배운 글자가 없어요.</h2></div>'}${button('글자 학습하기', 'kana')}</main>${tabs()}`;
  }
  const learned = expressions.filter((e) => state.encountered.includes(e.id));
  return `${top("배운 표현")}<main class="page notebook-page">${
    learned.length
      ? learned.map((e) => `<article class="review-expression">${expressionImage(e)}<h2 lang="ja">${esc(e.text)}</h2><p>${esc(e.meaning)}</p>${audioButton(`case01.${e.id}.ja`, state.settings.sound)}</article>`).join("")
      : `<div class="empty-notebook">${icon("cards")}<h2>아직 배운 표현이 없어요.</h2></div>`
  }${state.episode.step === "summary" ? button("다시 학습하기", "restart", "secondary") : button(learned.length ? "학습 이어하기" : "학습 시작하기", "play")}</main>${tabs()}`;
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
  return `<div class="scene"><img src="${assets.cafe.src}" alt="왼쪽 창문과 오른쪽 출입문이 있는 카페"><span class="scene-tag"><i></i> 골목의 작은 카페</span><div class="scene-caption">늦은 오후, 손님이 떠난 자리.</div></div>`;
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
    body = `${scene()}<section class="reading dialogue-slab"><span class="speaker">${episode.intro[0].speaker}</span><h2>색과 위치 표현을 배워요</h2><p class="dialogue">두 표현을 익힌 뒤, 손님이 찾는 가방을 골라 봐요.</p>${button(`표현 익히기 ${icon("arrow")}`, "next")}</section>`;
  if (e.step === "learn")
    body = `<section class="reading learning-sheet"><span class="eyebrow">표현 익히기 · ${e.lesson + 1} / 2</span><h1>${e.lesson ? "어디에 있을까요?" : "어떤 가방일까요?"}</h1>${expressionCard(expressions[e.lesson], { meaning: true, picture: true, compactAudio: true, showReading: true, sound: state.settings.sound, beginner: state.support === "beginner" })}<div class="button-pair">${button("이전", "previous-lesson", "secondary")}${button(e.lesson ? "메모 보기" : "다음", "next")}</div></section>`;
  if (e.step === "investigate")
    body = `${investigation()}<section class="reading investigation-slab"><div class="section-row"><h2>${e.selected?'이 가방이 맞을까요?':'메모와 같은 가방을 골라요'}</h2>${button(icon('help'),'hint','icon-button','aria-label="표현 도움 보기"')}</div>${e.feedback?`<div class="feedback" role="status">${esc(e.feedback)}</div>`:''}${button('확인하기','submit','primary',e.selected?'':'disabled')}</section>`;
  if (e.step === "solved")
    body = `${scene()}<section class="reading solved-slab"><span class="eyebrow">${icon("check")} 사건 해결</span><h1>가방이 주인을<br>찾았어요.</h1><blockquote>“맞아요, 이 가방이에요.<br>찾아 주셔서 정말 감사합니다!”<cite>가방을 찾으러 온 손님</cite></blockquote><div class="solution-explanation"><p><b lang="ja">あおい かばん</b>은 파란 가방,<br><b lang="ja">まどの そば</b>는 창문 가까이.<br>그래서 창문 옆의 파란 가방이 맞아요.</p></div>${button(`다른 자리에서도 찾아볼까요? ${icon("arrow")}`, "next")}</section>`;
  if (e.step === "transfer")
    body = `<section class="reading transfer-sheet"><span class="eyebrow">다른 상황에서 한 번 더</span><h1>이번엔 자리가<br>달라졌어요.</h1><p>아래 표현에 맞는 곳에 놓인 물건을 골라 주세요.</p><div class="transfer-prompt" lang="ja">${episode.transfer.prompt}</div>${transferScene()}${e.feedback ? `<div class="feedback ${e.transfer === "passed" ? "success" : ""}" role="status">${esc(e.feedback)}</div>` : ""}${e.transfer === "passed" ? button(`배운 표현 정리하기 ${icon("arrow")}`, "next") : ""}</section>`;
  if (e.step === "summary")
    body = `<section class="reading summary"><div class="summary-top"><span class="completion">${icon("check")}</span><h1>학습 완료</h1></div><div class="summary-scroll"><h2>배운 표현</h2><div class="summary-expressions">${expressions.map((x, i) => `<div><span class="expression-index">0${i + 1}</span><b lang="ja">${x.text}</b><span>${x.meaning}</span></div>`).join("")}</div></div><div class="case-complete-actions button-pair">${button("다시 풀기", "restart", "secondary")}${button("다음 사건으로", "stories", "primary", 'disabled aria-label="다음 사건으로, 준비 중입니다" title="다음 사건을 준비 중이에요"')}</div></section>`;
  return `${top("카페에 남겨진 가방")}<main class="play play-${e.step}">${e.step !== "intro" ? "" : `<div class="play-heading">${audioButton(episode.intro[0].audioId, state.settings.sound, "직원 말 다시 듣기")}</div>`}<div class="progress-heading"><span>${labels[progress()]}</span><ol class="steps" aria-label="사건 진행">${labels.map((l, i) => `<li class="${i <= progress() ? "filled" : ""}" ${i === progress() ? 'aria-current="step"' : ""}><span class="sr-only">${l}</span></li>`).join("")}</ol></div>${body}</main>`;
}
let disposeWriting,disposeMatching;
function render(scroll = false) {

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
  app.innerHTML = `<div class="shell view-${view}">${storageError ? `<aside class="storage-warning" role="status">${esc(storageError)}</aside>` : ""}${{ home, stories, review, my, play, kana, sentence, labels, listening, dialogue, reading }[view]()}${toast ? `<div class="toast" role="status">${esc(toast)}</div>` : ""}</div>`;
  if (view === "kana") {
    disposeWriting = kanaModule.mountWriting(app);
    disposeMatching = kanaModule.mountMatching(app, ({keyboard,...action})=>{
      commit(action);render();
      if(keyboard)app.querySelector('.kana-match-node:not(:disabled), [data-action="kana-next"]')?.focus({preventScroll:true});
    });
  }
  if(view==='labels')disposeMatching=labelsModule.mountMatching(app,({keyboard,...action})=>{commit({...action,type:'labels-match'});if(state.labels.phase==='summary'){navigate('listening');return;}render();if(keyboard)app.querySelector('.kana-match-node:not(:disabled), [data-action="labels-next"]')?.focus({preventScroll:true});});
  if (scroll) window.scrollTo(0, 0);
  else if (focus?.action)
    app
      .querySelector(
        `[data-action="${focus.action}"]${focus.id ? `[data-id="${focus.id}"]` : ""}`,
      )
      ?.focus({ preventScroll: true });
}
async function openPanel(kind, id) {
  player.stop();
  if (!panel.open) panelTrigger = document.activeElement;
  panelKind = kind;
  panel.classList.toggle("settings-panel", kind === "settings");
  const { renderPanel } = await import("./panels.js");
  panel.innerHTML = renderPanel(kind, state, kind === "settings" ? "learning" : id);
  showSheet(panel);
  panel.querySelector(kind === "settings" ? "#panel-title" : "button, select, input")?.focus({ preventScroll: true });
}
function closePanel() {
  closeSheet(panel);
  panelKind = "";
  if (panelTrigger?.isConnected) panelTrigger.focus({ preventScroll: true });
  else app.querySelector('[data-action="settings"]')?.focus({ preventScroll: true });
}
async function handle(event) {
  const el = event.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const a = el.dataset.action,
    id = el.dataset.id;
  if(a==='reading'){
   if(![5,6,7].includes(selectedLevel(state)))return;
   el.disabled=true;try{await loadReading();commit({type:'reading-start'});navigate('reading');}catch{toast=selectedLevel(state)>=6?'読み込めませんでした。もう一度お試しください。':'학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a.startsWith('reading-')){
   if(view!=='reading')return;
   if(a==='reading-audio'){if(!state.settings.sound)commit({type:'setting',key:'sound',value:true});speakReading();return;}
   if(a==='reading-stop'){player.stop();return;}
   const previousAudio=readingModule.currentReadingAudio(state)?.id;
   const advancing=['reading-next','reading-previous','reading-check'].includes(a);
   if(advancing){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;}
   commit({type:a,id});if(readingProgress(state,selectedLevel(state)).phase==='done'){try{await showMap();}catch{navigate('home');}return;}render(advancing);if(previousAudio!==readingModule.currentReadingAudio(state)?.id){player.stop();speakReading();}return;
  }
  if(a==='dialogue'){
   el.disabled=true;try{await loadDialogue();commit({type:'dialogue-start'});navigate('dialogue');}catch{toast='대화 학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a.startsWith('dialogue-')){
   if(view!=='dialogue')return;
   if(a==='dialogue-audio'){if(!state.settings.sound){commit({type:'setting',key:'sound',value:true});render();}void player.play(dialogueModule.dialogueAudio[id],state.settings.sound,message=>{toast=message;render();});return;}
   const advancing=['dialogue-next','dialogue-previous','dialogue-check'].includes(a);
   if(advancing){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();}
   commit({type:a,id});if(state.dialogue.phase==='done'){try{await showMap();}catch{navigate('home');}return;}render(advancing);if(advancing)speakDialogue();return;
  }
  if(a==='listening'){
   if(!listeningUnlocked(state))return;
   el.disabled=true;
   try{await loadLabels();commit({type:'level',value:1});commit({type:'listening-start'});navigate('listening');}
   catch{toast='학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a==='listening-audio'){if(view!=='listening')return;if(!state.settings.sound){commit({type:'setting',key:'sound',value:true});render();}speakListening();return;}
  if(a==='listening-answer'){
   if(view!=='listening')return;
   const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();
   commit({type:a,id});
   if(state.listening.index===4){try{await showMap();}catch{navigate('home');}return;}
   render(true);speakListening();return;
  }
  if(a==='labels'||a==='labels-restart'){
   if(!labelsUnlocked(state))return;
   el.disabled=true;
   try{await loadLabels();commit({type:'level',value:1});commit({type:a==='labels-restart'?'labels-restart':'labels-start'});navigate(state.labels.phase==='summary'?'listening':'labels');}
   catch{toast='단어 학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}return;
  }
  if(a.startsWith('labels-')){
   if(view!=='labels')return;
   if(a==='labels-audio'){if(!state.settings.sound){commit({type:'setting',key:'sound',value:true});render();}speakLabels();return;}
   const advancing=a==='labels-next'||a==='labels-check';
   if(advancing){const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;player.stop();}
   commit({type:a,id});if(state.labels.phase==='summary'){navigate('listening');return;}render(advancing);if(advancing)speakLabels();return;
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
  if (a === 'sentence' || a === 'sentence-restart' || a === 'sentence-review' || (a === 'review' && selectedLevel(state) === 3)) {
    el.disabled=true;
    try {
      await loadSentences();
      if(a==='sentence-review'||a==='review') navigate('review');
      else {commit({type:a==='sentence-restart'?'sentence-restart':'sentence-start'});navigate('sentence');}
    } catch {toast='문장 학습을 불러오지 못했어요. 다시 눌러 주세요.';render();}
    return;
  }
  if (a === 'sentence-audio') {
    await player.play(sentenceModule.sentenceAudio[id],state.settings.sound,message=>{toast=message;render();});return;
  }
  if (a.startsWith('sentence-')) {
    if(view!=='sentence') return;
    const moves=['sentence-next','sentence-previous','sentence-submit'].includes(a);
    if(moves) {const now=performance.now();if(now-lastAdvance<450)return;lastAdvance=now;}
    player.stop();commit({type:a,id});render(moves);
    if(moves)speakSentence();
    return;
  }
  if (["home", "review", "my"].includes(a)) {
    navigate(a);
    return;
  }
  if (a === "kana" || a === "kana-restart" || a === "kana-continue" || (a === "play" && selectedLevel(state) === 1)) {
    el.disabled = true;
    try {
      await loadKana();
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
    a === "restart" ||
    a === "reset"
  ) {
    await openPanel(a);
    return;
  }
  if (a === "hint") {
    commit({ type: "hint" });
    await openPanel("hint");
    return;
  }
  if (a === "more-hint") {
    commit({ type: "hint" });
    const { renderPanel } = await import("./panels.js");
    panel.innerHTML = renderPanel("hint", state);
    panel.querySelector('[data-action="more-hint"]:not(:disabled)')?.focus();
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
  if (a === "confirm-reset") {
    try {
      reset(storage);
      state = freshState();
      blocked = false;
      storageError = "";
      closePanel();
      window.location.replace("index.html");
    } catch {
      panel.querySelector('[role="status"]').textContent =
        "저장소에 접근할 수 없어 초기화하지 못했어요.";
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
app.addEventListener("click", handle);
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
panel.addEventListener("cancel", (event) => {
  event.preventDefault();
  closePanel();
});
panel.addEventListener("change", (event) => {
  const el = event.target,
    key = el.dataset.setting;
  if (key === "difficulty") {
    player.stop();
    commit({ type: "level", value: Number(el.value) });
    view = "home";
    toast = "";
    render(true);
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
window.addEventListener("pagehide", () => player.stop());
document.addEventListener("visibilitychange", () => { if (document.hidden) player.stop(); });
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    blocked = true;
    storageError =
      "다른 탭에서 기록이 바뀌었어요. 충돌을 막기 위해 저장을 멈췄어요. 새로고침하면 최신 기록을 불러옵니다.";
    render();
  }
});
if (enteringCase && selectedLevel(state) === 3) {
  try {await loadSentences();commit({type:'sentence-start'});} catch {view='home';toast='문장 학습을 불러오지 못했어요. 다시 눌러 주세요.';}
}
if(enteringCase && selectedLevel(state)>=5){try{await loadReading();commit({type:'reading-start'});}catch{view='home';toast=selectedLevel(state)>=6?'読み込めませんでした。':'학습을 불러오지 못했어요.';}}
if(enteringCase && selectedLevel(state)===4){try{await loadDialogue();commit({type:'dialogue-start'});}catch{view='home';toast='대화 학습을 불러오지 못했어요. 다시 눌러 주세요.';}}
render();
if(enteringCase && view==='reading')speakReading();
else if(enteringCase && view==='dialogue')speakDialogue();
else if (enteringCase && view==='sentence') speakSentence();
else if (enteringCase && view==='play') speakEpisodeAudio();
