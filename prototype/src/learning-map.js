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
  const row = Math.floor(index / 2);
  const column = row % 2 === 0 ? index % 2 + 1 : 2 - index % 2;
  return `<li style="grid-row:${row + 1};grid-column:${column}" class="map-stop${current ? ' is-current' : ''}${complete ? ' is-complete' : ''}${!ready ? ' is-locked' : ''}"><button class="map-choice" ${ready ? `data-action="${action}"${id !== undefined ? ` data-id="${id}"` : ''}` : 'disabled'} aria-label="${index + 1}번째, ${esc(title)}, ${esc(detail)}, ${status}"${current ? ' aria-current="step"' : ''}><span class="map-node"><span class="map-picture" aria-hidden="true">${image ? `<img src="${esc(image)}" alt="" width="160" height="160" decoding="async">` : icon(symbol)}</span><span class="map-number" aria-hidden="true">${index + 1}</span>${(!ready && !developmentMode) || complete ? `<span class="map-badge" aria-hidden="true">${icon(complete ? 'check' : 'lock')}</span>` : ''}</span><span class="map-title">${esc(title)}</span><span class="map-detail">${esc(detail)}</span>${current ? `<span class="map-current-label">${status}</span>` : ''}</button></li>`;
}
export function renderLearningMap(state) {
  const level = selectedLevel(state);
  if (level > 7) return `<section class="map-empty"><span aria-hidden="true">${icon('lock')}</span><h1>${level}단계 학습을 준비하고 있어요</h1></section>`;
  let lessons, title, count;
  if (level === 1) {
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
    const p=labelsProgress(state),ready=labelsUnlocked(state);count+=Number(p.completed);
    lessons.push({title:'그림에 이름표 붙이기',symbol:'cards',ready,complete:p.completed,current:next<0&&ready&&!p.completed,detail:'かさ · くつ · はな · ねこ',status:p.completed?'학습 완료':ready?p.started?'이어하기':'시작하기':'46자를 마치면 열려요',action:'labels'});
    const listening=listeningProgress(state);count+=Number(listening.completed);
    lessons.push({title:'듣고 사진 고르기',symbol:'sound',ready:listeningUnlocked(state),complete:listening.completed,current:p.completed&&!listening.completed,detail:'소리와 뜻 연결하기',status:listening.completed?'학습 완료':listening.started?'이어하기':'시작하기',action:'listening'});
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
  return `<section class="learning-map" aria-label="${title} 학습 지도"><div class="map-overview"><h1>${title}</h1><span>${level>=6?`${count}件 完了`:`${count}개 완료`}</span></div><div class="map-layout"><div class="map-road" aria-hidden="true">${Array.from({length:Math.ceil(lessons.length / 2)}, () => '<span class="map-road-row"></span>').join('')}</div><ol class="map-grid">${lessons.map(stop).join('')}</ol></div></section>`;
}
