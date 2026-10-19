import {expertProgress,expertPercent} from './expert-state.js';
import {readingPassage,readingOptions} from './reading-layout.js';
import {button,esc,phraseText,icon} from './ui.js';
let content;
export async function prepareExpert(){content ||= await fetch('src/expert-content.json').then(r=>{if(!r.ok)throw Error('Expert content unavailable');return r.json();});}
const clean=t=>t.replaceAll('|','');
const text=(t,ja)=>ja?phraseText(clean(t),t.includes('|')?t.split('|'):t.match(/[^、。！？]+[、。！？]?/gu)||[t]):phraseText(t);
export function expertAudio(s){const p=expertProgress(s),a=content?.[s.courseDirection]?.[s.expertActive??0];if(!a)return null;if(p.phase==='review'){const line=a.sentences[p.sentence];return {id:`expert.${s.courseDirection}.${s.expertActive}.${p.sentence}`,text:line.text,audioFile:line.audioFile,locale:a.audio.locale,status:'ready'};}return ['read','quiz'].includes(p.phase)?a.audio:null;}
export function renderExpert(s,top){
 const id=s.expertActive??0,p=expertProgress(s),a=content[s.courseDirection][id],ja=s.courseDirection==='ko-ja',lang=ja?'ja':'ko',q=a.questions[p.index];
 const head=top(`${id+1}. ${a.title}`),progress=`<div class="lesson-progress" role="progressbar" aria-label="학습 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${expertPercent(s)}"><span style="width:${expertPercent(s)}%"></span></div>`;
 const passage=readingPassage(s,{title:esc(a.title),content:a.paragraphs.map(t=>`<p>${text(t,ja)}</p>`).join(''),lang,action:'expert-audio'});
 let body;
 if(p.phase==='intro')body=`<h1>${esc(a.title)}</h1><p class="reading-intro">글 한 편을 읽고 문제를 풀어요. 그다음 문장별로 듣고 ${ja?'번역과 한자 뜻':'일본어 번역'}을 살펴봐요.</p>${button('사설 읽기','expert-next')}`;
 else if(p.phase==='read')body=`${passage}${button('문제 풀기','expert-next')}`;
 else if(p.phase==='quiz')body=`<div class="reading-count">${p.index+1} / ${a.questions.length}</div>${passage}<h2 class="reading-question" lang="${lang}">${text(q.prompt,ja)}</h2>${readingOptions({options:q.choices.map(t=>text(t,ja)),selected:p.selected,action:'expert-select',lang,disabled:p.checked})}${p.retry||p.checked?`<p class="reading-feedback" role="status" lang="${lang}">${text(q.hint,ja)}</p>`:''}<div class="button-pair">${button('이전','expert-previous','secondary')}${p.checked?button(p.index+1===a.questions.length?'문장별로 배우기':'다음 문제','expert-next'):button('확인','expert-check','primary',p.selected===null?'disabled':'')}</div>`;
 else if(p.phase==='review'){
  const line=a.sentences[p.sentence];
  body=`<div class="reading-count">${p.sentence+1} / ${a.sentences.length}</div><div class="expert-sentence audio-text-row"><p lang="${lang}">${text(line.text,ja)}</p>${button(icon('sound'),'expert-audio','icon-button','aria-label="문장 듣기"')}</div><section class="expert-translation"><h2>번역</h2><p lang="${ja?'ko':'ja'}">${text(line.translation,!ja)}</p></section>${ja&&line.kanjiKey?button('한자 뜻과 쓰기','lesson-kanji','secondary',`data-id="${line.kanjiKey}"`):''}<div class="button-pair">${button('이전 문장','expert-previous','secondary',p.sentence===0?'disabled':'')}${button(p.sentence+1===a.sentences.length?'학습 마치기':'다음 문장','expert-next')}</div>`;
 }
 return `${head}${progress}<main class="page reading-page expert-page" lang="ko">${body}</main>`;
}
