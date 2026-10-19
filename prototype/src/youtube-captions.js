// Loaded only inside an open video lesson (also embedded in the iOS player page).
let apiPromise;
function loadAPI(){
 if(globalThis.YT?.Player)return Promise.resolve(globalThis.YT);
 if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
  const previous=globalThis.onYouTubeIframeAPIReady;
  globalThis.onYouTubeIframeAPIReady=()=>{try{previous?.();}finally{resolve(globalThis.YT);}};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  script.onerror=()=>{apiPromise=null;script.remove();reject(Error('YouTube API unavailable'));};document.head.append(script);
 });
 return apiPromise;
}
export function disableCaptions(player){
 // This optional player method is exposed at runtime. Do not hide/crop the player.
 // Check its loaded modules to avoid an onApiChange/unload recursion.
 if(player.getOptions?.().includes('captions'))player.unloadModule?.('captions');
}
export function mountCaptionDefaults(iframe){
 let disposed=false,player,clock;
 const source=new URL(iframe.src),start=Number(source.searchParams.get('start')),end=Number(source.searchParams.get('end'));
 const off=event=>{if(!disposed)disableCaptions(event.target);};
 const cue=target=>target.cueVideoById({videoId:source.pathname.split('/').pop(),startSeconds:start,endSeconds:end});
 const stopClock=()=>{clearInterval(clock);clock=undefined;};
 const checkBounds=target=>{
  if(disposed)return;
  const time=target.getCurrentTime();
  if(time>=end){stopClock();target.pauseVideo();cue(target);}
  else if(time<start-.15)target.seekTo(start,true);
 };
 const ready=event=>{
  if(disposed)return;
  if(end>start&&[ -1,5 ].includes(event.target.getPlayerState()))cue(event.target);
  off(event);
 };
 const state=event=>{
  if(disposed)return;
  stopClock();
  // Seeking clears YouTube's endSeconds. Enforce the boundary ourselves as well.
  if(event.data===1&&end>start){
   clock=setInterval(()=>checkBounds(event.target),80);
   checkBounds(event.target);
  }
  // YouTube's built-in replay can reset to the whole video. Re-cue the same clip.
  if(event.data===0&&end>start)cue(event.target);
  off(event);
 };
 void loadAPI().then(YT=>{
  if(disposed||!iframe.isConnected)return;
  player=new YT.Player(iframe,{events:{onReady:ready,onApiChange:off,onStateChange:state}});
 }).catch(()=>{});
 return ()=>{disposed=true;stopClock();player?.destroy();};
}
