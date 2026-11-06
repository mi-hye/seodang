// Explicit product operations only. Never serialize an Error, request, transcript or DOM.
export const operationNames=['speech_recognition','conversation_load','conversation_open','conversation_match','message_send','profile_save','conversation_refresh','app_runtime'];
export const operationResults=['started','ready','succeeded','failed','cancelled','waiting'];
export const operationErrors=['permission_denied','permission_blocked','recognition_unavailable','network_error','audio_error','busy','start_failed','language_unavailable','on_device_unavailable','no_speech','timeout','unauthorized','forbidden','rate_limit','unavailable','storage_unavailable','conversation_unavailable','unknown','script_error','unhandled_rejection'];
export function operationError(error){
 const code=typeof error?.code==='string'?error.code.toLowerCase():'';
 if(operationErrors.includes(code))return code;
 if(error?.name==='TimeoutError')return 'timeout';
 if(error?.name==='NotAllowedError')return 'permission_denied';
 if(error?.status===401)return 'unauthorized';
 if(error?.status===403||code==='42501')return 'forbidden';
 if(error?.status===429)return 'rate_limit';
 if(error?.status>=500)return 'unavailable';
 // Match only known complete messages; arbitrary server messages never leave the device.
 if(['match_daily_limit','community_rate_limit'].includes(error?.message))return 'rate_limit';
 if(error?.message==='device_storage_unavailable')return 'storage_unavailable';
 return 'unknown';
}
const noop=()=>{};
export function createOperationLogger(analytics,{now=()=>performance.now(),uuid=()=>crypto.randomUUID()}={}){
 function start(operation,context={}){
  let id,owner,time;
  const send=(result,extra={})=>{try{if(analytics.consent===true&&analytics.installationId===owner)analytics.capture('feature_operation',{...context,...extra,operation,operation_id:id,result,duration_ms:Math.min(3600000,Math.max(0,Math.round(now()-time)))});}catch{/* Diagnostics must never interrupt a feature. */}};
  try{
   if(analytics.consent!==true||!operationNames.includes(operation))return {ready:noop,finish:noop,fail:noop};
   owner=analytics.installationId;id=uuid();time=now();
  }catch{return {ready:noop,finish:noop,fail:noop};}
  let done=false,ready=false;send('started');
  const finish=(result='succeeded',extra={})=>{if(done||!['succeeded','failed','cancelled','waiting'].includes(result))return;done=true;send(result,extra);};
  return {ready(){if(!done&&!ready){ready=true;send('ready');}},finish,fail(error){finish('failed',{error_code:operationError(error)});}};
 }
 async function run(operation,context,work,result=()=> 'succeeded'){
  const log=start(operation,context);
  try{const value=await work();let outcome='succeeded';try{outcome=result(value);}catch{}log.finish(outcome);return value;}catch(error){log.fail(error);throw error;}
 }
 return {start,run};
}
