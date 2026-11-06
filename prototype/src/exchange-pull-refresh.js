// Only claim an intentional downward drag that began at the top of the page.
export function mountPullRefresh(host,{enabled,refresh,label,onActive=()=>{}}){
 const indicator=document.createElement('div');indicator.className='exchange-pull';indicator.hidden=true;
 indicator.setAttribute('role','status');indicator.setAttribute('aria-label',label);
 indicator.innerHTML='<span class="exchange-spinner" aria-hidden="true"></span>';
 host.before(indicator);
 let gesture=null,pending=false,live=true,suppressUntil=0;
 function reset(){gesture=null;if(!pending){indicator.hidden=true;indicator.classList.remove('is-loading','is-ready');onActive(false);}}
 function start(e){
  reset();if(pending||!enabled()||window.scrollY>0||e.touches.length!==1||document.querySelector('dialog[open]'))return;
  if(e.target.closest('input,textarea,select,a,summary,details,[contenteditable],.exchange-composer,button:not(.exchange-room)'))return;
  const p=e.touches[0];gesture={x:p.clientX,y:p.clientY,id:p.identifier,distance:0,claimed:false};
 }
 function move(e){
  if(!gesture)return;
  const p=e.touches[0];if(!enabled()||e.touches.length!==1||p.identifier!==gesture.id){reset();return;}
  const dy=p.clientY-gesture.y,dx=Math.abs(p.clientX-gesture.x);
  if(!gesture.claimed){
   if(Math.max(Math.abs(dy),dx)<12)return;
   if(dy<=0||dx>=dy||window.scrollY>0){reset();return;}
   gesture.claimed=true;onActive(true);
  }
  if(!e.cancelable){reset();return;}e.preventDefault();
  gesture.distance=Math.max(0,dy);indicator.hidden=false;
  indicator.style.top=`${Math.max(0,host.getBoundingClientRect().top)+Math.min(36,gesture.distance*.35)}px`;
  indicator.classList.toggle('is-ready',gesture.distance>=72);
  indicator.firstElementChild.style.transform=`rotate(${gesture.distance*3}deg)`;
 }
 async function end(){
  if(!gesture)return;
  const fire=gesture.claimed&&gesture.distance>=72&&enabled();
  if(gesture.claimed)suppressUntil=Date.now()+400;
  if(!fire){reset();return;}
  pending=true;gesture=null;indicator.classList.add('is-loading');indicator.style.top=`${Math.max(0,host.getBoundingClientRect().top)+12}px`;
  try{await refresh();}finally{pending=false;if(live)reset();}
 }
 const cancel=()=>{if(gesture?.claimed)suppressUntil=Date.now()+400;reset();};
 const click=e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}};
 const visibility=()=>{if(document.hidden)cancel();};
 host.addEventListener('touchstart',start,{passive:true});host.addEventListener('touchmove',move,{passive:false});host.addEventListener('touchend',end);host.addEventListener('touchcancel',cancel);host.addEventListener('click',click,true);document.addEventListener('visibilitychange',visibility);
 return ()=>{live=false;host.removeEventListener('touchstart',start);host.removeEventListener('touchmove',move);host.removeEventListener('touchend',end);host.removeEventListener('touchcancel',cancel);host.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',visibility);indicator.remove();gesture=null;onActive(false);};
}
