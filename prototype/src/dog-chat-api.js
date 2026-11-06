import {dogChatConfig} from './dog-chat-config.js';
import {dogChatLessonKeys} from './dog-chat-catalog.js';

const codes=new Set(['unavailable','unauthorized','invalid_request','unsupported_lesson','daily_limit','capacity_limit','in_progress','request_conflict','request_expired','timeout','credit_unavailable','feedback_unavailable','offline','aborted']);
const remaining=value=>Number.isInteger(value)&&value>=0&&value<=3;
const requestID=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text=(value,max=160)=>typeof value==='string'&&value.trim().length>0&&[...value.trim()].length<=max&&!/[<>\u0000-\u0008\u000b-\u001f\u007f]/u.test(value);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

export class DogChatError extends Error{
 constructor(code,details={}){
  const safe=codes.has(code)?code:'feedback_unavailable';
  super(safe);this.name='DogChatError';this.code=safe;
  if(remaining(details.remaining))this.remaining=details.remaining;
  if(Number.isInteger(details.retryAfter)&&details.retryAfter>=0&&details.retryAfter<=86400)this.retryAfter=details.retryAfter;
 }
}
const fail=(code,details)=>{throw new DogChatError(code,details);};
function feedback(data,requestId,answers){
 if(!record(data)||data.requestId!==requestId||!remaining(data.remaining)||!record(data.feedback))fail('feedback_unavailable');
 const exact=value=>answers.some(answer=>answer.normalize('NFC')===value.normalize('NFC'));
 let praise=null,correction=null;
 if(data.feedback.praise!==null){
  const row=data.feedback.praise;
  if(!record(row)||!text(row.quote)||!text(row.explanation)||!exact(row.quote))fail('feedback_unavailable');
  praise={quote:row.quote,explanation:row.explanation};
 }
 if(data.feedback.correction!==null){
  const row=data.feedback.correction;
  if(!record(row)||!text(row.original)||!text(row.suggestion)||!text(row.explanation)||!exact(row.original)||row.original.normalize('NFC')===row.suggestion.normalize('NFC'))fail('feedback_unavailable');
  correction={original:row.original,suggestion:row.suggestion,explanation:row.explanation};
 }
 return {feedback:{praise,correction},remaining:data.remaining,requestId};
}

// Instantiate freely, but call either method only after the learner consents and
// starts. Construction and the disabled path perform no auth, storage or network.
export function createDogChatAPI({storage,fetcher=globalThis.fetch,config=dogChatConfig,auth,timeoutMs=30000}={}){
 const pending=new Map();let authenticating=null;
 const duration=Number.isFinite(timeoutMs)?Math.max(1,Math.min(30000,timeoutMs)):30000;
 function availableConfig(){
  if(config?.enabled!==true||typeof config.key!=='string'||!config.key||typeof fetcher!=='function')fail('unavailable');
  try{const url=new URL(config.serverURL);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)fail('unavailable');return url;}catch{fail('unavailable');}
 }
 function lesson(key){if(!dogChatLessonKeys.includes(key))fail('unsupported_lesson');}
 async function session(signal){
  if(auth)return auth.ensureDeviceSession({signal});
  // Read the shared saved session afresh for each transaction. Community may have
  // refreshed its token while this optional panel was closed. Concurrent calls
  // share auth so they cannot create two anonymous identities.
  if(!authenticating){
   authenticating=import('./community-api.js').then(({createCommunityAPI})=>{
    if(signal.aborted)fail('aborted');
    return createCommunityAPI({storage:storage??globalThis.localStorage,config:{url:config.authURL??new URL(config.serverURL).origin,key:config.key},fetcher:(url,options)=>fetcher(url,{...options,signal})}).ensureDeviceSession();
   }).finally(()=>{authenticating=null;});
  }
  return authenticating;
 }
 function run(work,externalSignal){
  const controller=new AbortController();let timedOut=false;
  const abort=()=>controller.abort();
  if(externalSignal?.aborted)return Promise.reject(new DogChatError('aborted'));
  externalSignal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},duration);
  let rejectAbort;
  const canceled=new Promise((_,reject)=>{rejectAbort=()=>reject(new DogChatError(timedOut?'timeout':'aborted'));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  return Promise.race([Promise.resolve().then(()=>work(controller.signal)),canceled]).catch(error=>{
   if(controller.signal.aborted)fail(timedOut?'timeout':'aborted');
   if(error instanceof DogChatError)throw error;
   if(error?.name==='TimeoutError')fail('timeout');
   if(error?.name==='AbortError')fail('aborted');
   if(error instanceof TypeError)fail('offline');
   fail('unavailable');
  }).finally(()=>{clearTimeout(timer);externalSignal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);});
 }
 async function request(url,{signal,body}={}){
  let credentials;
  try{credentials=await session(signal);}catch(error){
   if(error?.status===401||error?.status===403)fail('unauthorized');
   throw error;
  }
  if(signal.aborted)fail('aborted');
  if(typeof credentials?.access_token!=='string'||!credentials.access_token)fail('unauthorized');
  const response=await fetcher(url.toString(),{method:body?'POST':'GET',headers:{apikey:config.key,Authorization:`Bearer ${credentials.access_token}`,'Content-Type':'application/json'},cache:'no-store',credentials:'omit',redirect:'error',signal,...(body?{body:JSON.stringify(body)}:{})});
  let data=null;
  try{const raw=await response.text();if(raw.length<=12000)data=JSON.parse(raw);}catch{}
  if(!response.ok){
   const fallback=response.status===401||response.status===403?'unauthorized':response.status===404||response.status===503?'unavailable':response.status===429?'capacity_limit':'feedback_unavailable';
   fail(codes.has(data?.error)?data.error:fallback,data??{});
  }
  return data;
 }
 return {
  availability(lessonKey,{signal}={}){
   let url;try{url=availableConfig();lesson(lessonKey);}catch(error){return Promise.reject(error);}
   url.searchParams.set('lessonKey',lessonKey);
   return run(async bounded=>{
    const data=await request(url,{signal:bounded});
    if(!record(data)||typeof data.available!=='boolean'||!remaining(data.remaining))fail('feedback_unavailable');
    return {available:data.available,remaining:data.remaining,...(!data.available?{reason:codes.has(data.reason)?data.reason:'unavailable'}:{})};
   },signal);
  },
  submit(input,{signal}={}){
   let url,body;
   try{
    url=availableConfig();lesson(input?.lessonKey);
    if(input?.consent!==true||!requestID(input.requestId)||!Array.isArray(input.answers)||input.answers.length!==3||![...input.answers].every(answer=>text(answer)))fail('invalid_request');
    body={lessonKey:input.lessonKey,requestId:input.requestId,answers:input.answers.map(answer=>answer.trim()),consent:true};
   }catch(error){return Promise.reject(error);}
   const fingerprint=JSON.stringify(body),existing=pending.get(body.requestId);
   if(existing)return existing.fingerprint===fingerprint?existing.promise:Promise.reject(new DogChatError('request_conflict'));
   // The initiating call owns cancellation. Duplicate taps share its promise;
   // explicit retries after settlement reuse the same ID at the server.
   const promise=run(async bounded=>feedback(await request(url,{signal:bounded,body}),body.requestId,body.answers),signal).finally(()=>{pending.delete(body.requestId);});
   pending.set(body.requestId,{fingerprint,promise});return promise;
  },
 };
}
