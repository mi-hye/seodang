import {koreanStrokes,strokePath} from './korean-stroke-data.js';
const demonstrated=new Set();
export function mountKoreanStrokes(box,{autoPlay=true}={}){
 const data=koreanStrokes(box.dataset.koreanGlyph),host=box.querySelector('.korean-stroke-layer'),button=box.parentElement.querySelector('[data-korean-strokes]'),status=box.parentElement.querySelector('.korean-stroke-status'),canvas=box.querySelector('canvas');
 if(!data?.length)return()=>{};
 const pathsMarkup=data.map(s=>`<path d="${strokePath(s)}"/>`).join('');
 host.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><g class="korean-stroke-guides">${pathsMarkup}</g><g class="korean-stroke-ink">${pathsMarkup}</g>${data.map((s,i)=>`<text x="${s.label[0]}" y="${s.label[1]}">${i+1}</text>`).join('')}<circle class="korean-stroke-tip" r="2.5" visibility="hidden"/></svg>`;
 const paths=[...host.querySelectorAll('.korean-stroke-ink path')],numbers=[...host.querySelectorAll('text')],tip=host.querySelector('circle'),lengths=paths.map(p=>p.getTotalLength());
 let running=false,disposed=false,frame,step=-1;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
 const idle=()=>{cancelAnimationFrame(frame);running=false;box.dataset.strokeDemo='false';canvas.setAttribute('aria-disabled','false');paths.forEach(p=>{p.style.strokeDashoffset='0';p.classList.remove('active');});numbers.forEach(n=>n.classList.remove('active'));tip.setAttribute('visibility','hidden');status.textContent='';button.textContent='書き順';};
 const play=()=>{
  if(disposed)return;if(running){idle();return;}
  if(reduced()){step=(step+1)%paths.length;paths.forEach((p,i)=>p.classList.toggle('active',i===step));numbers.forEach((n,i)=>n.classList.toggle('active',i===step));status.textContent=`${step+1} / ${paths.length}`;button.textContent='次の線';return;}
  demonstrated.add(box.dataset.koreanGlyph);running=true;box.dataset.strokeDemo='true';canvas.setAttribute('aria-disabled','true');button.textContent='停止';
  const durations=lengths.map(length=>Math.max(600,Math.min(1500,length*12))),start=performance.now();paths.forEach((p,i)=>{p.style.strokeDasharray=String(lengths[i]);p.style.strokeDashoffset=String(lengths[i]);});
  const tick=now=>{if(disposed||!running)return;if(reduced()){idle();return;}let elapsed=now-start,index=0;while(index<paths.length&&elapsed>durations[index]+220){elapsed-=durations[index]+220;index++;}if(index>=paths.length){idle();return;}
   const fraction=Math.min(1,elapsed/durations[index]);paths.forEach((p,i)=>{p.style.strokeDashoffset=String(i<index?0:i===index?lengths[i]*(1-fraction):lengths[i]);p.classList.toggle('active',i===index);});numbers.forEach((n,i)=>n.classList.toggle('active',i===index));const point=paths[index].getPointAtLength(lengths[index]*fraction);tip.setAttribute('cx',point.x);tip.setAttribute('cy',point.y);tip.setAttribute('visibility','visible');status.textContent=`${index+1} / ${paths.length}`;frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
 };
 const visibility=()=>{if(document.hidden)idle();};
 button.disabled=false;button.setAttribute('aria-label',`${box.dataset.koreanGlyph}の書き順、${paths.length}画`);button.addEventListener('click',play);document.addEventListener('visibilitychange',visibility);idle();
 if(autoPlay&&!demonstrated.has(box.dataset.koreanGlyph)&&!document.hidden&&!reduced())play();
 return()=>{disposed=true;idle();button.removeEventListener('click',play);document.removeEventListener('visibilitychange',visibility);};
}
