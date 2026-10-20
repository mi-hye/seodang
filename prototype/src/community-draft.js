// Drafts stay on this device, scoped to account and learning direction. No signed URLs.
let database;
const writes=new Map(),revisions=new Map();
function open(){
 if(!database)database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('seodang.community.drafts',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
  request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('draft_storage_blocked'));
 }).catch(error=>{database=null;throw error;});
 return database;
}
export const draftKey=(owner,direction)=>owner?`${owner}:${direction}`:null;
async function transaction(key,mode,operation){
 if(!key)throw Error('draft_owner_missing');
 const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts',mode),request=operation(tx.objectStore('drafts'));let value;request.addEventListener('success',()=>{value=request.result;});tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('draft_storage_failed'));});
}
export async function readDraft(key){
 await writes.get(key)?.catch(()=>{});
 const value=await transaction(key,'readonly',store=>store.get(key));
 if(value?.photos&&Array.isArray(value.photos))value.photos=value.photos.map(p=>p.bytes instanceof ArrayBuffer?{id:p.id,blob:new Blob([p.bytes],{type:p.type})}:p);
 if(!value||value.version!==1||typeof value.body!=='string'||value.body.length>600||!['ja','ko'].includes(value.language)||typeof value.wants_correction!=='boolean'||!Array.isArray(value.photos)||value.photos.length>2||value.photos.some(p=>typeof p.id!=='string'||!(p.blob instanceof Blob)||p.blob.size>3*1024*1024))return null;
 return value;
}
function enqueue(key,operation){const pending=(writes.get(key)||Promise.resolve()).catch(()=>{}).then(operation);writes.set(key,pending);void pending.finally(()=>{if(writes.get(key)===pending)writes.delete(key);}).catch(()=>{});return pending;}
export function saveDraft(key,draft){
 const value={version:1,body:draft.body||'',language:draft.language,wants_correction:draft.wants_correction!==false,...(draft.id?{id:draft.id}:{}),photos:(draft.photos||[]).map(({id,blob})=>({id,blob}))};
 const revision=(revisions.get(key)||0)+1;revisions.set(key,revision);
 return enqueue(key,async()=>{
  if(revisions.get(key)!==revision)return;
  // Store bytes instead of Blob objects: WebKit may abort Blob persistence.
  value.photos=await Promise.all(value.photos.map(async({id,blob})=>({id,bytes:await blob.arrayBuffer(),type:blob.type})));
  if(revisions.get(key)===revision)return transaction(key,'readwrite',store=>store.put(value,key));
 });
}
// Clear only the submitted snapshot: a newer draft may have been edited in another mount.
export function clearDraft(key,expected){
 if(!expected){revisions.set(key,(revisions.get(key)||0)+1);return enqueue(key,()=>transaction(key,'readwrite',store=>store.delete(key)));}
 return enqueue(key,()=>transaction(key,'readwrite',store=>{
  const request=store.get(key);request.addEventListener('success',()=>{const current=request.result;
   if(current&&['id','body','language','wants_correction'].every(k=>current[k]===expected[k])&&JSON.stringify(current.photos.map(p=>p.id))===JSON.stringify(expected.photos.map(p=>p.id)))store.delete(key);
  });return request;
 }));
}
