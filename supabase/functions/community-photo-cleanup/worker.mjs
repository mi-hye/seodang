export async function cleanupPhotos({url,service,fetcher=fetch}) {
 const headers={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
 async function rpc(name,body){const response=await fetcher(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`rpc_${name}_${response.status}`);return response.json();}
 const jobs=await rpc('community_claim_photo_cleanup',{batch_size:20});
 const result={claimed:jobs.length,deleted:0,retry:0};
 // Small parallel batches keep a stalled Storage request within the worker timeout.
 for(let start=0;start<jobs.length;start+=5)await Promise.all(jobs.slice(start,start+5).map(async job=>{
  let succeeded=false,failure=null;
  try{
   const response=await fetcher(`${url}/storage/v1/object/community-photos`,{method:'DELETE',headers,body:JSON.stringify({prefixes:[job.path]}),signal:AbortSignal.timeout(10000)});
   succeeded=response.ok;failure=succeeded?null:`storage_${response.status}`;
  }catch{failure='storage_unavailable';}
  try{const done=await rpc('community_finish_photo_cleanup',{photo_path:job.path,token:job.lease_token,succeeded,failure});done?result.deleted++:result.retry++;}
  catch{result.retry++;} // An unacknowledged lease expires and can be claimed again.
 }));
 return result;
}
