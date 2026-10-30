import {courseName} from './curriculum.js';
import {comparisonCourseContent} from './comparison-course-content.js';
import {koreanProgress} from './korean-state.js';
import {button,esc,icon,quotedText} from './ui.js';
import {mountLessonCorrect} from './lesson-answer-feedback.js';

const current=s=>comparisonCourseContent[s.korean.active][koreanProgress(s,s.korean.active).index];
export function particleAudio(s,text){
 const unit=current(s),phase=koreanProgress(s,s.korean.active).phase;
 const rows=phase==='learn'?unit.examples:phase==='review'?[unit.question]:[];
 return rows.find(row=>row.text===text)?.audio;
}
// Keep each Korean word intact while marking only the intended comparison expression.
export function particleText(row){
 let offset=0;
 return row.text.split(/(\s+)/).map(word=>{
  const start=offset;offset+=word.length;if(/^\s+$/.test(word))return esc(word);
  const a=Math.max(start,row.focus.start),b=Math.min(offset,row.focus.end);
  const text=a<b?`${esc(word.slice(0,a-start))}<em>${esc(word.slice(a-start,b-start))}</em>${esc(word.slice(b-start))}`:esc(word);
  return `<span class="particle-word">${text}</span>`;
 }).join('');
}
const audioButton=row=>row.audio?button(icon('sound'),'particle-audio','icon-button',`data-id="${esc(row.text)}" aria-label="${esc(row.text)}の音を聞く"`):'';
const example=row=>`<article class="particle-example">${row.scene?`<p class="particle-scene">${quotedText(row.scene)}</p>`:''}<div class="audio-text-row"><h2 lang="ko">${particleText(row)}</h2>${audioButton(row)}</div><p class="particle-meaning">${quotedText(row.meaning)}</p></article>`;
const correctMark=`<span class="review-correct-mark" aria-hidden="true">${icon('check')}<i></i><i></i><i></i><i></i></span>`;
export function renderParticleCourse(s,top){
 const p=koreanProgress(s,s.korean.active),unit=current(s),q=unit.question,learn=p.phase==='learn',review=p.phase==='review';
 const nav=`<div class="button-pair particle-navigation">${button('戻る','korean-previous','secondary',learn&&p.index===0?'disabled':'')}${button(learn?'使ってみる':review?'次へ':'確認',learn||review?'korean-next':'korean-check','primary',!learn&&!review&&p.selected===null?'disabled':'')}</div>`;
 let body;
 if(learn){
  body=`<h1>${quotedText(unit.heading)}</h1><section class="particle-examples" aria-label="例文">${unit.examples.map(example).join('')}</section><div class="particle-explanation">${unit.explanation.map(text=>`<p>${quotedText(text)}</p>`).join('')}${unit.note?`<p class="particle-note">${quotedText(unit.note)}</p>`:''}</div>`;
 }else{
  const interpretation=q.kind==='meaning',picked=p.selected===null?'＿':q.choices[p.selected].text;
  const target=interpretation?`<p class="particle-question" lang="ko">${particleText(q)}</p>`:`<p class="particle-question" lang="ko">${esc(q.before)}<span class="particle-gap${p.retry?' incorrect':''}" aria-label="選んだ助詞">${esc(picked)}</span>${esc(q.after)}</p>`;
  const choices=`<div class="particle-choices${interpretation?' particle-interpretation':''}" data-count="${q.choices.length}" role="group" aria-label="${interpretation?'文の意味を選ぶ':'助詞を選ぶ'}">${q.choices.map((choice,i)=>button(`${quotedText(choice.text)}${p.retry&&p.selected===i?`<span class="particle-wrong-mark" aria-hidden="true">${icon('close')}</span>`:''}`,'korean-select',`secondary${p.selected===i?' selected':''}${p.retry&&p.selected===i?' incorrect':''}`,`data-id="${i}" lang="${interpretation?'ja':'ko'}" aria-pressed="${p.selected===i}"`)).join('')}</div>`;
  const feedback=review?`<div class="particle-feedback lesson-verdict success review-correct" role="status">${correctMark}<strong>そうだね！</strong><p>${quotedText(q.choices[q.answer].feedback)}</p></div>`:p.retry?`<div class="particle-feedback particle-retry" role="status"><strong>もう一度選んでみよう</strong><p>${quotedText(q.choices[p.selected].feedback)}</p></div>`:'';
  body=`<h1 class="particle-context">${quotedText(q.context)}</h1>${review?example(q):target+choices}${feedback}`;
 }
 return `${top(courseName(s.onboardingLevel,true))}<main class="page particle-course" lang="ja" data-particle-phase="${p.phase}">${body}${nav}</main>`;
}
export function mountParticleCorrect(root,s){return mountLessonCorrect(root,s,'.particle-feedback');}
