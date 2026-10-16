// KanjiVG © Ulrich Apel and contributors, CC BY-SA 3.0.
// Geometry is extracted unchanged; attribution and original SVGs: assets/strokes/.
const datasets=new Map();
const demonstrated=new Set();
export async function mountStrokes(box,{onReady=()=>{},autoPlay=true}={}){
 let disposed=false,frame=0,running=false,step=-1,paths=[],numbers=[];
 const button=box.querySelector('[data-writing="strokes"]'),status=box.querySelector('.stroke-status'),host=box.querySelector('.stroke-layer');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
 function stop(){cancelAnimationFrame(frame);running=false;box.dataset.strokeDemo='false';box.querySelector('canvas')?.setAttribute('aria-disabled','false');button.textContent=demonstrated.has(box.dataset.writingText)?'다시 보기':'획순 보기';paths.forEach(p=>{p.style.strokeDashoffset='0';p.classList.remove('active');});numbers.forEach(n=>n.classList.remove('active'));status.textContent=disposed?'':'따라 써보세요';}
 function play(){
  if(!paths.length||disposed)return;
  if(running){stop();return;}
  if(reduced()){
   step=(step+1)%paths.length;paths.forEach((p,i)=>p.classList.toggle('active',i===step));numbers.forEach((n,i)=>n.classList.toggle('active',i===step));status.textContent=`${step+1} / ${paths.length}획`;button.textContent='다음 획';return;
  }
  running=true;step=-1;box.dataset.strokeDemo='true';box.querySelector('canvas').setAttribute('aria-disabled','true');button.textContent='멈추기';
  const lengths=paths.map(p=>p.getTotalLength()),durations=lengths.map(n=>Math.max(600,Math.min(1400,n*9))),start=performance.now();
  paths.forEach((p,i)=>{p.style.strokeDasharray=`${lengths[i]}`;p.style.strokeDashoffset=`${lengths[i]}`;});
  const tick=now=>{
   if(disposed||!running)return;
   if(reduced()){stop();return;}
   let elapsed=now-start,active=0;while(active<paths.length&&elapsed>durations[active]+260){elapsed-=durations[active]+260;active++;}
   if(active===paths.length){stop();return;}
   paths.forEach((p,i)=>{p.style.strokeDashoffset=i<active?'0':i===active?`${lengths[i]*(1-Math.min(1,elapsed/durations[i]))}`:`${lengths[i]}`;p.classList.toggle('active',i===active);});
   numbers.forEach((n,i)=>n.classList.toggle('active',i===active));status.textContent=`${active+1} / ${paths.length}획`;frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
 }
 const click=e=>{if(e.target.closest('[data-writing="strokes"]'))play();};
 const visibility=()=>{if(document.hidden)stop();};
 const dispose=()=>{disposed=true;stop();box.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);};
 // Expose cancellation synchronously, even while the optional local asset loads.
 onReady(dispose);
 try{
  const url=box.dataset.strokeSource||'assets/strokes/data.json';
  if(!datasets.has(url))datasets.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('stroke data unavailable');return r.json();}).catch(e=>{datasets.delete(url);throw e;}));
  const entry=(await datasets.get(url))[box.dataset.writingText];if(disposed)return;
  if(!entry)throw Error('missing glyph');
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 109 109');svg.setAttribute('aria-hidden','true');
  const group=document.createElementNS(ns,'g');group.setAttribute('class','stroke-paths');svg.append(group);
  paths=entry.paths.map(d=>{const p=document.createElementNS(ns,'path');p.setAttribute('d',d);group.append(p);return p;});
  numbers=entry.numbers.map(item=>{const t=document.createElementNS(ns,'text');t.setAttribute('transform',item.transform);t.textContent=item.text;svg.append(t);return t;});
  host.replaceChildren(svg);box.classList.add('has-strokes');button.disabled=false;button.setAttribute('aria-label',`${box.dataset.writingText} ${paths.length}획 순서 보기`);
  box.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);
  if(autoPlay&&!demonstrated.has(box.dataset.writingText)&&!document.hidden){demonstrated.add(box.dataset.writingText);if(!reduced())play();else stop();}
  else stop();
 }catch{if(!disposed){button.textContent='획순 준비 중';status.textContent='획순을 불러오지 못했어요.';}}
 return dispose;
}
