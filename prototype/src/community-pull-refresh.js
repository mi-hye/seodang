// Claim only a downward, single-finger drag that begins at the top of the feed.
export function mountPullRefresh(host,{canRefresh,refresh,label}){
 let start=null,distance=0,active=false,refreshing=false,live=true;
 const indicator=()=>host.querySelector('[data-pull-refresh]');
 function paint(message='',height=0){const el=indicator();if(!el)return;el.textContent=message;el.style.height=`${height}px`;}
 const reset=()=>{start=null;distance=0;active=false;if(!refreshing)paint();};
 const begin=e=>{if(!canRefresh()||refreshing||e.touches.length!==1||window.scrollY>1||e.target.closest('button,input,textarea,select,a'))return;start={x:e.touches[0].clientX,y:e.touches[0].clientY};};
 const move=e=>{
  if(!start)return;
  if(e.touches.length!==1||!canRefresh()){reset();return;}
  const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;
  if(!active&&(dy<0||Math.abs(dx)>Math.max(10,dy))){reset();return;}
  if(dy<10&&!active)return;
  active=true;if(e.cancelable)e.preventDefault();distance=Math.min(88,Math.max(0,dy*.5));
  paint(label(distance>=60?'release':'pull'),distance);
 };
 const end=()=>{
  const ready=active&&distance>=60&&canRefresh();reset();if(!ready||refreshing)return;
  refreshing=true;paint(label('refreshing'),42);
  void Promise.resolve().then(refresh).finally(()=>{refreshing=false;if(live)paint();}).catch(()=>{});
 };
 host.addEventListener('touchstart',begin,{passive:true});host.addEventListener('touchmove',move,{passive:false});host.addEventListener('touchend',end,{passive:true});host.addEventListener('touchcancel',reset,{passive:true});
 return ()=>{live=false;host.removeEventListener('touchstart',begin);host.removeEventListener('touchmove',move);host.removeEventListener('touchend',end);host.removeEventListener('touchcancel',reset);};
}
