import {esc} from './ui.js';
export function mountUICoach({root,onFinish}) {
 const start=root.querySelector('.case-card button') || root.querySelector('.home .record-case button');
 const steps=[
  {target:root.querySelector('[data-action="stories"]'),title:'학습 지도',text:'여기서 다음 학습을 골라 봐.'},
  {target:root.querySelector('.app-header-settings'),title:'설정',text:'난이도와 글자 크기, 소리를 바꿀 수 있어.'},
  {target:start,title:start?.textContent.trim() || '학습 시작',text:start?.dataset.action==='settings'?'여기서 준비된 난이도를 골라 줘.':'이제 이 버튼을 눌러 함께 시작해 보자.'},
 ].filter(s=>s.target);
 if(!steps.length){onFinish();return ()=>{};}
 // An overlay only: never scroll, insert layout spacers, or relocate the actual UI.
 const overlay=document.createElement('div');overlay.className='coach-tour';overlay.setAttribute('role','region');overlay.setAttribute('aria-label','서당개 안내');document.body.append(overlay);
 let index=0,disposed=false,frame;
 const observer=new ResizeObserver(()=>resize());
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
 function position(){
  if(disposed)return;
  const target=steps[index].target;if(!target.isConnected){finish();return;}
  const r=target.getBoundingClientRect(),w=window.innerWidth,h=window.visualViewport?.height||window.innerHeight,style=getComputedStyle(overlay);
  const top=(parseFloat(style.paddingTop)||0)+12,bottom=h-(parseFloat(style.paddingBottom)||0)-12;
  const spot=overlay.querySelector('.coach-spot');Object.assign(spot.style,{left:`${r.left-3}px`,top:`${r.top-3}px`,width:`${r.width+6}px`,height:`${r.height+6}px`});
  const dog=overlay.querySelector('.coach-dog'),size=w<=340?88:104;
  // Put the raised paw beside the target; the character moves, the target does not.
  const right=r.left+r.width/2>w/2;
  dog.classList.toggle('points-right',right);
  const dogX=clamp(right?r.right-size:r.left,12,w-size-12);
  let dogY=clamp(r.bottom-8,top,bottom-size);
  Object.assign(dog.style,{width:`${size}px`,height:`${size}px`,left:`${dogX}px`,top:`${dogY}px`});
  const card=overlay.querySelector('.coach-card');card.style.width=`${Math.min(340,w-24)}px`;card.style.left=`${(w-Math.min(340,w-24))/2}px`;
  const ch=card.offsetHeight;
  const below=dogY+size+8,above=r.top-ch-12;
  const y=below+ch<=bottom?below:above>=top?above:bottom-ch;
  card.style.top=`${clamp(y,top,bottom-ch)}px`;
  if(r.top>=bottom||r.bottom<=top){
   dog.style.top=`${bottom-size}px`;
   card.style.top=`${Math.max(top,bottom-size-ch-8)}px`;
   card.querySelector('p').textContent=r.top>=bottom?'화면을 아래로 내려 이 버튼을 찾아 봐.': '화면을 위로 올려 이 버튼을 찾아 봐.';
  }else if(card.querySelector('p').textContent!==steps[index].text){card.querySelector('p').textContent=steps[index].text;resize();}
 }
 function draw(){
  if(disposed)return;
  const last=index===steps.length-1;
  overlay.innerHTML=`<div class="coach-spot" aria-hidden="true"></div><img class="coach-dog" src="assets/mascot/seodang-pointing-v1.png" alt="버튼을 가리키는 서당개" width="1280" height="1280"><section class="coach-card" aria-live="polite"><h2>${esc(steps[index].title)}</h2><p>${esc(steps[index].text)}</p><div class="coach-actions">${index?'<button type="button" data-coach="previous">이전</button>':'<span></span>'}<span class="coach-count">${index+1} / ${steps.length}</span><button type="button" class="coach-next" data-coach="next">${last?'완료':'다음'}</button></div></section>`;
  observer.disconnect();observer.observe(overlay.querySelector('.coach-card'));position();
 }
 function cleanup(){if(disposed)return;disposed=true;observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',resize);window.removeEventListener('scroll',resize);window.visualViewport?.removeEventListener('resize',resize);root.removeEventListener('click',targetClicked,true);document.removeEventListener('keydown',keydown);overlay.remove();}
 function finish(){cleanup();onFinish();}
 function resize(){cancelAnimationFrame(frame);frame=requestAnimationFrame(position);}
 function targetClicked(e){if(index===steps.length-1&&steps[index].target.contains(e.target))finish();}
 function keydown(e){if(e.key==='Escape')finish();}
 overlay.addEventListener('click',e=>{const action=e.target.closest('[data-coach]')?.dataset.coach;if(action==='previous'){index--;draw();}if(action==='next'){if(index===steps.length-1)finish();else{index++;draw();}}});
 root.addEventListener('click',targetClicked,true);document.addEventListener('keydown',keydown);
 window.addEventListener('resize',resize);window.addEventListener('scroll',resize,{passive:true});window.visualViewport?.addEventListener('resize',resize);draw();return cleanup;
}
