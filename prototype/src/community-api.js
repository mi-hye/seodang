import {communityConfig} from './community-config.js';
export const SESSION_KEY='seodang.community.session.v1';
export const validText=(value,max)=>typeof value==='string'&&value.trim().length>0&&[...value.trim()].length<=max;
export const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:(()=>{throw Error('invalid_id');})();
export function createCommunityAPI({storage=globalThis.localStorage,fetcher=globalThis.fetch,config=communityConfig}={}){
 let session=null,refreshing=null,connecting=null;
 try{const saved=JSON.parse(storage.getItem(SESSION_KEY));if(saved&&typeof saved.access_token==='string'&&typeof saved.refresh_token==='string'&&Number.isFinite(saved.expires_at)&&saved.user?.id){uuid(saved.user.id);session=saved;}}catch{}
 const setSession=value=>{session=value;try{value?storage.setItem(SESSION_KEY,JSON.stringify(value)):storage.removeItem(SESSION_KEY);}catch{/* Session remains usable in memory. */}};
 async function request(path,{method='GET',body,token,headers={}}={}){
  const response=await fetcher(config.url+path,{method,headers:{apikey:config.key,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const data=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok){const error=Error(data?.message||data?.msg||data?.error_description||'network_error');error.status=response.status;error.code=data?.code||data?.error_code;throw error;}return data;
 }
 async function access(){
  if(!session?.access_token)throw Error('device_session_required');
  if(session.expires_at*1000>Date.now()+60000)return session.access_token;
  refreshing ||= request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}}).then(s=>{setSession(s);return s.access_token;}).catch(e=>{if(e.status===400||e.status===401)setSession(null);throw e;}).finally(()=>{refreshing=null;});
  return refreshing;
 }
 async function rest(table,query='',options={}){return request(`/rest/v1/community_${table}${query?'?'+query:''}`,{...options,token:await access()});}
 const insert=(table,body)=>rest(table,'',{method:'POST',body,headers:{Prefer:'return=representation'}}).then(rows=>rows[0]);
 async function createOnce(table,body){if(body.id){const rows=await rest(table,`id=eq.${uuid(body.id)}&select=*`);if(rows.length)return rows[0];}return insert(table,body);}
 const remove=(table,id)=>rest(table,`id=eq.${uuid(id)}`,{method:'DELETE'});
 const profileSelect='*,profile:community_profiles!author_id(id,nickname,native_language,learning_language,bio)';
 const photoPath=path=>{if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}-[0-9a-f-]{36}\.jpg$/.test(path))throw Error('invalid_photo_path');return path;};
 async function uploadPhoto(path,blob){
  const response=await fetcher(config.url+'/storage/v1/object/community-photos/'+photoPath(path),{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${await access()}`,'Content-Type':'image/jpeg','Cache-Control':'max-age=0','x-upsert':'false'},body:blob,signal:AbortSignal.timeout(60000)});
  if(response.ok)return;const data=await response.json().catch(()=>({}));if(response.status===409||data.error==='Duplicate')return;throw Error('photo_upload');
 }
 async function removePhotos(paths){if(paths.length)await request('/storage/v1/object/community-photos',{method:'DELETE',body:{prefixes:paths.map(photoPath)},token:await access()});}
 async function publishPhotos(body,photos){
  if(photos.length>2)throw Error('photo_limit');
  const found=await rest('posts',`id=eq.${uuid(body.id)}&select=*`);if(found.length)return found[0];
  const paths=[];
  for(const photo of photos){const path=`${session.user.id}/${body.id}-${uuid(photo.id)}.jpg`;photo.uploadedPath=path;await uploadPhoto(path,photo.blob);paths.push(path);}
  return createOnce('posts',{...body,author_id:session.user.id,image_paths:paths});
 }
 return {
  get session(){return session;},
  async ensureDeviceSession(){
   const probe=SESSION_KEY+'.probe';try{storage.setItem(probe,'1');if(storage.getItem(probe)!=='1')throw Error();storage.removeItem(probe);}catch{throw Error('device_storage_unavailable');}
   if(session){try{await access();return session;}catch(e){if(session)throw e;}}
   connecting ||= request('/auth/v1/signup',{method:'POST',body:{}}).then(saved=>{if(!saved.access_token||!saved.user?.id)throw Error('device_auth_unavailable');setSession(saved);return saved;}).finally(()=>{connecting=null;});
   return connecting;
  },
  async verify(){if(!session)return null;try{return await request('/auth/v1/user',{token:await access()});}catch(e){if(e.status===401||e.status===403)setSession(null);throw e;}},
  async deleteAccount(){await request('/functions/v1/community-delete-account',{method:'POST',token:await access()});setSession(null);},
  profile:()=>rest('profiles',`id=eq.${uuid(session.user.id)}&select=*`).then(r=>r[0]||null),
  async saveProfile(body){const query=`id=eq.${uuid(session.user.id)}`;const existing=await rest('profiles',query+'&select=id');return existing.length?(await rest('profiles',query,{method:'PATCH',body,headers:{Prefer:'return=representation'}}))[0]:insert('profiles',{...body,id:session.user.id});},
  feed:(language='',offset=0)=>rest('posts',`select=${profileSelect}&order=created_at.desc,id.desc&limit=20&offset=${Number(offset)||0}${['ko','ja'].includes(language)?'&language=eq.'+language:''}`),
  post:id=>rest('posts',`id=eq.${uuid(id)}&select=${profileSelect}`).then(r=>r[0]),
  publish:body=>createOnce('posts',{...body,author_id:session.user.id}),
  async deletePost(id){const rows=await rest('posts',`id=eq.${uuid(id)}&select=image_paths`);await remove('posts',id);await removePhotos(rows[0]?.image_paths||[]).catch(()=>{});},
  publishPhotos,
  removePhotos,
  async downloadPhoto(path){const response=await fetcher(config.url+'/storage/v1/object/authenticated/community-photos/'+photoPath(path)+'?v='+crypto.randomUUID(),{cache:'no-store',headers:{apikey:config.key,Authorization:`Bearer ${await access()}`},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('photo_load');return response.blob();},
  replies:(id,offset=0)=>rest('replies',`post_id=eq.${uuid(id)}&select=${profileSelect}&order=created_at.asc,id.asc&limit=30&offset=${Number(offset)||0}`),
  reply:body=>createOnce('replies',{...body,author_id:session.user.id}),
  deleteReply:id=>remove('replies',id),
  rooms:()=>rest('rooms','select=*,requester:community_profiles!requester_id(id,nickname,native_language,learning_language,bio),recipient:community_profiles!recipient_id(id,nickname,native_language,learning_language,bio)&order=created_at.desc&limit=100'),
  async requestRoom(other){try{return await insert('rooms',{requester_id:session.user.id,recipient_id:uuid(other)});}catch(e){if(e.code!=='23505')throw e;return (await rest('rooms',`or=(requester_id.eq.${uuid(other)},recipient_id.eq.${uuid(other)})`))[0];}},
  respond:(id,status)=>rest('rooms',`id=eq.${uuid(id)}&status=eq.pending`,{method:'PATCH',body:{status},headers:{Prefer:'return=representation'}}).then(rows=>{if(!rows.length)throw Error('room_changed');return rows[0];}),
  messages:(id,offset=0)=>rest('messages',`room_id=eq.${uuid(id)}&order=created_at.desc,id.desc&limit=50&offset=${Number(offset)||0}`),
  message:body=>createOnce('messages',{...body,author_id:session.user.id}),
  blocks:()=>rest('blocks',`owner_id=eq.${uuid(session.user.id)}&select=blocked_id`),
  block:id=>insert('blocks',{owner_id:session.user.id,blocked_id:uuid(id)}),
  unblock:id=>rest('blocks',`owner_id=eq.${uuid(session.user.id)}&blocked_id=eq.${uuid(id)}`,{method:'DELETE'}),
  report:body=>insert('reports',{...body,reporter_id:session.user.id}),
 };
}
