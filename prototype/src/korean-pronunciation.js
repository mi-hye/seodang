import {pronunciationRecords,pronunciationParts,finalPronunciation} from './korean-pronunciation-data.js';
import {pronunciationDiagram} from './korean-pronunciation-diagram.js';
import {koreanContent} from './korean-content.js';
import {esc,icon} from './ui.js';
import {showSheet,closeSheet} from './sheet.js';
let styles,active;
function loadStyles(){return styles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/korean-pronunciation.css';link.onload=resolve;link.onerror=()=>{link.remove();styles=null;reject(Error('Pronunciation styles unavailable'));};document.head.append(link);});}
export function pronunciationAudio(text){for(const [id,items] of Object.entries(koreanContent)){const index=items.findIndex(item=>item.text===text&&(item.spoken||item.text)===text);if(index>=0)return {id:`korean.${id}.${index}`,text,locale:'ko-KR',status:'ready',audioFile:`assets/audio/korean/korean.${id}.${index}.wav`};}return {id:`pronunciation.${text}`,text,locale:'ko-KR',status:'ready',voiceId:'Supertonic 3 M1',audioFile:`assets/audio/korean-pronunciation/${text.codePointAt(0).toString(16)}.wav`};}
const control=(label,action,value,selected)=>`<button type="button" data-pronunciation="${action}" data-value="${esc(value)}" aria-pressed="${selected}">${label}</button>`;
export async function openPronunciation(text,{play,stop,trigger=document.activeElement}={}){
 const parts=pronunciationParts(text);if(!parts.length||active)return;
 active=true;
 try{await loadStyles();}catch(error){active=false;throw error;}
 const dialog=document.createElement('dialog');dialog.className='pronunciation-sheet';dialog.lang='ja';dialog.setAttribute('aria-labelledby','pronunciation-title');
 let glyph=parts[0].glyph,isFinal=false,step=0,alive=true,request=0;
 const record=()=>isFinal?finalPronunciation(glyph):pronunciationRecords[glyph];
 const halt=()=>{request++;stop?.();};
 const render=()=>{
  const r=record(),final=finalPronunciation(glyph),phase=r.poses.length===2;
  dialog.innerHTML=`<div class="panel-head"><h2 id="pronunciation-title">発音のコツ</h2><button type="button" class="icon-button" data-pronunciation="close" aria-label="閉じる">${icon('close')}</button></div><div class="panel-body"><div class="pronunciation-top"><strong class="pronunciation-glyph" lang="ko">${esc(glyph)}</strong><div class="pronunciation-sample"><span lang="ko">${esc(r.sample)}</span><button type="button" class="icon-button" data-pronunciation="audio" aria-label="${esc(r.sample)}の発音を聞く">${icon('sound')}</button></div></div>${parts.length>1?`<div class="pronunciation-controls${parts.length===2?' button-pair':''}" role="group" aria-label="${esc(text)}の文字">${parts.map((p,i)=>control(`<span lang="ko">${esc(p.glyph)}</span>${p.final?' · パッチム':''}`,'part',String(i),p.glyph===glyph&&p.final===isFinal)).join('')}</div>`:''}${final&&parts.length===1?`<div class="pronunciation-controls button-pair" role="group" aria-label="文字の位置">${control('はじめの音','position','initial',!isFinal)}${control('パッチム','position','final',isFinal)}</div>`:''}${phase?`<div class="pronunciation-controls button-pair" role="group" aria-label="口の動き">${control('① はじめ','step','0',step===0)}${control('② おわり','step','1',step===1)}</div>`:''}<div data-pronunciation-diagram>${pronunciationDiagram(r,step)}</div><div class="pronunciation-legend"><span><i></i>舌</span>${r.kind==='consonant'&&!['silent','glottal','sibilant'].includes(r.poses[0])?'<span><i class="contact-dot"></i>触れる場所</span>':''}${r.nasal?'<span>点線：鼻への息</span>':r.aspirated?'<span>点線：出す息</span>':''}</div><p class="pronunciation-cue">${esc(r.cue)}</p><p class="pronunciation-note">${esc(r.note)}</p>${r.compare?`<p class="pronunciation-compare-label">比べてみよう</p><div class="pronunciation-controls${r.compare.length===2?' button-pair':''}" role="group" aria-label="似た音">${Array.from(r.compare,char=>control(`<span lang="ko">${esc(char)}</span>`,'compare',char,char===glyph)).join('')}</div>`:''}<p class="pronunciation-status" role="status"></p><p class="pronunciation-caption">横から見た模式図です。形を確かめ、音声をまねしてみよう。</p></div>`;
 };
 const close=()=>{if(!alive)return;alive=false;halt();document.removeEventListener('visibilitychange',hidden);closeSheet(dialog);dialog.remove();active=false;if(trigger?.isConnected)trigger.focus({preventScroll:true});};
 const hidden=()=>{if(document.hidden){halt();const button=dialog.querySelector('[data-pronunciation=audio]');if(button)button.disabled=false;}};
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('click',async e=>{
  const button=e.target.closest('[data-pronunciation]');if(!button||button.disabled)return;
  const action=button.dataset.pronunciation,value=button.dataset.value;
  if(action==='close'){close();return;}
  if(action==='audio'){
   const token=++request;button.disabled=true;const status=dialog.querySelector('.pronunciation-status');status.textContent='';
   const fail=()=>{if(alive&&token===request)status.textContent='再生できませんでした。もう一度お試しください。';};
   try{await play(pronunciationAudio(record().sample),fail);}catch{fail();}finally{if(alive&&token===request)button.disabled=false;}return;
  }
  halt();
  if(action==='step')step=Number(value);
  if(action==='part'){const p=parts[Number(value)];glyph=p.glyph;isFinal=p.final;step=0;}
  if(action==='position'){isFinal=value==='final';step=0;}
  if(action==='compare'){glyph=value;isFinal=false;step=0;}
  render();dialog.querySelector(`[data-pronunciation="${action}"][data-value="${value}"]`)?.focus({preventScroll:true});
 });
 stop?.();render();document.body.append(dialog);document.addEventListener('visibilitychange',hidden);showSheet(dialog);dialog.querySelector('[data-pronunciation=close]').focus({preventScroll:true});
}
