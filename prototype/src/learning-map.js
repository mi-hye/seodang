import {MAP_PAGE_SIZE,mapPageWindow} from './learning-map-page.js';
import {videosForCourse,resumeVideoLesson,videoProgress} from './video-lesson-state.js';
import {songsForCourse,resumeSongLesson,songProgress} from './song-state.js';
import {orderLessons} from './lesson-order.js';
import {expertCatalog,expertProgress} from './expert-state.js';
import {scenarioLessons,scenarioProgress,scenarioTitle,scenarioAvailable} from './scenario-state.js';
import {courseName,courseGroup,courseLevels,japaneseLessonUI} from './curriculum.js';
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
// Small vector scenery shares the map palette and never intercepts stage taps.
function scenery(index){
 const scenes=[
  `<ellipse class="scenery-ground" cx="60" cy="85" rx="49" ry="9"/><path class="scenery-wall" d="M28 48h65v34H28z"/><path class="scenery-roof" d="M15 50q18-5 24-19h42q7 14 24 19l-7 7H22z"/><path class="scenery-roof-line" d="M29 45h62M38 34l-7 16m19-16-3 17m17-17v17m12-17 8 17"/><path class="scenery-door" d="M52 60h19v22H52z"/><path class="scenery-window" d="M34 61h11v12H34zm44 0h9v12h-9z"/><path class="scenery-line" d="M61 61v20M28 82h65"/>`,
  `<ellipse class="scenery-ground" cx="60" cy="85" rx="43" ry="8"/><path class="scenery-trunk" d="M58 79V34m0 24L40 45m18 9 21-16"/><path class="scenery-leaves" d="M28 49q-13-17 6-25 0-19 20-16 18-12 27 6 22 0 19 21 12 19-10 25-9 13-27 5-21 8-35-16"/><path class="scenery-line" d="M59 74V44m0 15 18-13m-18 7-14-9"/><path class="scenery-stone" d="m28 82 6-9h14l6 10zm46 3 4-9h12l7 9z"/>`,
  `<ellipse class="scenery-ground" cx="60" cy="86" rx="41" ry="7"/><path class="scenery-trunk" d="M43 82V20h35"/><path class="scenery-line" d="M73 20v10"/><path class="scenery-lamp" d="M60 33q13-8 26 0v28q-13 8-26 0z"/><path class="scenery-roof" d="M57 32h32v5H57zm0 25h32v6H57z"/><path class="scenery-lamp-line" d="M66 37v20m7-20v20m7-20v20"/><path class="scenery-stone" d="m31 85 5-8h14l6 8z"/><path class="scenery-line" d="M70 66v8m6-8v6"/>`,
  `<ellipse class="scenery-ground" cx="60" cy="74" rx="47" ry="18"/><ellipse class="scenery-water" cx="60" cy="69" rx="41" ry="15"/><path class="scenery-water-line" d="M30 67h17m21 8h19m-36-4h10"/><path class="scenery-stone" d="m20 60 7-9h14l7 10zm60 20 6-8h15l5 10z"/><path class="scenery-line" d="M87 53V31m0 13 8-9m-8 5-6-7"/><path class="scenery-leaves" d="M43 59q0-12 13-8l-4 10z"/>`
 ];
 return `<span class="map-village map-village-${index%4}" style="--scenery-x:${100-routePosition(index)}%" aria-hidden="true"><svg viewBox="0 0 120 100" fill="none">${scenes[index%4]}</svg></span>`;
}
function stop({title, symbol='book', ready, complete, current, detail='', status, action, id}, index, lessons, sectionEnd=false) {
  const x=routePosition(index),nextX=routePosition(index+1);
  const route=!sectionEnd&&index<lessons.length-1?`<svg class="map-trail${complete?' is-travelled':''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="map-trail-edge" d="M${x} 0 C${x} 50 ${nextX} 50 ${nextX} 100"/><path class="map-trail-fill" d="M${x} 0 C${x} 50 ${nextX} 50 ${nextX} 100"/></svg>`:'';
  return `<li style="--stop-x:${x}%" class="map-stop${current ? ' is-current' : ''}${complete ? ' is-complete' : ''}${!ready ? ' is-locked' : ''}">${route}${scenery(index)}<button class="map-choice" ${ready ? `data-action="${action}"${id !== undefined ? ` data-id="${id}"` : ''}` : 'disabled'} aria-label="${index + 1}${t('번째')}, ${esc(title)}, ${esc(detail)}, ${esc(t(status))}"${current ? ' aria-current="step"' : ''}><span class="map-node" aria-hidden="true"><span class="map-number">${index+1}</span>${icon(complete?'check':!ready?'lock':current?'play':symbol)}${current?currentMascot(index):''}</span><span class="map-title">${index+1}. ${quotedText(title)}</span>${current&&!complete&&['이어하기','続きから'].includes(status)?`<span class="map-status">${esc(t(status))}${current?icon('arrow'):''}</span>`:''}</button></li>`;
}
function learningMapModel(state) {
  const level = courseGroup(selectedLevel(state));
  if (level > 7) return {level,lessons:[],current:-1};
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
  lessons=orderLessons(lessons,specialLessons);
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
  if(current<0)current=lessons.findIndex(l=>l.ready&&!l.complete);
  lessons=lessons.map((l,i)=>({...l,current:i===current}));
  return {level,lessons,title,count,current};
}
export function mapCourseLessons(state){return learningMapModel(state).lessons;}
export function mapCurrentLesson(state){const model=learningMapModel(state);return model.lessons[model.current];}
export function mapNextLesson(state,kind,id){
 const {level,lessons}=learningMapModel(state);
 const index=lessons.findIndex(l=>l.action===kind&&String(l.id??0)===String(id??0));
 if(index<0)return null;
 let next=lessons[index+1],nextLevel=level;
 if(!next){nextLevel=courseLevels[courseLevels.indexOf(level)+1];if(nextLevel===undefined)return null;next=learningMapModel({...state,onboardingLevel:nextLevel}).lessons[0];}
 return next?{...next,level:next.action==='reading'?Number(next.id):nextLevel}:null;
}
export function mapPageForLesson(state,lessonKey) {
  const {lessons}=learningMapModel(state);
  const index=lessons.findIndex(l=>`${state.courseDirection}:${l.action}:${l.id??0}`===lessonKey);
  return index<0?undefined:Math.floor(index/MAP_PAGE_SIZE);
}
export function renderMapSection(state,i,active=false){
 const {level,lessons}=learningMapModel(state),pageCount=Math.max(1,Math.ceil(lessons.length/MAP_PAGE_SIZE));
 if(!Number.isSafeInteger(i)||i<0||i>=pageCount)return '';
 const recommendedEnd=state.courseDirection==='ko-ja'&&level===0?lessons.findIndex(l=>l.action==='basic'&&l.id===10):-1;
 const range=p=>`${p*MAP_PAGE_SIZE+1}~${Math.min(lessons.length,(p+1)*MAP_PAGE_SIZE)}`;
    const start=i*MAP_PAGE_SIZE,end=Math.min(lessons.length,start+MAP_PAGE_SIZE),showComingSoon=level!==0&&i===pageCount-1;
    const routeStops=showComingSoon?[...lessons,null]:lessons;
    const comingSoon=!showComingSoon?'':`<li class="map-stop map-coming-soon is-locked" style="--stop-x:${routePosition(lessons.length)}%"><div class="map-choice"><span class="map-node" aria-hidden="true">?</span><span class="map-title">Coming Soon</span></div></li>`;
    const stops=lessons.slice(start,end).map((lesson,offset)=>{const index=start+offset;return stop(lesson,index,routeStops,index===recommendedEnd)+(index===recommendedEnd?'<li class="map-study-note"><h2>기본 추천 학습은 여기까지예요</h2><p>1~9번에서 히라가나와 기본 발음을 익혀요.</p><p>10번부터는 발음 보충과 가타카나를 배우는 추가 학습이에요. 레벨 2로 먼저 넘어가고 필요할 때 돌아와도 좋아요.</p></li>':'');}).join('');
    return `<section class="map-page" data-map-page="${i}" data-active="${active}" aria-label="${range(i)}"><div class="map-layout" id="map-section-${i}"><ol class="map-grid" start="${start+1}" aria-label="${range(i)}">${stops}${comingSoon}</ol></div></section>`;
}
export function renderLearningMap(state,{resumeCard='',page:requestedPage}={}) {
  const {level,lessons,title,count,current}=learningMapModel(state);
  if (level > 7) return `<section class="map-empty"><span aria-hidden="true">${icon('lock')}</span><h1>${level}단계 학습을 준비하고 있어요</h1></section>`;
  const progress=lessons.length?Math.round(count/lessons.length*100):0;
  const {page,pageCount,currentPage}=mapPageWindow(lessons.length,current,requestedPage);
  const mapLabel=`${title}${japaneseLessonUI(state)?'の学習マップ':' 학습 지도'}`;
  const pages=renderMapSection(state,page,true);
  return `<section class="learning-map" data-course="${state.courseDirection}:${level}" data-page-index="${page}" data-page-count="${pageCount}" data-current-page="${currentPage}" aria-label="${esc(mapLabel)}"><div class="map-overview"><div class="map-heading"><h1>${title}</h1><span>${count}/${lessons.length}</span></div>${current>=0?`<button class="map-locate" data-action="map-locate" aria-label="${t('현재 위치로 이동')}">${icon('locate')}</button>`:''}<div class="map-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>${resumeCard}</div><div class="map-sections" id="map-page-lessons"><button class="map-load-edge" data-map-load="previous"${page===0?' hidden':''}>${t('이전')}</button>${pages}<button class="map-load-edge" data-map-load="next"${page===pageCount-1?' hidden':''}>${t('다음')}</button></div></section>`;
}
