// Session-local private blobs only. Never persist tokens, URLs or photos to disk.
export function createPhotoCache({now=Date.now,ttl=5*60*1000,maxBytes=24*1024*1024,maxEntries=40}={}){
 const entries=new Map(),pending=new Map();let bytes=0,generation=0;
 const drop=key=>{const entry=entries.get(key);if(entry){bytes-=entry.blob.size;entries.delete(key);}};
 function clear(){generation++;entries.clear();pending.clear();bytes=0;}
 async function get(key,load){
  for(const [k,v] of entries)if(v.until<=now())drop(k);
  const hit=entries.get(key);if(hit){entries.delete(key);entries.set(key,hit);return hit.blob;}
  if(pending.has(key))return pending.get(key);
  const ticket=generation;
  const task=Promise.resolve().then(load).then(blob=>{
   if(ticket!==generation||pending.get(key)!==task)throw Error('photo_load');
   if(blob.size<=maxBytes){entries.set(key,{blob,until:now()+ttl});bytes+=blob.size;while(bytes>maxBytes||entries.size>maxEntries)drop(entries.keys().next().value);}
   return blob;
  }).finally(()=>{if(pending.get(key)===task)pending.delete(key);});
  pending.set(key,task);return task;
 }
 return {get,clear,drop(key){drop(key);pending.delete(key);}};
}
