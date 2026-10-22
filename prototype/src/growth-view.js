import {button,esc} from './ui.js';
import {courseGroup,courseName,displayLevel,japaneseLessonUI} from './curriculum.js';
import {selectedLevel} from './kana-state.js';
import {GROWTH_MAX_LENGTH,growthEntry} from './growth-state.js';
import {growthSituations} from './growth-content.js';

export const formatDay=(on,jp)=>new Intl.DateTimeFormat(jp?'ja-JP':'ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(`${on}T12:00:00`));

export function renderGrowth(state,header,{screen='overview',notice='',error='',pendingText}={}){
 const jp=japaneseLessonUI(state),L=(ko,ja)=>jp?ja:ko,learn=jp?'ko':'ja',ui=jp?'ja':'ko';
 const level=courseGroup(selectedLevel(state)),entry=growthEntry(state),answers=entry.answers,draft=entry.draft;
 const situation=`<section class="growth-situation"><p class="growth-label">${L('상황','場面')}</p><p>${esc(growthSituations[state.courseDirection][level])}</p></section>`;
 const title=L('처음의 나와 지금의 나','最初の自分と今の自分');
 const status=(message,kind='')=>`<p class="growth-status${kind?` ${kind}`:''}" role="status">${esc(message)}</p>`;
 const eyebrow=`<p class="growth-eyebrow">${displayLevel(level)}. ${esc(courseName(level,jp))}</p>`;
 if(screen==='write'){
  const value=pendingText??draft?.text??'';
  const restored=pendingText===undefined&&draft?.text?L(`쓰던 답을 불러왔어요 · ${formatDay(draft.on,jp)}`,`書きかけの答えを読み込みました · ${formatDay(draft.on,jp)}`):'';
  return `${header(title)}<main class="page growth-page growth-write" lang="${ui}">${eyebrow}<h1>${L('내 답 쓰기','答えを書く')}</h1>${situation}
<label class="growth-field" for="growth-answer">${L('일본어로 답해 주세요','韓国語で答えましょう')}</label>
<textarea id="growth-answer" class="growth-input" data-growth-draft lang="${learn}" maxlength="${GROWTH_MAX_LENGTH}" rows="5" autocomplete="off">${esc(value)}</textarea>
<p class="growth-count" data-growth-count>${value.length} / ${GROWTH_MAX_LENGTH}</p>
${error?status(error,'is-error'):status(restored)}
<div class="button-pair">${button(L('이전','戻る'),'growth-cancel','secondary')}${button(L('저장','保存'),'growth-save','primary',value.trim()?'':'disabled')}</div></main>`;
 }
 const card=(label,a)=>`<article class="growth-answer"><p class="growth-label">${label} · ${formatDay(a.on,jp)}</p><p class="growth-text" lang="${learn}">${esc(a.text)}</p><p class="growth-fact">${L(`그때까지 마친 학습 ${a.completed}개`,`その時点で終えた学習 ${a.completed}件`)}</p></article>`;
 let body;
 if(!answers.length)body=`<p class="growth-note">${L('아직 남긴 답이 없어요. 지금 답을 남겨 두면, 학습을 이어 간 뒤 같은 상황에 다시 답해 나란히 볼 수 있어요.','まだ答えがありません。今の答えを残しておくと、学習を続けたあとに同じ場面でもう一度答えて並べて見られます。')}</p>`;
 else if(answers.length===1)body=`${card(L('처음 남긴 답','最初の答え'),answers[0])}<p class="growth-note">${L('수업을 더 마친 뒤 같은 상황에 다시 답해 보세요. 두 답을 나란히 볼 수 있어요.','授業をもう少し進めたら、同じ場面にもう一度答えてみましょう。二つの答えを並べて見られます。')}</p>`;
 else body=`<div class="growth-compare">${card(L('처음 남긴 답','最初の答え'),answers[0])}${card(L('최근 답','最近の答え'),answers.at(-1))}</div>${answers.length>2?`<p class="growth-note">${L(`남긴 답 ${answers.length}개 중 처음과 최근 답이에요.`,`残した答え${answers.length}件のうち、最初と最近の答えです。`)}</p>`:''}`;
 const draftNote=draft?.text?`<p class="growth-note">${L(`쓰던 답이 있어요 · ${formatDay(draft.on,jp)}`,`書きかけの答えがあります · ${formatDay(draft.on,jp)}`)}</p>`:'';
 const next=draft?.text?L('이어 쓰기','続きを書く'):answers.length?L('다시 답하기','もう一度答える'):L('답 쓰기','答えを書く');
 return `${header(title)}<main class="page growth-page" lang="${ui}">${eyebrow}<h1>${title}</h1>${situation}${body}${draftNote}${notice?status(notice):''}
<div class="button-pair">${button(L('학습 기록','学習記録'),'my','secondary')}${button(next,'growth-write','primary')}</div></main>`;
}
