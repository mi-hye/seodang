const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return response(405,{error:'method_not_allowed'});
 const authorization=req.headers.get('Authorization');
 if(!authorization?.startsWith('Bearer '))return response(401,{error:'unauthorized'});
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 try{
  // The caller's token, never a supplied user ID, determines which account is deleted.
  const verified=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:authorization}});
  if(!verified.ok)return response(401,{error:'unauthorized'});
  const user=await verified.json();
  if(!user.id)return response(403,{error:'unauthorized'});
  // Storage must be emptied through its API before deleting the owning auth user.
  const storageHeaders={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
  for(let page=0;page<100;page++){
   const listed=await fetch(url+'/storage/v1/object/list/community-photos',{method:'POST',headers:storageHeaders,body:JSON.stringify({prefix:user.id+'/',limit:100,offset:0})});
   if(!listed.ok)return response(503,{error:'photo_cleanup_failed'});
   const objects=await listed.json();if(!Array.isArray(objects))return response(503,{error:'photo_cleanup_failed'});
   if(!objects.length)break;
   const prefixes=objects.map((item:{name:string})=>user.id+'/'+item.name);
   const removed=await fetch(url+'/storage/v1/object/community-photos',{method:'DELETE',headers:storageHeaders,body:JSON.stringify({prefixes})});
   if(!removed.ok)return response(503,{error:'photo_cleanup_failed'});
   if(page===99)return response(503,{error:'photo_cleanup_incomplete'});
  }
  const deleted=await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(user.id),{method:'DELETE',headers:{apikey:service,Authorization:`Bearer ${service}`}});
  if(!deleted.ok)return response(500,{error:'delete_failed'});
  return response(200,{deleted:true});
 }catch{return response(503,{error:'unavailable'});}
});
