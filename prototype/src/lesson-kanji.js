import {esc,icon} from './ui.js';
import {writingMarkup,mountWriting} from './kana-writing.js';
import {showSheet,closeSheet} from './sheet.js';
let data,styles,active=false;
const loadStyles=()=>styles ||= Promise.all(['src/kana.css','src/lesson-kanji.css'].map(href=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.onload=resolve;link.onerror=()=>{link.remove();styles=null;reject(Error('Writing styles unavailable'));};document.head.append(link);})));
export async function openLessonKanji(key,{trigger=document.activeElement}={}){
 if(active)return;active=true;
 try{await loadStyles();data ||= await fetch('assets/lesson-kanji/lessons.json').then(r=>{if(!r.ok)throw Error('Kanji unavailable');return r.json();});}catch(e){active=false;throw e;}
 const scene=data.scenes[key];if(!scene){active=false;throw Error('Unknown lesson');}
 const dialog=document.createElement('dialog');dialog.className='lesson-kanji-sheet';dialog.lang='ko';dialog.setAttribute('aria-labelledby','lesson-kanji-title');
 let word=scene.words.length?0:-1,index=0,dispose=()=>{},alive=true;
 const glyphs=()=>word<0?scene.glyphs:[...new Set(scene.words[word][0].match(/\p{Script=Han}/gu)||[])];
 const render=()=>{
  dispose();const chars=glyphs(),glyph=chars[index],record=data.characters[glyph],example=scene.words[word];
  dialog.innerHTML=`<div class="kanji-sheet-head"><h2 id="lesson-kanji-title">한자 뜻과 쓰기</h2><button type="button" class="icon-button" data-kanji-close aria-label="닫기">${icon('close')}</button></div><label class="kanji-word-select">문장 속 표현<select data-kanji-word><option value="-1" ${word<0?'selected':''}>이 문장의 모든 한자</option>${scene.words.map(([text,reading],i)=>`<option value="${i}" ${word===i?'selected':''}>${esc(text)} · ${esc(reading)}</option>`).join('')}</select></label>${example?`<p class="kanji-example"><ruby lang="ja">${esc(example[0])}<rt>${esc(example[1])}</rt></ruby><span>${esc(example[2])}</span>${example[3]?`<small>본문: <span lang="ja">${esc(example[3])}</span></small>`:''}</p>`:''}<label class="kanji-glyph-select">글자 고르기<select data-kanji-glyph>${chars.map((c,i)=>`<option value="${i}" ${index===i?'selected':''}>${esc(c)} · ${esc(data.characters[c].koreanHanja)}</option>`).join('')}</select></label><div class="kanji-definition"><strong lang="ja">${esc(glyph)}</strong><div><p class="kanji-hanja-label">한국어 음훈</p><h3 class="kanji-hanja">${esc(record.koreanHanja)}</h3><p class="kanji-meaning">${esc(record.meaning)}</p><p>음독 <span lang="ja">${esc(record.on.join(' · ')||'—')}</span></p><p>훈독 <span lang="ja">${esc(record.kun.map(x=>x.replaceAll('.','').replace(/^-/,'' )).join(' · ')||'—')}</span></p></div></div><div class="kanji-canvas-host">${writingMarkup({id:`lesson-kanji:${key}:${glyph}`,text:glyph,strokeSource:'assets/lesson-kanji/strokes.json'})}</div><div class="button-pair"><button type="button" class="secondary" data-kanji-step="-1" ${index===0?'disabled':''}>이전 글자</button><button type="button" class="primary" data-kanji-step="1" ${index===chars.length-1?'disabled':''}>다음 글자</button></div>`;
  dispose=mountWriting(dialog);
 };
 const close=()=>{if(!alive)return;alive=false;dispose();closeSheet(dialog);dialog.remove();active=false;if(trigger?.isConnected)trigger.focus({preventScroll:true});};
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-kanji-close]'))return close();const b=e.target.closest('[data-kanji-step]');if(b&&!b.disabled){index+=Number(b.dataset.kanjiStep);render();dialog.querySelector('[data-kanji-glyph]').focus({preventScroll:true});}});
 dialog.addEventListener('change',e=>{if(e.target.matches('[data-kanji-word]')){word=Number(e.target.value);index=0;render();dialog.querySelector('[data-kanji-word]').focus({preventScroll:true});}else if(e.target.matches('[data-kanji-glyph]')){index=Number(e.target.value);render();dialog.querySelector('[data-kanji-glyph]').focus({preventScroll:true});}});
 document.body.append(dialog);showSheet(dialog);render();dialog.querySelector('[data-kanji-close]').focus({preventScroll:true});
}
