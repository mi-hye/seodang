import {japaneseLessonUI} from './curriculum.js';
import {renderCasePractice,mountCasePractice} from './case-practice.js';
import {practiceHasWriting,practiceRoundCount,normalizePractice,normalizeCasePractice} from './practice-state.js';
import {icon,phraseText,esc} from './ui.js';
import {caseTasks,practiceUnits,practiceDistractors,practiceKey,prepareContent,interceptCompletion} from './practice-content.js';
export {practiceKey,prepareContent,interceptCompletion};
const copy={ko:{title:'반복 연습',modes:['듣고 뜻을 골라요',null,'직접 써봐요'],listen:'듣기',next:'다음',check:'확인',retry:'다시 확인해 주세요.',clear:'지우기',audioError:'소리를 재생하지 못했어요. 다시 눌러 주세요.'},ja:{title:'繰り返し練習',modes:['聞いて意味を選ぶ',null,'書いてみよう'],listen:'聞く',next:'次へ',check:'確認',retry:'もう一度確かめてください。',clear:'消す',audioError:'再生できませんでした。もう一度お試しください。'}};
const japanese=s=>japaneseLessonUI(s);
export function practiceState(s,kind){return normalizePractice(normalizeCasePractice(s.practices?.[practiceKey(s,kind)],practiceKey(s,kind)),practiceRoundCount(practiceKey(s,kind)),practiceHasWriting(practiceKey(s,kind)));}
function model(s,kind){const p=practiceState(s,kind),units=practiceUnits(s,kind),unit=units[(p.index+p.round)%units.length],text='text',values=[...new Set([...units.map(x=>x[text]),...practiceDistractors(s,kind)].filter(x=>x&&x!==unit[text]))],options=values.slice(p.round%Math.max(1,values.length)).concat(values).filter((x,i,a)=>a.indexOf(x)===i).slice(0,3),answer=(p.index+p.round+p.mode)%(options.length+1);options.splice(answer,0,unit[text]);return {p,unit,options,answer,c:copy[japanese(s)?'ja':'ko'],language:s.courseDirection==='ja-ko'?'ko':'ja'};}
export function renderPractice(s,kind,top){
 const tasks=caseTasks(s,kind);if(tasks){const p=practiceState(s,kind);return renderCasePractice(s,tasks[p.index],p,top);}
 const {p,unit,options,c,language}=model(s,kind),audio=`<button type="button" class="icon-button" data-practice="listen" aria-label="${c.listen}">${icon('sound')}</button>`;
 const showMeanings=kind==='basic'&&[9,10].includes(s.basics.active),meanings=showMeanings?new Map(practiceUnits(s,kind).map(item=>[item.text,item.meaning])):null;
 const select=p.mode===0?`<div class="practice-choices${kind==='basic'&&[9,10].includes(s.basics.active)?' practice-choices-words':options.every(x=>x.length<=3)?' practice-choices-glyphs':''}">${options.map((x,i)=>`<button class="secondary" type="button" data-practice="choice" data-choice="${i}" aria-pressed="false">${showMeanings?`<span class="practice-choice-text" lang="ja">${phraseText(x)}</span><small class="practice-choice-meaning" lang="ko">${esc(meanings.get(x)||'')}</small>`:phraseText(x)}</button>`).join('')}</div>`:'';
 const nextButton=`<button class="primary" type="button" data-practice="next" disabled>${p.mode===0?c.check:c.next}</button>`;
 return `${top(c.title)}<main class="page practice-page${p.mode===2?' practice-writing':''}${showMeanings?' practice-with-meanings':''}${kind==='basic'&&s.basics.active>=11?' practice-katakana':''}" lang="${japanese(s)?'ja':'ko'}"><div class="practice-heading"><h1>${c.modes[p.mode]}</h1>${p.mode===0?audio:''}</div>${p.mode===0?'':`<div class="practice-writing-reference${unit.text.length===1?' practice-writing-reference-glyph':''}"><span lang="${language}">${phraseText(unit.text)}</span>${audio}</div>${showMeanings?`<p class="practice-writing-meaning" lang="ko">${esc(unit.meaning)}</p>`:''}<div class="practice-board${unit.text.length===1?' practice-board-glyph':''}">${p.round<2?`<span class="practice-guide" lang="${language}">${phraseText(unit.text)}</span>`:''}<canvas aria-label="${c.modes[2]}" data-practice-canvas></canvas></div>`}${select}<p class="practice-feedback" role="status"></p>${p.mode===2?`<div class="button-pair"><button class="secondary" type="button" data-practice="clear">${c.clear}</button>${nextButton}</div>`:nextButton}</main>`;
}
export function mountPractice(root,s,kind,{play,stop,advance}){
 const tasks=caseTasks(s,kind);if(tasks)return mountCasePractice(root,s,tasks[practiceState(s,kind).index],{advance,stop});
 const {p,unit,answer,c}=model(s,kind),next=root.querySelector('[data-practice=next]'),feedback=root.querySelector('.practice-feedback');
 let alive=true,heard=p.mode!==0,selected=null,ready=false,busy=false,request=0;
 const status=text=>{if(alive)feedback.textContent=text;};
 const sync=()=>{if(alive)next.disabled=busy||(p.mode===0?selected===null||!heard:!ready);};
 const listen=async()=>{if(busy)return;const current=++request;busy=true;sync();let failed=false;try{await play(unit.audio,()=>{failed=true;});if(!alive||current!==request)return;if(failed)status(c.audioError);else{heard=true;status('');}}catch{if(alive)status(c.audioError);}finally{if(alive&&current===request){busy=false;sync();}}};
 const canvas=root.querySelector('canvas'),ctx=canvas?.getContext('2d'),doc=root.ownerDocument;
 const preventSelection=e=>{if(e.cancelable)e.preventDefault();};
 const clearSelection=()=>{const selection=doc.getSelection();if(selection?.rangeCount)selection.removeAllRanges();};
 const selectionChanged=()=>{if(pointer!==null)clearSelection();};let pointer=null,line=null,lines=[],observer;
 const paint=()=>{if(!ctx)return;const r=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,3);canvas.width=r.width*ratio;canvas.height=r.height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.strokeStyle='#173221';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';for(const points of lines){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*r.width,y*r.height):ctx.moveTo(x*r.width,y*r.height));ctx.stroke();}};
 const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
 const down=e=>{if(pointer!==null||e.isPrimary===false||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();clearSelection();pointer=e.pointerId;line=[point(e)];lines.push(line);sync();canvas.setPointerCapture(pointer);};
 const move=e=>{if(e.pointerId!==pointer)return;preventSelection(e);line.push(point(e));paint();ready=lines.some(l=>l.length>1&&l.some((v,i)=>i&&Math.hypot(v[0]-l[i-1][0],v[1]-l[i-1][1])>.015));sync();};
 const up=e=>{if(e.pointerId===pointer){preventSelection(e);pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
 if(ctx){for(const type of ['selectstart','contextmenu','dragstart','touchstart'])canvas.addEventListener(type,preventSelection,{passive:false});doc.addEventListener('selectionchange',selectionChanged);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);observer=new ResizeObserver(paint);observer.observe(canvas);}
 const handler=async event=>{const target=event.target.closest('[data-practice]');if(!target||target.disabled||!alive)return;const action=target.dataset.practice;
  if(action==='listen')void listen();
  if(action==='choice'){selected=Number(target.dataset.choice);for(const b of root.querySelectorAll('[data-practice=choice]'))b.setAttribute('aria-pressed',String(b===target));status('');sync();}
  if(action==='next'&&!next.disabled){if(p.mode===0&&selected!==answer){status(c.retry);return;}next.disabled=true;await advance();}
  if(action==='clear'){lines=[];paint();ready=false;sync();}

 };
 const hidden=()=>{if(document.hidden){stop();request++;busy=false;sync();}};
 root.addEventListener('click',handler);document.addEventListener('visibilitychange',hidden);
 sync();
 if(p.mode===0&&!document.hidden)void listen();
 return ()=>{alive=false;request++;stop();observer?.disconnect();root.removeEventListener('click',handler);document.removeEventListener('visibilitychange',hidden);if(canvas){for(const type of ['selectstart','contextmenu','dragstart','touchstart'])canvas.removeEventListener(type,preventSelection);doc.removeEventListener('selectionchange',selectionChanged);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}};
}

export function renderPracticeComplete(s,top,hasNext){
 const jp=japanese(s),title=jp?'学習が完了しました':'학습을 완료하셨습니다';
 const sparks=Array.from({length:24},(_,i)=>`<i style="--angle:${i*15}deg;--delay:${i%3*80}ms;--distance:${70+i%4*15}px"></i>`).join('');
 return `${top(jp?'学習完了':'학습 완료')}<div class="lesson-progress" role="progressbar" aria-label="${jp?'学習の進み具合':'학습 진행률'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span style="width:100%"></span></div><main class="page practice-complete"><div class="practice-fireworks" aria-hidden="true">${sparks}<span>${icon('paw')}</span></div><h1 tabindex="-1">${title}</h1><button type="button" class="primary" data-action="completed-next">${hasNext?(jp?'次のレッスン':'다음 수업'):(jp?'学習ホームへ':'학습 홈으로')}</button></main>`;
}
