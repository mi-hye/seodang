import {createProviders} from './providers.mjs';
async function equal(a,b){const enc=new TextEncoder();const [x,y]=await Promise.all([a,b].map(s=>crypto.subtle.digest('SHA-256',enc.encode(s))));let diff=0;const v=new Uint8Array(x),w=new Uint8Array(y);for(let i=0;i<v.length;i++)diff|=v[i]^w[i];return diff===0;}
export function createHandler(env,{fetcher=fetch,providers=createProviders(env)}={}){
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 async function rpc(name,body){const result=await fetcher(env.SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});if(!result.ok)throw Error('push_database');return result.status===204?null:result.json();}
 return async request=>{
  if(request.method!=='POST')return response({error:'method_not_allowed'},405);
  if(!env.MESSAGE_PUSH_WORKER_SECRET||!await equal(request.headers.get('x-push-secret')||'',env.MESSAGE_PUSH_WORKER_SECRET))return response({error:'unauthorized'},401);
  if(!providers.platforms.length)return response({error:'push_not_configured'},503);
  try{
   const jobs=await rpc('community_push_claim',{p_platforms:providers.platforms});let sent=0,failed=0;
   // Bounded batches; tokens and recipient identifiers never enter logs or responses.
   for(let i=0;i<jobs.length;i+=5)await Promise.all(jobs.slice(i,i+5).map(async job=>{
    let result;try{result=await providers.send(job);}catch{result='retry';}
    await rpc('community_push_finish',{p_id:job.id,p_lease:job.lease,p_result:result});result==='sent'?sent++:failed++;
   }));
   return response({processed:jobs.length,sent,retry_or_skipped:failed});
  }catch{return response({error:'push_worker_failed'},503);}
 };
}
