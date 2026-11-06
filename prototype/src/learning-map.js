import {insertComparisonLessons,resumedComparison,comparisonAttachment} from './comparison-attachments.js';
import {mapLessonSections,mapSectionWindow} from './learning-map-page.js';
import {videosForCourse,resumeVideoLesson,videoProgress} from './video-lesson-state.js';
import {songsForCourse,resumeSongLesson,songProgress} from './song-state.js';
import {orderLessons} from './lesson-order.js';
import {expertCatalog,expertProgress} from './expert-state.js';
import {scenarioLessons,scenarioProgress,scenarioTitle,scenarioAvailable} from './scenario-state.js';
import {courseName,courseGroup,levelsFor,japaneseLessonUI} from './curriculum.js';
import {koreanLessons, koreanProgress, koreanUnlocked, nextKorean} from './korean-state.js';
import {t} from './i18n.js';
import {basicLessons,basicProgress,basicUnlocked,nextBasic} from './basics-state.js';
import {readingProgress} from './reading-state.js';
import {dialogueProgress} from './dialogue-state.js';
import { sentenceProgress,sentenceLessons,nextSentence } from "./sentence-state.js";
import { icon, esc, quotedText } from './ui.js';
import { assets } from './media.js';
import { selectedLevel, kanaLessons, normalizeKana, kanaUnlocked } from './kana-state.js';
const routePosition=index=>index%2===0?28:72;
// Stable poses follow stage order instead of changing randomly on each render.
function currentMascot(index){
 const pose=['standing','sitting','running'][index%3];
 // Side placements face the open centre of the S bend, never the screen edge.
 const placement=index%3===2?'top':index%2===0?'right':'left';
 return `<span class="map-mascot" data-pose="${pose}" data-placement="${placement}" aria-hidden="true"><span class="map-mascot-still">${pose==='standing'?'':`<img src="assets/mascot/seodang-${pose}-v1.png" alt="" width="128" height="128">`}</span></span>`;
}
// Quiet, editable village drawings. Empty beats keep scenery from becoming a repeated stamp.
function scenery(index){
 const arrangement=[0,1,2,3,null,0,1,null,3,2];
 const scene=arrangement[index%arrangement.length];if(scene===null)return '';
 const scenes=[
  // A low timber house: a continuous curved eave, paper doors and a stone plinth.
  `<path class="scenery-earth" d="M26 76h68l3 6H23z"/>
   <path class="scenery-paper" d="M31 47h58v29H31z"/>
   <path d="M31 48v28m19-28v28m20-28v28m19-28v28M31 71h58"/>
   <path class="scenery-roof" d="M15 48c10-2 19-10 24-20h42c5 10 14 18 24 20-12 5-78 5-90 0Z"/>
   <path d="M39 27c12 2 30 2 42 0M24 46c20 3 52 3 72 0"/>
   <path class="scenery-detail" d="m43 33-7 11m20-11-2 12m14-12 2 12m7-12 7 11"/>
   <path class="scenery-detail" d="M36 55h9m-9 7h9m-5-10v16m15-13h10m-10 7h10m-5-10v16m15-13h9m-9 7h9m-5-10v16"/>
   <path d="M21 83h79"/>`,
  // An asymmetric pine, with layered foliage rather than a scalloped cloud.
  `<path class="scenery-earth" d="M54 81c4-11 5-22 3-34l5-3c4 15 3 27 1 37Z"/>
   <path d="M60 66 43 53m18 5 20-15"/>
   <path class="scenery-foliage" d="M59 27c2-7 8-11 16-9 5-6 16-4 19 3 7 0 12 5 11 11-11 5-27 4-46 4-4-3-4-7 0-9Z"/>
   <path class="scenery-foliage" d="M19 46c-1-7 4-12 12-13 3-8 15-10 22-5 8-3 17 1 18 9 8 0 13 6 10 12-16 4-43 5-60 2Z"/>
   <path class="scenery-detail" d="M26 47c12 1 26 1 37-1m5-15h23"/>
   <path d="M42 82h37m-46-2-2-6m6 6 1-8m43 8 4-5"/>`,
  // A small stone lantern. One inset light replaces the glowing hanging box.
  `<path class="scenery-earth" d="M39 79h42l5 6H34zM52 59h16v20H52z"/>
   <path class="scenery-paper" d="M45 40h30v19H45z"/>
   <path class="scenery-roof" d="M36 40c10-2 17-7 24-15 7 8 14 13 24 15-13 3-35 3-48 0Z"/>
   <path class="scenery-light" d="M55 46h10v10H55z"/>
   <path d="M43 60h34M51 76h18M30 86h60M60 25v-5"/>
   <path class="scenery-detail" d="M56 65v8"/>`,
  // A gently uneven shoreline, two ripples and a pair of lily pads.
  `<path class="scenery-water" d="M20 63c-5-9 5-17 19-19 14-3 22 3 34 1 14-2 28 4 29 14 1 9-10 17-26 18-11 1-17-4-29-2-13 3-25-3-27-12Z"/>
   <path class="scenery-detail" d="M30 61c7 2 13 2 19 0m13 8c8 2 17 1 23-1"/>
   <path class="scenery-foliage" d="M62 52c-7-4-16-1-15 4 1 4 11 5 16 1l-5-2Z"/>
   <path class="scenery-foliage" d="M79 58c-5-3-12-1-12 3 1 4 9 4 14 1l-5-2Z"/>
   <path class="scenery-earth" d="M22 54c-3-4 0-10 6-11 6-1 10 3 11 8-4 4-11 5-17 3Z"/>
   <path class="scenery-detail" d="m26 49 4-2 5 3"/>
   <path d="M91 45c0-7 2-11 5-14m-6 14c-1-6-3-10-7-13m9 14c3-4 6-6 10-7"/>`
 ];
 return `<span class="map-village map-village-${scene}" data-scenery="${['house','pine','lantern','pond'][scene]}" style="--scenery-x:${100-routePosition(index)}%" aria-hidden="true"><svg viewBox="0 0 120 100" fill="none" focusable="false"><g class="scenery-drawing">${scenes[scene]}</g></svg></span>`;
}

function stop({title, symbol='book', ready, complete, current, detail='', status, action, id}, index, lessons, sectionEnd=false) {
  const x=routePosition(index),nextX=routePosition(index+1);
  const route=!sectionEnd&&index<lessons.length-1?`<svg class="map-trail${complete?' is-travelled':''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="map-trail-edge" d="M${x} 0 C${x} 50 ${nextX} 50 ${nextX} 100"/><path class="map-trail-fill" d="M${x} 0 C${x} 50 ${nextX} 50 ${nextX} 100"/></svg>`:'';
  return `<li style="--stop-x:${x}%" class="map-stop${current ? ' is-current' : ''}${complete ? ' is-complete' : ''}${!ready ? ' is-locked' : ''}">${route}${scenery(index)}<button class="map-choice" ${ready ? `data-action="${action}"${id !== undefined ? ` data-id="${id}"` : ''}` : 'disabled'} aria-label="${index + 1}${t('번째')}, ${esc(title)}, ${esc(detail)}, ${esc(t(status))}"${current ? ' aria-current="step"' : ''}><span class="map-node" aria-hidden="true"><span class="map-number">${index+1}</span>${icon(complete?'check':!ready?'lock':current?'play':symbol)}${current?currentMascot(index):''}</span><span class="map-title">${index+1}. ${quotedText(title)}</span>${current&&!complete&&['이어하기','続きから'].includes(status)?`<span class="map-status">${esc(t(status))}${current?icon('arrow'):''}</span>`:''}</button></li>`;
}
function learningMapModel(state) {
  const level = courseGroup(selectedLevel(state));
  if (!levelsFor(state.courseDirection).includes(level)) return {level,lessons:[],current:-1};
  let lessons, title, count;
  if(level===7){title=courseName(level,japaneseLessonUI(state));lessons=expertCatalog[state.courseDirection].map((l,id)=>{const p=expertProgress(state,id);return {id,title:t(l.title),ready:true,complete:p.completed,current:p.started&&!p.completed,status:p.completed?'완료':p.started?'이어하기':'시작하기',action:'expert'};});count=lessons.filter(l=>l.complete).length;
  } else if(state.courseDirection==='ja-ko'){
    title=courseName(level,true);const active=nextKorean(state);lessons=koreanLessons.filter(l=>!l.retired&&l.level===level).map(l=>{const p=koreanProgress(state,l.id),ready=koreanUnlocked(state,l.id);return {title:l.title,ready,complete:p.completed,current:active.id===l.id&&!p.completed,detail:'',status:p.completed?'完了':ready?p.started?'続きから':'開始':'前の学習を終えると開きます',action:'korean',id:l.id};});count=lessons.filter(l=>l.complete).length;
  } else if (level === 0) {
    const k = normalizeKana(state.kana);
    const available = kanaLessons.map((_,i)=>kanaUnlocked(k,i));
    // Continue the most recently selected unfinished case, otherwise the next open one.
    const next = available[k.active] && !k.lessons[k.active].caseSolved ? k.active : k.lessons.findIndex((p,i)=>available[i]&&!p.caseSolved);
    title = courseName(level); count = k.lessons.filter(p=>p.caseSolved).length;
    lessons = kanaLessons.map((lesson,i)=>{
      const p=k.lessons[i], current=i===next;
      return {title:lesson.caseTitle,symbol:'book',ready:available[i],complete:p.caseSolved,current,
        detail:lesson.rangeLabel,
        status:p.caseSolved?'학습 완료':!available[i]?'앞 학습을 마치면 열려요':p.started?'이어하기':'시작하기',action:'kana',id:i};
    });
    for(const l of basicLessons.filter(l=>l.id!==6)){const b=basicProgress(state,l.id);count+=Number(b.completed);lessons.push({title:l.title,ready:basicUnlocked(state,l.id),complete:b.completed,current:next<0&&l.id===nextBasic(state)&&!b.completed,detail:'',status:b.completed?'완료':b.started?'이어하기':'시작하기',action:'basic',id:l.id});}
  } else if(level===2){
    title=courseName(level);lessons=sentenceLessons.map(l=>{const p=sentenceProgress(state,l.id);return {...l,ready:true,complete:p.completed,current:l.id===nextSentence(state),status:p.completed?'학습 완료':p.started?'이어하기':'시작하기',action:'sentence'};});count=lessons.filter(l=>l.complete).length;
  } else if(level===4){
    const p=dialogueProgress(state);title=courseName(level);count=Number(p.completed);lessons=[{title:'따뜻한 커피를 포장해요',image:assets.cafe.src,ready:true,complete:p.completed,current:!p.completed,status:p.completed?'학습 완료':p.started?'이어하기':'시작하기',action:'dialogue'}];
  } else {
    title=courseName(level);lessons=[5,6].map(id=>{const p=readingProgress(state,id);return {id,title:id===5?'안내·메시지에서 정보 찾기':'조건과 이유를 연결해 판단하기',ready:true,complete:p.completed,current:id===selectedLevel(state)&&!p.completed,status:p.completed?'완료':p.started?'이어하기':'시작하기',action:'reading'};});count=lessons.filter(l=>l.complete).length;
  }

  const additions=scenarioLessons.filter(l=>l.level===level&&l.id!=='5'&&scenarioAvailable(state,l)).sort((a,b)=>a.number[state.courseDirection]-b.number[state.courseDirection]);
  for(const addition of additions){const p=scenarioProgress(state,addition.id);lessons.push({id:addition.id,title:scenarioTitle(state,addition),ready:true,complete:p.completed,current:p.started&&!p.completed,detail:'',status:p.completed?'완료':p.started?'이어하기':'시작하기',action:'scenario'});count+=Number(p.completed);}

  const specialLessons=videosForCourse(state).map(video=>{const p=videoProgress(state,video.id);return {id:video.id,number:video.number,replaces:video.replaces,title:t(video.title),ready:true,complete:p.completed,current:p.started&&!p.completed,status:p.completed?'완료':p.started?'이어하기':'시작하기',action:'video'};});
  specialLessons.push(...songsForCourse(state).map(song=>{const p=songProgress(state,song.id);return {id:song.id,number:song.number,replaces:song.replaces,title:t(song.title),symbol:'music',ready:true,complete:p.completed,current:p.started&&!p.completed,status:p.completed?'완료':p.started?'이어하기':'시작하기',action:'song'};}));
  lessons=insertComparisonLessons(orderLessons(lessons,specialLessons),state.courseDirection,c=>{const p=koreanProgress(state,c.id);return {id:c.id,title:c.title,supplementary:true,action:'korean',ready:true,complete:p.completed,current:false,status:p.completed?'完了':p.started?'続きから':'開始'};});
  count=lessons.filter(l=>l.complete).length;

  // A single destination mirrors the home resume card, including direct dev entry.
  const active=state.courseDirection==='ko-ja'&&state.basics?.active;
  let current=[0,2].includes(level)&&active&&(active===6?2:0)===level&&basicUnlocked(state,active)&&!basicProgress(state,active).completed?lessons.findIndex(l=>l.action==='basic'&&l.id===active):lessons.findIndex(l=>l.current);
  const resumedScenario=additions.filter(l=>lessons.some(item=>item.action==='scenario'&&item.id===l.id)).find(l=>{const p=scenarioProgress(state,l.id);return p.started&&!p.completed;});
  if(resumedScenario)current=lessons.findIndex(l=>l.action==='scenario'&&l.id===resumedScenario.id);
  const resumedVideo=resumeVideoLesson(state);
  if(resumedVideo)current=lessons.findIndex(l=>l.action==='video'&&l.id===resumedVideo.id);
  const resumedSong=resumeSongLesson(state);
  if(resumedSong)current=lessons.findIndex(l=>l.action==='song'&&l.id===resumedSong.id);
  if(state.courseDirection==='ja-ko'&&[2,4,5].includes(level)){
   const comparison=resumedComparison(state);
   if(comparison)current=lessons.findIndex(l=>l.action==='korean'&&l.id===comparison.id);
   else if(current<0||!['이어하기','続きから'].includes(lessons[current]?.status)){
    // Keep established learners near their completed route, rather than jumping
    // backwards to a newly inserted lesson. Earlier lessons remain available.
    const lastComplete=lessons.findLastIndex(l=>l.complete);
    current=lessons.findIndex((l,i)=>i>lastComplete&&l.ready&&!l.complete);
   }
  }
  if(current<0)current=lessons.findIndex(l=>l.ready&&!l.complete);
  lessons=lessons.map((l,i)=>({...l,current:i===current}));
  return {level,lessons,title,count,current};
}
export function mapCourseLessons(state){return learningMapModel(state).lessons;}
export function mapCurrentLesson(state){const model=learningMapModel(state);return model.lessons[model.current];}
export function mapNextLesson(state,kind,id){
 const attachment=kind==='korean'&&state.courseDirection==='ja-ko'?comparisonAttachment(id):null;
 if(attachment)state={...state,onboardingLevel:attachment.level};
 const {level,lessons}=learningMapModel(state);
 const index=lessons.findIndex(l=>l.action===kind&&String(l.id??0)===String(id??0));
 if(index<0)return null;
 let next=lessons[index+1],nextLevel=level;
 if(!next){const levels=levelsFor(state.courseDirection);nextLevel=levels[levels.indexOf(level)+1];if(nextLevel===undefined)return null;next=learningMapModel({...state,onboardingLevel:nextLevel}).lessons[0];}
 return next?{...next,level:next.action==='reading'?Number(next.id):nextLevel}:null;
}
export function renderMapSection(state,i,active=false){
 const {level,lessons}=learningMapModel(state),sections=mapLessonSections(lessons),section=sections[i];
 if(!Number.isSafeInteger(i)||!section)return '';
 const {start,end}=section;
 const recommendedEnd=state.courseDirection==='ko-ja'&&level===0?lessons.findIndex(l=>l.action==='basic'&&l.id===10):-1;
 const showComingSoon=![0,8,9,10].includes(level)&&i===sections.length-1;
 const routeStops=showComingSoon?[...lessons,null]:lessons;
 const comingSoon=!showComingSoon?'':`<li class="map-stop map-coming-soon is-locked" style="--stop-x:${routePosition(lessons.length)}%"><div class="map-choice"><span class="map-node" aria-hidden="true">?</span><span class="map-title">Coming Soon</span></div></li>`;
 const stops=lessons.slice(start,end).map((lesson,offset)=>{const index=start+offset;return stop(lesson,index,routeStops,index===recommendedEnd)+(index===recommendedEnd?'<li class="map-study-note"><h2>기본 추천 학습은 여기까지예요</h2><p>1~9번에서 히라가나와 기본 발음을 익혀요.</p><p>10번부터는 발음 보충과 가타카나를 배우는 추가 학습이에요. 레벨 2로 먼저 넘어가고 필요할 때 돌아와도 좋아요.</p></li>':'');}).join('');
 return `<section class="map-page" data-map-page="${i}" data-active="${active}"><div class="map-layout" id="map-section-${i}"><ol class="map-grid" start="${start+1}">${stops}${comingSoon}</ol></div></section>`;
}
export function renderLearningMap(state,{resumeCard='',page:requestedPage}={}) {
  const {level,lessons,title,count,current}=learningMapModel(state);
  if (!levelsFor(state.courseDirection).includes(level)) return `<section class="map-empty"><span aria-hidden="true">${icon('lock')}</span><h1>${level}단계 학습을 준비하고 있어요</h1></section>`;
  const progress=lessons.length?Math.round(count/lessons.length*100):0;
  const {page,pageCount,currentPage}=mapSectionWindow(lessons,current,requestedPage);
  const mapLabel=`${title}${japaneseLessonUI(state)?'の学習マップ':' 학습 지도'}`;
  const pages=renderMapSection(state,page,true);
  return `<section class="learning-map" data-course="${state.courseDirection}:${level}" data-page-index="${page}" data-page-count="${pageCount}" data-current-page="${currentPage}" aria-label="${esc(mapLabel)}"><div class="map-overview"><div class="map-heading"><h1>${title}</h1><span>${count}/${lessons.length}</span></div>${current>=0?`<button class="map-locate" data-action="map-locate" aria-label="${t('현재 위치로 이동')}">${icon('locate')}</button>`:''}<div class="map-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>${resumeCard}</div><div class="map-sections" id="map-page-lessons"><button class="map-load-edge" data-map-load="previous"${page===0?' hidden':''}>${t('이전')}</button>${pages}<button class="map-load-edge" data-map-load="next"${page===pageCount-1?' hidden':''}>${t('다음')}</button></div></section>`;
}
