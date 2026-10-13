import {esc,icon} from './ui.js';
export function matchingMarkup(letters,matches=[]){
 const shift=letters.length===5?2:1;
 const readings=[...letters.slice(shift),...letters.slice(0,shift)];
 const column=(items,side)=>`<div class="kana-match-column" aria-label="${side==='glyph'?'글자':'발음'}">${items.map(l=>{
  const done=matches.includes(l.id),color=letters.findIndex(x=>x.id===l.id);
  return `<button type="button" class="kana-match-node${done?' matched':''}" data-match-side="${side}" data-match-id="${l.id}" style="--match-color:var(--pair-${color})" aria-label="${esc(side==='glyph'?l.text+' 글자':l.reading+' 발음')}${done?', 연결 완료':''}" aria-pressed="false" ${done?'disabled':''}><span ${side==='glyph'?'lang="ja"':''}>${esc(side==='glyph'?l.text:l.reading)}</span>${done?icon('check'):''}</button>`;
 }).join('')}</div>`;
 return `<div class="kana-match-board" data-matching aria-label="글자와 발음 연결하기"><svg class="kana-match-lines" aria-hidden="true"><g data-match-lines></g><path data-match-preview hidden /></svg>${column(letters,'glyph')}${column(readings,'reading')}</div>`;
}
export function mountMatching(root,onMatch){
 const board=root.querySelector('[data-matching]');if(!board)return ()=>{};
 const svg=board.querySelector('svg'),lines=board.querySelector('[data-match-lines]'),preview=board.querySelector('[data-match-preview]');
 let selected=null,pointer=null,start=null,moved=false,suppressClick=false;
 const node=target=>target?.closest?.('.kana-match-node:not(:disabled)');
 const point=button=>{const r=button.getBoundingClientRect(),b=board.getBoundingClientRect();return {x:(button.dataset.matchSide==='glyph'?r.right:r.left)-b.left,y:r.top+r.height/2-b.top};};
 const curve=(a,b)=>{const distance=Math.abs(b.x-a.x)*.5;return `M ${a.x} ${a.y} C ${a.x+distance} ${a.y}, ${b.x-distance} ${b.y}, ${b.x} ${b.y}`;};
 const endpoints=(first,second)=>first.dataset.matchSide==='glyph'?[point(first),point(second)]:[point(second),point(first)];
 function redraw(){
  const rect=board.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);lines.replaceChildren();
  for(const left of board.querySelectorAll('[data-match-side="glyph"].matched')){
   const right=board.querySelector(`[data-match-side="reading"][data-match-id="${left.dataset.matchId}"]`);
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',curve(...endpoints(left,right)));path.style.stroke=getComputedStyle(left).getPropertyValue('--match-color');lines.append(path);
  }
 }
 function select(button){
  selected=button;
  for(const b of board.querySelectorAll('.kana-match-node')){const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}
 }
 function connect(first,second,keyboard=false){
  if(first.dataset.matchSide===second.dataset.matchSide){select(second);return;}
  const [left,right]=first.dataset.matchSide==='glyph'?[first,second]:[second,first];
  onMatch({type:'kana-match',left:left.dataset.matchId,right:right.dataset.matchId,keyboard});
 }
 function down(e){
  const button=node(e.target);
  if(!button||pointer!==null||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
  pointer=e.pointerId;start={button,x:e.clientX,y:e.clientY};moved=false;board.setPointerCapture(pointer);
 }
 function move(e){
  if(e.pointerId!==pointer)return;
  if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)moved=true;
  if(!moved)return;
  select(start.button);const rect=board.getBoundingClientRect(),cursor={x:e.clientX-rect.left,y:e.clientY-rect.top},anchor=point(start.button);
  preview.removeAttribute('hidden');preview.setAttribute('d',curve(...(start.button.dataset.matchSide==='glyph'?[anchor,cursor]:[cursor,anchor])));
 }
 function release(){
  const id=pointer;pointer=null;preview.setAttribute('hidden','');if(id!==null&&board.hasPointerCapture(id))board.releasePointerCapture(id);
 }
 function up(e){
  if(e.pointerId!==pointer)return;
  const target=node(document.elementFromPoint(e.clientX,e.clientY)),first=start.button,dragged=moved;
  release();if(!dragged)return;
  suppressClick=true;
  if(target&&target!==first)connect(first,target);else select(null);
 }
 function cancel(e){if(e.pointerId===pointer){release();select(null);}}
 function click(e){
  if(suppressClick&&e.detail!==0){suppressClick=false;return;}
  suppressClick=false;const button=node(e.target);if(!button)return;
  if(selected===button)select(null);else if(selected)connect(selected,button,e.detail===0);else select(button);
 }
 function key(e){if(e.key==='Escape'){release();select(null);}}
 board.addEventListener('pointerdown',down);board.addEventListener('pointermove',move);board.addEventListener('pointerup',up);board.addEventListener('pointercancel',cancel);board.addEventListener('lostpointercapture',cancel);board.addEventListener('click',click);board.addEventListener('keydown',key);
 const observer=new ResizeObserver(redraw);observer.observe(board);redraw();
 return ()=>{release();observer.disconnect();for(const [type,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click],['keydown',key]])board.removeEventListener(type,handler);};
}
