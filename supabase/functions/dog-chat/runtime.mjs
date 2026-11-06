import {DOG_CHAT_LIMITS} from './handler.mjs';
const keyFrom=(env,name,legacy)=>{try{return JSON.parse(env(name)||'{}').default||env(legacy)||'';}catch{return env(legacy)||'';}};
export function runtimeConfig(env){
 const url=env('SUPABASE_URL')||'',publishableKey=keyFrom(env,'SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),serviceKey=keyFrom(env,'SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
 const openAIKey=env('OPENAI_API_KEY')||'',model=env('DOG_CHAT_MODEL')||'',origins=(env('DOG_CHAT_ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
 const enabled=env('DOG_CHAT_ENABLED')==='true'&&env('DOG_CHAT_CREDITS_VERIFIED')==='true'&&/^https:\/\/[^/]+$/.test(url)&&!!publishableKey&&!!serviceKey&&!!openAIKey&&/^[a-zA-Z0-9._:-]{1,100}$/.test(model)&&origins.length>0;
 return {url,publishableKey,serviceKey,openAIKey,model,origins,enabled};
}
async function boundedFetch(fetcher,url,options,ms){
 const controller=new AbortController();let timer;
 try{return await Promise.race([(async()=>{const r=await fetcher(url,{...options,signal:controller.signal});const data=await r.json().catch(()=>null);return {ok:r.ok,status:r.status,data};})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},ms);})]);}
 finally{clearTimeout(timer);}
}
export function runtimeDependencies(config,fetcher=fetch){
 const serviceHeaders={apikey:config.serviceKey,'Content-Type':'application/json',...(config.serviceKey.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${config.serviceKey}`})};
 async function rpc(name,body){const r=await boundedFetch(fetcher,config.url+'/rest/v1/rpc/'+name,{method:'POST',headers:serviceHeaders,body:JSON.stringify(body)},4000);if(!r.ok||!r.data)throw Error('unavailable');return r.data;}
 return {
  authenticate:async authorization=>{
   const r=await boundedFetch(fetcher,config.url+'/auth/v1/user',{headers:{apikey:config.publishableKey,Authorization:authorization}},4000);
   if(r.status===401||r.status===403)return null;if(!r.ok)throw Error('unavailable');return r.data;
  },
  ledger:{
   status:(userId,model)=>rpc('dog_chat_status',{p_user_id:userId,p_model:model}),
   reserve:({userId,requestId,hash,lessonKey,inputTokens,outputTokens,model})=>rpc('dog_chat_reserve',{p_user_id:userId,p_request_id:requestId,p_hash:hash,p_lesson_key:lessonKey,p_input_tokens:inputTokens,p_output_tokens:outputTokens,p_model:model}),
   finish:({userId,requestId,hash,feedback,error})=>rpc('dog_chat_finish',{p_user_id:userId,p_request_id:requestId,p_hash:hash,p_feedback:feedback,p_error:error}),
  },
  provider:async body=>{
   const r=await boundedFetch(fetcher,'https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${config.openAIKey}`,'Content-Type':'application/json'},body:JSON.stringify(body)},DOG_CHAT_LIMITS.timeoutMs);
   const data=r.data;
   if(!r.ok){if(['credit_balance_exhausted','insufficient_quota'].includes(data?.error?.code))throw Error('credit_unavailable');throw Error('feedback_unavailable');}
   if(data?.status!=='completed'||!Array.isArray(data.output))throw Error('feedback_unavailable');
   const pieces=data.output.flatMap(item=>Array.isArray(item.content)?item.content:[]);
   if(pieces.some(item=>item.type==='refusal'))throw Error('feedback_unavailable');
   const chunks=pieces.filter(item=>item.type==='output_text');if(chunks.length!==1||typeof chunks[0].text!=='string'||chunks[0].text.length>4096)throw Error('feedback_unavailable');
   try{return JSON.parse(chunks[0].text);}catch{throw Error('feedback_unavailable');}
  },
 };
}
