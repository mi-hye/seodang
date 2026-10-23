// Add local lesson sections only after directional input; native scrolling stays in charge.
export function mountMapSections(root,{renderPage,snapshot}={}){
 const map=root.querySelector('.learning-map');if(!map)return;
 const sections=map.querySelector('.map-sections'),previous=sections.querySelector('[data-map-load=previous]'),next=sections.querySelector('[data-map-load=next]');
 const count=Number(map.dataset.pageCount),header=root.querySelector('.app-header');
 let first=Number(map.dataset.pageIndex),last=first,frame=0,disposed=false,headerHeight=0,intent=0,touch=null;
 const pages=()=>[...sections.querySelectorAll('[data-map-page]')];
 function edges(){previous.hidden=first===0;next.hidden=last===count-1;}
 function load(index,{preserve=true}={}){
  if(disposed||!Number.isSafeInteger(index)||index<0||index>=count||index>=first&&index<=last)return;
  const overview=map.querySelector('.map-overview');
  const anchor=overview.getBoundingClientRect().bottom>headerHeight+8?overview:sections.querySelector('.map-choice');
  const top=anchor.getBoundingClientRect().top;
  // Keep a contiguous range even when a direct locate target is several sections away.
  while(index<first){sections.querySelector('[data-map-page]').insertAdjacentHTML('beforebegin',renderPage(--first));}
  while(index>last){next.insertAdjacentHTML('beforebegin',renderPage(++last));}
  edges();
  if(preserve){const delta=anchor.getBoundingClientRect().top-top;if(delta)window.scrollBy({top:delta,behavior:'instant'});}
 }
 function measureHeader(){headerHeight=header?.getBoundingClientRect().height??0;map.style.setProperty('--map-header-height',`${headerHeight}px`);}
 function update(){
  frame=0;if(disposed)return;
  if(document.querySelector('dialog[open]')){intent=0;return;}
  const loaded=pages(),top=loaded[0].getBoundingClientRect().top,bottom=loaded.at(-1).getBoundingClientRect().bottom;
  if(intent<0&&first>0&&top>headerHeight-innerHeight*.5){intent=0;load(first-1);}
  else if(intent>0&&last<count-1&&bottom<innerHeight*1.5){intent=0;load(last+1);}
  let active=first;
  for(const page of pages())if(page.getBoundingClientRect().top<=headerHeight+120)active=Number(page.dataset.mapPage);
  map.dataset.pageIndex=String(active);for(const page of pages())page.dataset.active=String(Number(page.dataset.mapPage)===active);
 }
 function schedule(){if(!disposed&&!frame)frame=requestAnimationFrame(update);}
 const inMapView=event=>root.contains(event.target)&&!event.target.closest('dialog');
 function wheel(event){if(!inMapView(event)||Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;intent=Math.sign(event.deltaY);schedule();}
 function touchStart(event){touch=inMapView(event)&&event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;intent=0;}
 function touchMove(event){
  if(!touch||event.touches.length!==1)return;
  const point=event.touches[0],dy=touch.y-point.clientY,dx=touch.x-point.clientX;
  if(Math.abs(dy)>36&&Math.abs(dy)>Math.abs(dx)){intent=Math.sign(dy);touch={x:point.clientX,y:point.clientY};schedule();}
 }
 function touchEnd(){
  // Finish a deliberate pull before release; never correct scroll during upward inertia.
  if(intent<0){cancelAnimationFrame(frame);update();intent=0;}
  touch=null;
 }
 function keyboard(event){
  if(!inMapView(event)||event.target.matches('input,textarea,select'))return;
  if(['ArrowUp','PageUp','Home'].includes(event.key))intent=-1;
  else if(['ArrowDown','PageDown','End',' '].includes(event.key))intent=event.shiftKey?-1:1;
  else return;
  schedule();
 }
 function edgeClick(event){
  const edge=event.target.closest('[data-map-load]');if(!edge)return;
  intent=0;const before=edge===previous,index=before?first-1:last+1;load(index);
  const items=sections.querySelector(`[data-map-page="${index}"]`)?.querySelectorAll('.map-choice:not(:disabled)[data-action]');
  const target=before?items?.[items.length-1]:items?.[0];target?.focus({preventScroll:true});target?.scrollIntoView({block:'center',behavior:'instant'});
 }
 function focusLesson(event){
  const target=event.target.closest('.map-choice');if(!target?.matches(':focus-visible'))return;
  intent=0;const rect=target.getBoundingClientRect();
  if(rect.top<headerHeight+12||rect.bottom>innerHeight-100)target.scrollIntoView({block:'center',behavior:'instant'});
 }
 measureHeader();
 if(snapshot?.course===map.dataset.course){load(snapshot.first,{preserve:false});load(snapshot.last,{preserve:false});window.scrollTo({top:snapshot.y,behavior:'instant'});}
 edges();
 const resize=new ResizeObserver(()=>{measureHeader();schedule();});if(header)resize.observe(header);
 const listeners=[['scroll',schedule],['resize',schedule],['wheel',wheel],['touchstart',touchStart],['touchmove',touchMove],['touchend',touchEnd],['touchcancel',touchEnd],['keydown',keyboard]];
 for(const [event,listener]of listeners)window.addEventListener(event,listener,{passive:true});
 sections.addEventListener('click',edgeClick);sections.addEventListener('focusin',focusLesson);schedule();
 return {
  snapshot(){return {course:map.dataset.course,first,last,y:window.scrollY};},
  ensure(index){intent=0;load(index);},
  dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();for(const [event,listener]of listeners)window.removeEventListener(event,listener);sections.removeEventListener('click',edgeClick);sections.removeEventListener('focusin',focusLesson);}
 };
}
