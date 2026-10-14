import {koreanLessons,koreanLevels,koreanProgress,koreanUnlocked,nextKorean} from './korean-state.js';
import {t} from './i18n.js';
import {basicLessons,basicProgress,basicUnlocked,nextBasic} from './basics-state.js';
import {readingProgress} from './reading-state.js';
import {dialogueProgress} from './dialogue-state.js';
import {listeningProgress,listeningUnlocked} from './listening-state.js';
import {developmentMode} from './build-config.js';
import {labelsUnlocked,labelsProgress} from "./labels-state.js";
import { sentenceProgress } from "./sentence-state.js";
import { icon, esc } from './ui.js';
import { assets } from './media.js';
import { selectedLevel, kanaLessons, normalizeKana, kanaUnlocked } from './kana-state.js';
function stop({title, image, symbol='book', ready, complete, current, detail, status, action, id}, index) {
  const row=Math.floor(index/2),column=row%2===0?index%2+1:2-index%2;
  return `<li style="grid-row:${row+1};grid-column:${column}" class="map-stop${current ? ' is-current' : ''}${complete ? ' is-complete' : ''}${!ready ? ' is-locked' : ''}"><button class="map-choice" ${ready ? `data-action="${action}"${id !== undefined ? ` data-id="${id}"` : ''}` : 'disabled'} aria-label="${index + 1}${t('번째')}, ${esc(title)}, ${esc(detail)}, ${status}"${current ? ' aria-current="step"' : ''}><span class="map-node" aria-hidden="true"><span class="map-number">${index+1}</span>${icon(complete?'check':!ready?'lock':symbol)}${current?'<img class="map-mascot" src="assets/mascot/seodang-map-sitting.png" alt="" width="48" height="48" decoding="async">':''}</span><span class="map-title">${index+1}. ${esc(title)}</span></button></li>`;
}
export function renderLearningMap(state) {
  const level = selectedLevel(state);
  if (level > 7) return `<section class="map-empty"><span aria-hidden="true">${icon('lock')}</span><h1>${level}단계 학습을 준비하고 있어요</h1></section>`;
  let lessons, title, count;
  if(state.courseDirection==='ja-ko'){
    title=koreanLevels[level];const active=nextKorean(state);lessons=koreanLessons.filter(l=>l.level===level).map(l=>{const p=koreanProgress(state,l.id),ready=koreanUnlocked(state,l.id);return {title:l.title,ready,complete:p.completed,current:active.id===l.id,detail:'',status:p.completed?'完了':ready?p.started?'続きから':'開始':'前の学習を終えると開きます',action:'korean',id:l.id};});count=lessons.filter(l=>l.complete).length;
  } else if (level === 0 || level === 1) {
    const k = normalizeKana(state.kana);
    const available = kanaLessons.map((_,i)=>kanaUnlocked(k,i));
    // Continue the most recently selected unfinished case, otherwise the next open one.
    const next = available[k.active] && !k.lessons[k.active].caseSolved ? k.active : k.lessons.findIndex((p,i)=>available[i]&&!p.caseSolved);
    title = '글자 익히기'; count = k.lessons.filter(p=>p.caseSolved).length;
    lessons = kanaLessons.map((lesson,i)=>{
      const p=k.lessons[i], current=i===next;
      return {title:lesson.caseTitle,symbol:'book',ready:available[i],complete:p.caseSolved,current,
        detail:lesson.rangeLabel,
        status:p.caseSolved?'학습 완료':!available[i]?'앞 학습을 마치면 열려요':p.started?'이어하기':'시작하기',action:'kana',id:i};
    });
    if(level===1){lessons=[];count=0;title='단어';}
    const p=labelsProgress(state),ready=labelsUnlocked(state);count+=level===1?Number(p.completed):0;
    if(level===1)lessons.push({title:'이름표 붙이기',symbol:'cards',ready,complete:p.completed,current:next<0&&ready&&!p.completed,detail:'かさ · くつ · はな · ねこ',status:p.completed?'학습 완료':ready?p.started?'이어하기':'시작하기':'46자를 마치면 열려요',action:'labels'});
    const listening=listeningProgress(state);count+=level===1?Number(listening.completed):0;
    if(level===1)lessons.push({title:'듣고 고르기',symbol:'sound',ready:listeningUnlocked(state),complete:listening.completed,current:p.completed&&!listening.completed,detail:'소리와 뜻 연결하기',status:listening.completed?'학습 완료':listening.started?'이어하기':'시작하기',action:'listening'});
    for(const l of basicLessons.filter(l=>level===(l.id===6?1:0))){const b=basicProgress(state,l.id);count+=Number(b.completed);lessons.push({title:l.title,ready:basicUnlocked(state,l.id),complete:b.completed,current:(level===0?next<0:listening.completed)&&l.id===nextBasic(state)&&!b.completed,detail:'',status:b.completed?'완료':b.started?'이어하기':'시작하기',action:'basic',id:l.id});}
  } else if(level>=5){
    const p=readingProgress(state,level),jp=level>=6;title=level===7?'行間を聴く':jp?'読んで、考える':'글의 핵심과 의견';count=Number(p.completed);
    lessons=[{title:level===7?'含意と論理を聴く':jp?'条件と理由を読む':'글을 읽고 핵심 찾기',symbol:'book',ready:true,complete:p.completed,current:!p.completed,detail:level===7?'論評・反語・推論':jp?'お知らせ・メッセージ・意見':'안내문 · 메시지 · 의견',status:p.completed?(jp?'完了':'학습 완료'):p.started?(jp?'続ける':'이어하기'):(jp?'始める':'시작하기'),action:'reading'}];
  } else if(level===4){
    const p=dialogueProgress(state);title='일상 대화';count=Number(p.completed);lessons=[{title:'카페에서 주문하기',image:assets.cafe.src,ready:true,complete:p.completed,current:!p.completed,detail:'음료 · 온도 · 포장',status:p.completed?'학습 완료':p.started?'이어하기':'시작하기',action:'dialogue'}];
  } else if (level === 3) {
    const p=sentenceProgress(state);title='짧은 문장';count=Number(p.completed);
    lessons=[
      {title:'가방 주인을 찾아요',image:assets.cafe.src,ready:true,complete:p.completed,current:!p.completed,detail:'소개 · 위치 · 부정',status:p.completed?'학습 완료':p.started?'이어하기':'시작하기',action:'sentence'},
      {title:'주문 확인하기',symbol:'cup',ready:false,detail:'준비 중',status:'준비 중'},
      {title:'약속 장소 찾기',symbol:'arrow',ready:false,detail:'준비 중',status:'준비 중'},
    ];
  } else {
    title='단어와 표현';const complete=state.episode.step==='summary';count=Number(complete);
    lessons=[
      {title:'카페에 남겨진 가방',image:assets.cafe.src,ready:true,complete,current:!complete,detail:'색과 위치',status:complete?'해결 완료':state.episode.started?'이어하기':'시작하기',action:complete?'review':'play'},
      {title:'음료 주문',symbol:'cup',ready:false,detail:'준비 중',status:'준비 중'},
      {title:'길 묻기',symbol:'arrow',ready:false,detail:'준비 중',status:'준비 중'},
    ];
  }
  // A single destination mirrors the home resume card, including direct dev entry.
  const active=state.courseDirection==='ko-ja'&&state.basics?.active;
  let current=[0,1].includes(level)&&active&&(active===6?1:0)===level&&basicUnlocked(state,active)&&!basicProgress(state,active).completed?lessons.findIndex(l=>l.action==='basic'&&l.id===active):lessons.findIndex(l=>l.current);
  if(current<0)current=lessons.findIndex(l=>l.ready&&!l.complete);
  lessons=lessons.map((l,i)=>({...l,current:i===current}));
  const rows=Math.ceil(lessons.length/2);
  const road=Array.from({length:rows},(_,i)=>`<span class="map-road-row${lessons.slice(i*2,i*2+2).every(l=>l.complete)?' complete':''}${i*2+1===lessons.length?' single':''}"></span>`).join('');
  return `<section class="learning-map" aria-label="${title}${state.courseDirection==='ja-ko'?'の学習マップ':' 학습 지도'}"><div class="map-overview"><div class="map-heading"><h1>${title}</h1><span>${count}/${lessons.length}</span></div>${current>=0?`<button class="map-locate" data-action="map-locate" aria-label="${t('현재 위치로 이동')}">${icon('locate')}</button>`:''}</div><div class="map-layout"><div class="map-road" aria-hidden="true">${road}</div><ol class="map-grid">${lessons.map(stop).join('')}</ol></div></section>`;
}
