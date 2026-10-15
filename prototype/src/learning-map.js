import {courseName,courseGroup,koreanImmersion} from './curriculum.js';
import {koreanLessons, koreanProgress, koreanUnlocked, nextKorean} from './korean-state.js';
import {t} from './i18n.js';
import {basicLessons,basicProgress,basicUnlocked,nextBasic} from './basics-state.js';
import {readingProgress} from './reading-state.js';
import {dialogueProgress} from './dialogue-state.js';
import { sentenceProgress } from "./sentence-state.js";
import { icon, esc } from './ui.js';
import { assets } from './media.js';
import { selectedLevel, kanaLessons, normalizeKana, kanaUnlocked } from './kana-state.js';
function stop({title, image, symbol='book', ready, complete, current, detail='', status, action, id}, index) {
  const row=Math.floor(index/2),column=row%2===0?index%2+1:2-index%2;
  return `<li style="grid-row:${row+1};grid-column:${column}" class="map-stop${current ? ' is-current' : ''}${complete ? ' is-complete' : ''}${!ready ? ' is-locked' : ''}"><button class="map-choice" ${ready ? `data-action="${action}"${id !== undefined ? ` data-id="${id}"` : ''}` : 'disabled'} aria-label="${index + 1}${t('번째')}, ${esc(title)}, ${esc(detail)}, ${status}"${current ? ' aria-current="step"' : ''}><span class="map-node" aria-hidden="true"><span class="map-number">${index+1}</span>${icon(complete?'check':!ready?'lock':symbol)}${current?'<img class="map-mascot" src="assets/mascot/seodang-map-sitting.png" alt="" width="48" height="48" decoding="async">':''}</span><span class="map-title">${index+1}. ${esc(title)}</span></button></li>`;
}
export function renderLearningMap(state) {
  const level = courseGroup(selectedLevel(state));
  if (level > 7) return `<section class="map-empty"><span aria-hidden="true">${icon('lock')}</span><h1>${level}단계 학습을 준비하고 있어요</h1></section>`;
  let lessons, title, count;
  if(state.courseDirection==='ja-ko'){
    title=courseName(level,!koreanImmersion(state));const active=nextKorean(state);lessons=koreanLessons.filter(l=>!l.retired&&l.level===level).map(l=>{const p=koreanProgress(state,l.id),ready=koreanUnlocked(state,l.id);return {title:l.title,ready,complete:p.completed,current:active.id===l.id,detail:'',status:koreanImmersion(state)?(p.completed?'완료':ready?p.started?'이어하기':'시작하기':'앞 학습을 마치면 열려요'):(p.completed?'完了':ready?p.started?'続きから':'開始':'前の学習を終えると開きます'),action:'korean',id:l.id};});count=lessons.filter(l=>l.complete).length;
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
    for(const l of basicLessons.filter(l=>level===(l.id===6?2:0))){const b=basicProgress(state,l.id);count+=Number(b.completed);lessons.push({title:l.title,ready:basicUnlocked(state,l.id),complete:b.completed,current:(level===0?next<0:listening.completed)&&l.id===nextBasic(state)&&!b.completed,detail:'',status:b.completed?'완료':b.started?'이어하기':'시작하기',action:'basic',id:l.id});}
  } else if(level===2){
    const p=sentenceProgress(state);title=courseName(level);count=Number(p.completed);lessons=[{title:'카페에 남겨진 가방',image:assets.cafe.src,ready:true,complete:p.completed,current:!p.completed,status:p.completed?'학습 완료':p.started?'이어하기':'시작하기',action:'sentence'}];
  } else if(level===4){
    const p=dialogueProgress(state);title=courseName(level);count=Number(p.completed);lessons=[{title:'따뜻한 커피를 포장해요',image:assets.cafe.src,ready:true,complete:p.completed,current:!p.completed,status:p.completed?'학습 완료':p.started?'이어하기':'시작하기',action:'dialogue'}];
  } else {
    const levels=level===5?[5,6]:[7];title=courseName(level,level===7);lessons=levels.map((id,i)=>{const p=readingProgress(state,id);return {id,title:id===5?'안내·메시지에서 정보 찾기':id===6?'조건과 이유를 연결해 판단하기':'専門記事・論説を読む',ready:true,complete:p.completed,current:id===selectedLevel(state)&&!p.completed,status:p.completed?'완료':p.started?'이어하기':'시작하기',action:'reading'};});count=lessons.filter(l=>l.complete).length;
  }

  // A single destination mirrors the home resume card, including direct dev entry.
  const active=state.courseDirection==='ko-ja'&&state.basics?.active;
  let current=[0,2].includes(level)&&active&&(active===6?2:0)===level&&basicUnlocked(state,active)&&!basicProgress(state,active).completed?lessons.findIndex(l=>l.action==='basic'&&l.id===active):lessons.findIndex(l=>l.current);
  if(current<0)current=lessons.findIndex(l=>l.ready&&!l.complete);
  lessons=lessons.map((l,i)=>({...l,current:i===current}));
  const rows=Math.ceil(lessons.length/2);
  const road=Array.from({length:rows},(_,i)=>`<span class="map-road-row${lessons.slice(i*2,i*2+2).every(l=>l.complete)?' complete':''}${i*2+1===lessons.length?' single':''}"></span>`).join('');
  return `<section class="learning-map" aria-label="${title}${state.courseDirection==='ja-ko'&&!koreanImmersion(state)?'の学習マップ':' 학습 지도'}"><div class="map-overview"><div class="map-heading"><h1>${title}</h1><span>${count}/${lessons.length}</span></div>${current>=0?`<button class="map-locate" data-action="map-locate" aria-label="${t('현재 위치로 이동')}">${icon('locate')}</button>`:''}</div><div class="map-layout"><div class="map-road" aria-hidden="true">${road}</div><ol class="map-grid">${lessons.map(stop).join('')}</ol></div></section>`;
}
