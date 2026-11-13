import {showSheet,closeSheet} from './sheet.js';
import {normalizeAudioRate} from './audio-rate.js';
import {icon} from './ui.js';
let active;
export function openAudioRateSheet({trigger,value,onSelect}){
 if(active?.open)return;
 const japanese=trigger.dataset.audioRateLanguage==='ja',title=japanese?'再生速度':'재생 속도';
 const rate=normalizeAudioRate(value),dialog=document.createElement('dialog');
 dialog.className='audio-rate-sheet';dialog.lang=japanese?'ja':'ko';dialog.setAttribute('aria-labelledby','audio-rate-title');
 dialog.innerHTML=`<style>
 .audio-rate-sheet .panel-head h2{font-size:calc(20px * var(--text-scale,1));margin:0}
 .audio-rate-sheet .audio-rate-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:20px 20px calc(24px + env(safe-area-inset-bottom,0px))}
 .audio-rate-options button{display:flex;align-items:center;justify-content:center;min-width:0;min-height:52px;width:100%;margin:0;padding:10px 2px;background:transparent;border:1px solid var(--paper-line);border-radius:12px;color:var(--ink);font-size:calc(16px * var(--text-scale,1));font-variant-numeric:tabular-nums}
 .audio-rate-options button[aria-pressed=true]{background:var(--amber);border-color:var(--amber);font-weight:700;color:var(--button-ink)}
 </style><div class="panel-head"><h2 id="audio-rate-title">${title}</h2><button type="button" class="icon-button" data-rate-close aria-label="${japanese?'閉じる':'닫기'}">${icon('close')}</button></div><div class="audio-rate-options" role="group" aria-labelledby="audio-rate-title">${Array.from({length:8},(_,i)=>(i+3)/10).map(n=>`<button type="button" data-rate-choice="${n}" aria-pressed="${n===rate}">${n.toFixed(1)}×</button>`).join('')}</div>`;
 let closed=false;
 const cleanup=()=>{if(closed)return;closed=true;closeSheet(dialog);dialog.remove();active=null;trigger.setAttribute('aria-expanded','false');if(trigger.isConnected)trigger.focus({preventScroll:true});};
 dialog.addEventListener('cancel',event=>{event.preventDefault();cleanup();});
 dialog.addEventListener('close',cleanup);
 dialog.addEventListener('click',event=>{
  const choice=event.target.closest('[data-rate-choice]');
  if(choice){onSelect(Number(choice.dataset.rateChoice));cleanup();return;}
  if(event.target.closest('[data-rate-close]')){cleanup();return;}
  if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)cleanup();}
 });
 document.body.append(dialog);active=dialog;trigger.setAttribute('aria-expanded','true');
 showSheet(dialog);dialog.querySelector('[aria-pressed=true]').focus({preventScroll:true});
}
