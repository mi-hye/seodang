const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const json=value=>b64(enc.encode(JSON.stringify(value)));
export async function signJWT(header,claims,pem,algorithm){
 const bytes=Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',bytes,algorithm,false,['sign']);
 const input=json(header)+'.'+json(claims);
 const signature=await crypto.subtle.sign(algorithm,key,enc.encode(input));
 return input+'.'+b64(signature);
}
export function createProviders(env,{fetcher=fetch,now=()=>Date.now()}={}){
 let fcm,apns;
 const service=env.FCM_SERVICE_ACCOUNT?JSON.parse(env.FCM_SERVICE_ACCOUNT):null;
 const platforms=[...(service?['android']:[]),...(env.APNS_PRIVATE_KEY&&env.APNS_KEY_ID&&env.APNS_TEAM_ID?['ios']:[])];
 const call=(url,options)=>fetcher(url,{...options,signal:AbortSignal.timeout(10000)});
 async function fcmToken(){
  if(fcm?.expires>now())return fcm.token;
  const time=Math.floor(now()/1000);
  const assertion=await signJWT({alg:'RS256',typ:'JWT'},{iss:service.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:time,exp:time+3600},service.private_key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'});
  const response=await call('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  if(!response.ok)throw Error('provider_auth');const data=await response.json();if(!data.access_token)throw Error('provider_auth');
  fcm={token:data.access_token,expires:now()+Math.max(0,(Number(data.expires_in)||3600)-120)*1000};return fcm.token;
 }
 async function apnsToken(){
  if(apns?.expires>now())return apns.token;
  const token=await signJWT({alg:'ES256',kid:env.APNS_KEY_ID},{iss:env.APNS_TEAM_ID,iat:Math.floor(now()/1000)},env.APNS_PRIVATE_KEY,{name:'ECDSA',namedCurve:'P-256',hash:'SHA-256'});
  apns={token,expires:now()+40*60*1000};return token;
 }
 return {platforms,async send(job){
  const body=job.locale==='ja'?'新しいメッセージが届きました':'새 메시지가 왔어요';
  const data={room_id:job.room_id,message_id:job.message_id,type:'message'};
  if(job.platform==='android'){
   const response=await call(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(service.project_id)}/messages:send`,{method:'POST',headers:{Authorization:'Bearer '+await fcmToken(),'Content-Type':'application/json'},body:JSON.stringify({message:{token:job.token,notification:{title:'서당',body},data,android:{priority:'high',ttl:'86400s',notification:{channel_id:'messages',tag:job.room_id,sound:'default',icon:'ic_message_notification'}}}})});
   if(response.ok)return 'sent';const error=await response.json().catch(()=>({}));
   if(error.error?.details?.some(d=>d.errorCode==='UNREGISTERED'))return 'invalid';
   if(response.status===401)fcm=null;
   return response.status===429||response.status>=500||[401,403].includes(response.status)?'retry':'failed';
  }
  if(job.platform==='ios'){
   const host=job.environment==='development'?'api.sandbox.push.apple.com':'api.push.apple.com';
   const response=await call(`https://${host}/3/device/${encodeURIComponent(job.token)}`,{method:'POST',headers:{authorization:'bearer '+await apnsToken(),'apns-topic':'com.mihye.seodang','apns-push-type':'alert','apns-priority':'10','apns-expiration':String(Math.floor(now()/1000)+86400),'apns-collapse-id':job.room_id,'apns-id':job.message_id},body:JSON.stringify({aps:{alert:{title:'서당',body},sound:'default','thread-id':job.room_id},...data})});
   if(response.ok)return 'sent';const error=await response.json().catch(()=>({}));
   if(response.status===410||error.reason==='BadDeviceToken')return 'invalid';
   if(response.status===403)apns=null;
   return response.status===429||response.status>=500||response.status===403?'retry':'failed';
  }
  return 'retry';
 }};
}
