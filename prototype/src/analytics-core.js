import {expansionReview} from './course-expansion-state.js';
import {cleanAcquisition} from './analytics-acquisition.js';
// Explicit events only: never send arbitrary action payloads or learner answers.
export const ANALYTICS_KEY='seodang.analytics.v1';
export const EVENTS=['analytics_enabled','app_opened','lesson_started','learning_progress','lesson_completed','lesson_exited','answer_checked','step_time','audio_playback','install_attribution'];
const validUUID=v=>typeof v==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v);
const TTL=7*24*60*60*1000, SESSION=30*60*1000;
const index=v=>Number.isInteger(v)&&v>=0&&v<=1000;
const allowed={item_index:index,round_index:index,mode_index:index,match_count:index,correct:v=>typeof v==='boolean',active_ms:v=>Number.isInteger(v)&&v>=0&&v<=60000,exit_reason:v=>['navigation','restart'].includes(v),audio_source:v=>['file','device'].includes(v),audio_result:v=>['started','completed','failed','cancelled'].includes(v),playback_id:validUUID,course_direction:v=>['ko-ja','ja-ko'].includes(v),level:v=>v===1.5||v===2.5||v===3.5||Number.isInteger(v)&&v>=1&&v<=5,lesson_id:v=>typeof v==='string'&&(/^(ko-ja|ja-ko):(expert|scenario|kana|basic|korean|sentence|reading|dialogue|labels|listening|play):[\d-]+$/.test(v)||Boolean(expansionReview(v))),phase:v=>['opinion','perspective','expression','reflection','speak','intro','scenario','learn','reading','write','quiz','practice','arrange','solve','build','read','listen','investigate','solved','transfer','summary','done','review','match'].includes(v),attempt_id:validUUID};
export function createAnalytics({storage,send,uuid=()=>crypto.randomUUID(),now=()=>Date.now(),environment='development',platform='web',appVersion='unknown'}){
 let data={consent:null,queue:[]},busy=false,controller,nextTry=0,failures=0,epoch=0;
 try{const saved=JSON.parse(storage.getItem(ANALYTICS_KEY));if(saved&&[true,false,null].includes(saved.consent))data={...saved,queue:Array.isArray(saved.queue)?saved.queue:[]};}catch{}
 if(data.consent===true&&data.consent_version!==3)data={consent:null,queue:[]};
 const persist=()=>{try{storage.setItem(ANALYTICS_KEY,JSON.stringify(data));return true;}catch{return false;}};
 const prune=()=>{data.queue=data.queue.filter(e=>e&&validUUID(e.uuid)&&validUUID(e.distinct_id)&&e.properties?.client==='seodang-capacitor'&&EVENTS.includes(e.event)&&Number.isFinite(Date.parse(e.timestamp))&&now()-Date.parse(e.timestamp)<TTL&&Date.parse(e.timestamp)<=now()).slice(-200);};
 function capture(event,properties={}){
  if(data.consent!==true||!EVENTS.includes(event))return false;
  if(!validUUID(data.id)){try{data.id=uuid();}catch{return false;}}
  if(!validUUID(data.session)||now()-(data.lastActivity||0)>SESSION){try{data.session=uuid();}catch{return false;}}
  if(event==='app_opened'&&data.openedSession===data.session)return false;
  data.lastActivity=now();
  const clean=Object.fromEntries(Object.entries(properties).filter(([key,value])=>allowed[key]?.(value)));
  let eventId;try{eventId=uuid();}catch{return false;}
  if(event==='app_opened')data.openedSession=data.session;
  data.queue.push({uuid:eventId,event,distinct_id:data.id,timestamp:new Date(now()).toISOString(),properties:{...clean,...cleanAcquisition(data.acquisition),environment,platform,app_version:appVersion,schema_version:3,client:'seodang-capacitor',consent_version:3,$session_id:data.session,$process_person_profile:false,$geoip_disable:true,$ip:null}});
  prune();if(!persist()){data.queue=[];data.consent=false;return false;}return true;
 }
 function setConsent(value){
  if(typeof value!=='boolean')return false;
  if(value&&data.consent===true)return true;
  epoch++;controller?.abort();nextTry=0;failures=0;
  data={consent:value,consent_version:3,queue:[]};
  if(!persist()){data={consent:false,queue:[]};return false;}
  if(value)capture('analytics_enabled');
  return data.consent===value;
 }
 function resetConsent(){
  epoch++;controller?.abort();nextTry=0;failures=0;
  data={consent:null,queue:[]};
  return persist();
 }
 async function flush(){
  if(data.consent!==true||busy||now()<nextTry)return;
  prune();if(!data.queue.length){persist();return;}
  const batch=data.queue.slice(0,20),version=epoch;
  busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),10000);
  try{
   const response=await send(batch,controller.signal);
   if(epoch!==version)return;
   if(!response.ok)throw Error('Analytics unavailable');
   const ids=new Set(batch.map(e=>e.uuid));data.queue=data.queue.filter(e=>!ids.has(e.uuid));failures=0;nextTry=0;persist();
  }catch{if(epoch===version)nextTry=now()+Math.min(300000,5000*2**Math.min(failures++,6));}
  finally{clearTimeout(timeout);busy=false;controller=null;}
 }
 // Another tab can withdraw consent. Never retain its pending data in memory.
 function reload(){epoch++;controller?.abort();try{const saved=JSON.parse(storage.getItem(ANALYTICS_KEY));data=saved?.consent===true&&saved.consent_version===3?{...saved,queue:Array.isArray(saved.queue)?saved.queue:[]}:{consent:saved?.consent===false?false:null,queue:[]};}catch{data={consent:false,queue:[]};}}
 function recordAcquisition(properties){
  if(data.consent!==true||data.acquisition)return false;
  const clean=cleanAcquisition(properties);if(!clean.acquisition_status)return false;
  data.acquisition=clean;return capture('install_attribution');
 }
 return {capture,flush,setConsent,resetConsent,reload,recordAcquisition,get hasAcquisition(){return !!data.acquisition;},get consent(){return data.consent;},get installationId(){return data.id||null;},get pending(){return data.queue.length;}};
}
