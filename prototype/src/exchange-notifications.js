import {createCommunityAPI,SESSION_KEY} from './community-api.js';
// Optional, independent of the messaging UI. One server-side EXISTS query per minute.
export function startExchangeNotifications(onChange,{storage=localStorage,createAPI=createCommunityAPI,intervalMs=20000,onMessage=()=>{}}={}){
 let owner=null,api=null,busy=false,live=true,queued=false,seen=null;
 const identity=()=>{try{return JSON.parse(storage.getItem(SESSION_KEY))?.user?.id||null;}catch{return null;}};
 async function refresh(){
  if(!live||document.hidden)return;if(busy){queued=true;return;}
  const user=identity();if(user!==owner){owner=user;seen=null;api=user?createAPI({storage}):null;onChange(false);}if(!api)return;
  busy=true;const active=api;
  try{const [unread,incoming]=await Promise.all([active.unread(),active.incomingMessages()]);
   if(live&&active===api&&identity()===user){
    onChange(unread===true);
    const fresh=incoming.filter(m=>seen&&!seen.has(m.id));
    // Baseline at startup/account changes; old messages should not repeatedly pop up.
    seen=new Set([...(seen||[]),...incoming.map(m=>m.id)].slice(-200));
    if(unread===true&&fresh.length)onMessage(fresh[0]);
   }}catch{if(live&&!identity())onChange(false);}
  finally{busy=false;if(queued){queued=false;void refresh();}}
 }
 const visible=()=>{if(!document.hidden)void refresh();};
 const timer=setInterval(refresh,intervalMs);window.addEventListener('seodang:conversation-change',refresh);document.addEventListener('visibilitychange',visible);window.addEventListener('storage',refresh);void refresh();
 return ()=>{live=false;clearInterval(timer);window.removeEventListener('seodang:conversation-change',refresh);document.removeEventListener('visibilitychange',visible);window.removeEventListener('storage',refresh);};
}
