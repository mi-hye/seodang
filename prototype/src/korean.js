import {caseLesson} from './case-lesson.js';
import {renderKoreanSpeaking} from './korean-speaking.js';
export {mountKoreanSpeaking} from './korean-speaking.js';
import {feedbackText} from './feedback-text.js';
import {extraKoreanCases,levelTwoAudio} from './level-two-content.js';
import {passageAudioControls} from './passage-audio.js';

import {koreanCaseQuestions,koreanCases,renderKoreanCase,koreanCaseWords,koreanCaseImage} from './korean-cases.js';
import {renderKoreanLetters,composeKorean,koreanExampleAudio} from './korean-letters.js';
export {composeKorean,koreanExampleAudio};
export {renderKoreanLettersComplete} from './korean-letters.js';
import {mountKoreanStrokes} from './korean-strokes.js';
import {koreanContent} from './korean-content.js';
import {koreanLessons,koreanProgress,koreanQuizOnly} from './korean-state.js';
import {button,esc,icon,phraseText} from './ui.js';
export function koreanAudio(s){const id=s.korean.active,p=koreanProgress(s,id),item=koreanContent[id][p.index];if(extraKoreanCases[id])return levelTwoAudio(`korean.${id}.${p.index}`,item.text,'ko-KR');return {id:`korean.${id}.${p.index}`,text:item.spoken||item.text,locale:'ko-KR',playbackRate:koreanLessons.find(l=>l.id===id)?.level===2?0.8:undefined,status:'ready',audioFile:`assets/audio/korean/korean.${id}.${p.index}.wav`,productionMethod:'Selected offline TTS',voice:'Supertonic 3 M1',voiceId:'Supertonic 3 M1'};}
export function koreanIntroAudio(s){
 const id=s.korean.active,l=koreanLessons.find(l=>l.id===id);
 if(!l||![2,4].includes(l.level)||l.retired||koreanProgress(s,id).phase!=='scenario')return [];
 return koreanContent[id].map((_,index)=>koreanAudio({...s,korean:{...s.korean,lessons:{...s.korean.lessons,[id]:{...koreanProgress(s,id),index}}}}));
}
function renderCafeCue(cue){
 if(!cue)return '';
 const parts=cue.match(/^(.*?)(（[^）]+）)$/u);
 if(!parts)return `<p>${esc(cue)}</p>`;
 return `<p class="case-lesson-cue"><span lang="ko">${esc(parts[1])}</span><span lang="ja">${esc(parts[2])}</span></p>`;
}
export function renderKorean(s,top){
 if(koreanProgress(s,s.korean.active).phase==='speak')return renderKoreanSpeaking(top,koreanContent[s.korean.active][koreanProgress(s,s.korean.active).index].text);
 if(koreanProgress(s,s.korean.active).phase==='scenario'&&koreanCases[s.korean.active])return renderKoreanCase(s,top);
 if(koreanLessons.find(l=>l.id===s.korean.active)?.level===0)return renderKoreanLetters(s,top);
 const id=s.korean.active,l=koreanLessons.find(l=>l.id===id),p=koreanProgress(s,id),item=koreanContent[id][p.index],learn=p.phase==='learn',reading=l.level>=5,audioOnly=false;
 if(id==='4-1'&&learn)return `${top(l.title)}${caseLesson({index:p.index,count:l.count,image:'assets/cafe-dusk-v2.jpg',content:`${renderCafeCue(item.cue)}<div class="audio-text-row"><p lang="ko">${phraseText(item.text)}</p>${button(icon('sound'),'korean-audio','icon-button','aria-label="もう一度聞く"')}</div>`,meaning:item.meaning,words:(koreanCases[id]?.words[p.index]||[]).filter(([word])=>item.text.includes(word)),lang:'ko',japanese:true,actions:button('戻る','korean-previous','secondary')+button('場面で使う','korean-next')})}`;
 const options=[...item.others];options.splice(p.index%3,0,item.answer||item.text);
 if(id==='4-1'&&!learn)return `${top(l.title)}${caseLesson({index:p.index,count:l.count,image:'assets/cafe-dusk-v2.jpg',content:`<div class="audio-text-row"><h1>${esc(koreanCaseQuestions[id]?.[p.index]||item.meaning)}</h1>${button(icon('sound'),'korean-audio','icon-button','aria-label="もう一度聞く"')}</div>`,lang:'ko',japanese:true,extra:`<div class="case-lesson-choices">${options.map((o,i)=>button(phraseText(o),'korean-select',`secondary${p.selected===i?' selected':''}`,`data-id="${i}" lang="ko" aria-pressed="${p.selected===i}"`)).join('')}</div>${p.retry?`<p role="status">${feedbackText(item.wrongFeedback?.[options[p.selected]]||item.explanation||'もう一度選んでください。')}</p>`:''}`,actions:button('戻る','korean-previous','secondary')+button('確認','korean-check','primary',p.selected===null?'disabled':'')})}`;
 const trace=learn&&l.level===0;
 const practice=Boolean(l.practice),single=koreanQuizOnly(l);
 const selected=p.selected===null?null:options[p.selected];
 const parts=practice?item.parts.map((part,i)=>i===item.blank?(selected||'＿'):part):[];
 const assembly=practice?`<div class="korean-assembly" aria-live="polite" lang="ko">${parts.map((part,i)=>`<span class="${i===item.blank?'assembly-slot':''}">${esc(part)}</span>`).join('<span class="assembly-plus">+</span>')}<span class="assembly-plus">=</span><strong>${esc(selected?composeKorean(parts):'？')}</strong></div>`:'';
 const ko=l.level>=7;
 const listen=reading?passageAudioControls(s,'korean-audio',!ko):button(icon('sound'),'korean-audio','icon-button',`aria-label="${ko?'다시 듣기':'もう一度聞く'}"`);
 return `${top(`${l.level}-${koreanLessons.filter(x=>x.level===l.level).findIndex(x=>x.id===id)+1} · ${l.title}`)}<main class="page korean-page"><div class="korean-count">${p.index*(single?1:2)+(learn||single?1:2)}/${l.count*(single?1:2)}</div>${learn?`<div class="korean-learn${reading?' korean-case-passage':''}">${koreanCaseImage(id,p.index)}${trace?`<div class="audio-text-row"><h1 lang="ko">${phraseText(item.text)}</h1>${listen}</div><div class="korean-writing" data-korean-glyph="${esc(item.text)}"><div class="korean-stroke-layer"></div><canvas data-korean-writing="${id}-${p.index}" aria-label="${esc(item.text)}をなぞる練習欄"></canvas></div><div class="button-pair korean-writing-tools"><button type="button" class="text-button" data-korean-strokes disabled>書き順</button>${button('消す','korean-clear','text-button')}</div><span class="korean-stroke-status" role="status"></span>`:`<div class="${l.level>=5?'passage-audio':'audio-text-row'}"><${reading?'article class="korean-passage"':'h1'} lang="ko">${phraseText(item.text)}</${reading?'article':'h1'}>${listen}</div>`}${item.meaning?`<p>${esc(item.meaning)}</p>`:''}${koreanCaseWords(id,p.index,item.text)}${item.cue?`<p class="korean-cue">${esc(item.cue)}</p>`:''}</div>`:`${reading?`${audioOnly?`<div class="korean-listen button-pair">${button(`${ko?'듣기':'聞く'} ${icon('sound')}`,'korean-audio','secondary')}${button('停止','korean-stop','secondary')}</div>`:`<div class="${l.level>=5?'passage-audio':'audio-text-row'}"><article class="korean-passage" lang="ko">${phraseText(item.text)}</article>${listen}</div>`}<h1 class="korean-question">${esc(item.question)}</h1>`:practice?`<div class="korean-question"><div class="audio-text-row"><h1>${esc(item.question)}</h1>${listen}</div>${item.cue?`<p class="korean-cue">${esc(item.cue)}</p>`:''}</div>${assembly}`:`<div class="korean-question audio-text-row"><h1>${esc(koreanCaseQuestions[id]?.[p.index]||item.meaning)}</h1>${listen}</div>`}<div class="korean-choices${practice?' korean-composition-choices':''}">${options.map((o,i)=>button(phraseText(o),'korean-select',`korean-choice${p.selected===i?' selected':''}`,`data-id="${i}" lang="ko" aria-pressed="${p.selected===i}"`)).join('')}</div><p class="korean-feedback" role="status">${p.retry?feedbackText(item.wrongFeedback?.[selected]||item.explanation||(ko?'다시 골라 주세요.':'もう一度選んでください。')):''}</p>`}<div class="button-pair">${button(ko?'이전':'戻る','korean-previous','secondary',p.index===0&&(learn||single)&&!koreanCases[id]?'disabled':'')}${button(learn?(ko?'문제 풀기':'場面で使う'):(ko?'확인':'確認'),learn?'korean-next':'korean-check','primary',!learn&&p.selected===null?'disabled':'')}</div></main>`;
}
// Drawing is practice, not automatic handwriting assessment. Strokes are kept on resize.
const drafts=new Map();
export function mountKoreanWriting(root){const canvas=root.querySelector('[data-korean-writing]');if(!canvas)return()=>{};const ctx=canvas.getContext('2d'),key=canvas.dataset.koreanWriting;if(!ctx)return()=>{};if(!drafts.has(key))drafts.set(key,[]);const strokes=drafts.get(key),next=root.querySelector('[data-writing-next]');let stroke,pointer,size;
 const ready=()=>{if(next)next.disabled=!strokes.some(line=>line.length>1&&line.some((p,i)=>i&&Math.hypot(p[0]-line[0][0],p[1]-line[0][1])>.015));};
 const prevent=e=>{e.preventDefault();window.getSelection()?.removeAllRanges();};
 const draw=()=>{ready();ctx.clearRect(0,0,size,size);const paper=canvas.parentElement.classList.contains('practice-board');ctx.strokeStyle=paper?'#173221':'#ffd79a';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=paper?4:5;ctx.lineCap='round';ctx.lineJoin='round';for(const line of strokes){ctx.beginPath();line.forEach(([x,y],i)=>i?ctx.lineTo(x*size,y*size):ctx.moveTo(x*size,y*size));if(line.length===1){ctx.arc(line[0][0]*size,line[0][1]*size,2.5,0,Math.PI*2);ctx.fill();}else ctx.stroke();}};
 const resize=()=>{size=canvas.getBoundingClientRect().width;const dpr=Math.min(devicePixelRatio||1,3);canvas.width=size*dpr;canvas.height=size*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();};
 const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
 const down=e=>{if(canvas.parentElement.dataset.strokeDemo==='true'||pointer!==undefined||e.isPrimary===false||e.pointerType==='mouse'&&e.button!==0)return;prevent(e);pointer=e.pointerId;stroke=[point(e)];strokes.push(stroke);canvas.setPointerCapture(pointer);draw();};
 const move=e=>{if(e.pointerId!==pointer)return;e.preventDefault();prevent(e);stroke.push(point(e));draw();};
 const up=e=>{if(e.pointerId===pointer){if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=undefined;}};
 for(const type of ['selectstart','contextmenu','dragstart'])canvas.addEventListener(type,prevent);
 const clear=()=>{strokes.length=0;draw();},clearButton=root.querySelector('[data-action=korean-clear]');clearButton.addEventListener('click',clear);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);const observer=new ResizeObserver(resize);observer.observe(canvas);resize();const disposeStrokes=canvas.parentElement.querySelector('.korean-stroke-layer')?mountKoreanStrokes(canvas.parentElement,{autoPlay:strokes.length===0}):()=>{};return()=>{for(const type of ['selectstart','contextmenu','dragstart'])canvas.removeEventListener(type,prevent);disposeStrokes();observer.disconnect();clearButton.removeEventListener('click',clear);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
}

export function clearKoreanDraft(s){drafts.delete(`${s.korean.active}-${koreanProgress(s,s.korean.active).index}`);}
