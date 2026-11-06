import {voiceConversationConfig} from './voice-conversation-config.js';
export function createConversationAPI({config=voiceConversationConfig,fetcher=globalThis.fetch,auth}={}){
 let authenticating;
 async function request(action,body={}, {signal,keepalive=false}={}){
  if(!config.enabled)throw Error('unavailable');
  const timeout=AbortSignal.timeout(action==='heartbeat'?12000:25000);
  const combined=signal&&AbortSignal.any?AbortSignal.any([signal,timeout]):timeout;
  if(signal?.aborted)throw Error('aborted');
  authenticating ||= auth?Promise.resolve(auth):import('./community-api.js').then(m=>m.createCommunityAPI({config:{url:config.authURL,key:config.key}}));
  const session=await (await authenticating).ensureDeviceSession();
  if(combined.aborted)throw Error('aborted');
  const response=await fetcher(config.url,{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action,...body}),signal:combined,keepalive});
  const data=await response.json();
  if(!response.ok||data.error)throw Error(data.error||'unavailable');
  if(!Number.isFinite(data.remainingSeconds)||data.remainingSeconds<0||data.remainingSeconds>600)throw Error('unavailable');
  if(data.reply&&(![data.reply.text,data.reply.meaning].every(v=>typeof v==='string'&&v.trim()&&[...v].length<=400)))throw Error('unavailable');
  if(action==='turn'&&!data.reply)throw Error('unavailable');
  if(action==='start'&&(typeof data.sessionId!=='string'||data.sessionId!==body.sessionId))throw Error('unavailable');
  return data;
 }
 return {enabled:config.enabled,request};
}
