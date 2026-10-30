// Delay the icon swap so cached clips do not flash a loading indicator.
export function mountAudioLoading(player){
 let candidate,pressedAt=0,active,oldBusy,timer;
 const clear=()=>{clearTimeout(timer);timer=null;if(active){active.classList.remove('audio-loading-button');if(oldBusy===null)active.removeAttribute('aria-busy');else active.setAttribute('aria-busy',oldBusy);active=null;}};
 const capture=event=>{
  const button=event.target.closest?.('button');
  if(button&&button===active&&player.state==='loading'){event.preventDefault();event.stopImmediatePropagation();return;}
  candidate=button?.querySelector('[data-audio-icon]')?button:null;pressedAt=performance.now();
 };
 document.addEventListener('click',capture,true);
 const update=()=>{
  if(player.state!=='loading'){clear();return;}
  if(!active&&candidate?.isConnected&&performance.now()-pressedAt<500){
   active=candidate;oldBusy=active.getAttribute('aria-busy');active.setAttribute('aria-busy','true');
   timer=setTimeout(()=>{if(player.state==='loading'&&active?.isConnected)active.classList.add('audio-loading-button');},300);
  }
 };
 return {update,dispose(){clear();document.removeEventListener('click',capture,true);}};
}
