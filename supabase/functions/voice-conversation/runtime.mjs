const keyFrom=(env,name,legacy)=>{try{return JSON.parse(env(name)||'{}').default||env(legacy)||'';}catch{return env(legacy)||'';}};
export function runtimeConfig(env){
 const url=env('SUPABASE_URL')||'',publishableKey=keyFrom(env,'SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),serviceKey=keyFrom(env,'SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
 const openAIKey=env('OPENAI_API_KEY')||'',model=env('VOICE_CONVERSATION_MODEL')||'',origins=(env('VOICE_CONVERSATION_ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean);
 const enabled=env('VOICE_CONVERSATION_ENABLED')==='true'&&env('VOICE_CONVERSATION_CREDITS_VERIFIED')==='true'&&/^https:\/\/[^/]+$/.test(url)&&!!publishableKey&&!!serviceKey&&!!openAIKey&&/^[a-zA-Z0-9._:-]{1,100}$/.test(model)&&origins.length>0;
 return {url,publishableKey,serviceKey,openAIKey,model,origins,enabled};
}
async function jsonFetch(fetcher,url,options,ms){
 const controller=new AbortController();let timer;
 try{return await Promise.race([(async()=>{const response=await fetcher(url,{...options,signal:controller.signal});return {ok:response.ok,status:response.status,data:await response.json().catch(()=>null)};})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},ms);})]);}
 finally{clearTimeout(timer);}
}
export function runtimeDependencies(config,fetcher=fetch){
 const headers={apikey:config.serviceKey,'Content-Type':'application/json',...(config.serviceKey.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${config.serviceKey}`})};
 return {
  authenticate:async authorization=>{const r=await jsonFetch(fetcher,config.url+'/auth/v1/user',{headers:{apikey:config.publishableKey,Authorization:authorization}},4000);if(r.status===401||r.status===403)return null;if(!r.ok)throw Error('unavailable');return r.data;},
  ledger:async body=>{const r=await jsonFetch(fetcher,config.url+'/rest/v1/rpc/voice_conversation_op',{method:'POST',headers,body:JSON.stringify(body)},5000);if(!r.ok||!r.data)throw Error('unavailable');return r.data;},
  provider:async body=>{
   const r=await jsonFetch(fetcher,'https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${config.openAIKey}`,'Content-Type':'application/json'},body:JSON.stringify(body)},15000);
   if(!r.ok)throw Error(['credit_balance_exhausted','insufficient_quota'].includes(r.data?.error?.code)?'credit_unavailable':'reply_unavailable');
   if(r.data?.status!=='completed'||!Array.isArray(r.data.output))throw Error('reply_unavailable');
   const content=r.data.output.flatMap(item=>Array.isArray(item.content)?item.content:[]);
   if(content.some(c=>c.type==='refusal'))throw Error('reply_unavailable');
   const texts=content.filter(c=>c.type==='output_text');if(texts.length!==1||typeof texts[0].text!=='string'||texts[0].text.length>4096)throw Error('reply_unavailable');
   try{return JSON.parse(texts[0].text);}catch{throw Error('reply_unavailable');}
  }
 };
}
