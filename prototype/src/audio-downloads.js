// Loaded only for playback, lesson downloads, or download settings.
let catalogPromise, databasePromise;
const inflight=new Map();
let generation=0;
const native=()=>globalThis.Capacitor?.isNativePlatform?.()&&globalThis.Capacitor.getPlatform()==='ios';
const bridge=(method,options={})=>globalThis.Capacitor.nativePromise('SeodangAudio',method,options);
export async function catalog(){
 catalogPromise ||= fetch(new URL('../assets/audio/catalog.json',import.meta.url),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Audio catalog unavailable');return r.json();}).catch(e=>{catalogPromise=null;throw e;});
 return catalogPromise;
}
function database(){
 databasePromise ||= new Promise((resolve,reject)=>{const r=indexedDB.open('seodang-audio-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('clips');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}).catch(e=>{databasePromise=null;throw e;});return databasePromise;
}
async function transaction(mode,work){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('clips',mode),r=work(tx.objectStore('clips'));tx.oncomplete=()=>resolve(r?.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Audio storage unavailable'));});}
export async function digest(buffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),n=>n.toString(16).padStart(2,'0')).join('');}
const keyOf=clip=>clip.sha256;
async function get(clip){
 if(native())return (await bridge('get',{key:keyOf(clip),bytes:clip.bytes})).uri||null;
 const buffer=await transaction('readonly',s=>s.get(keyOf(clip)));if(!buffer)return null;
 if(buffer.byteLength!==clip.bytes||await digest(buffer)!==clip.sha256){await transaction('readwrite',s=>s.delete(keyOf(clip)));return null;}
 return new Blob([buffer],{type:'audio/mp4'});
}
async function ensure(clip){
 const key=keyOf(clip);if(inflight.has(key))return inflight.get(key);
 const epoch=generation;
 const promise=(async()=>{
  const found=await get(clip);if(found)return found;
  const response=await fetch(clip.url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Audio download failed');
  const buffer=await response.arrayBuffer();if(buffer.byteLength!==clip.bytes||await digest(buffer)!==clip.sha256)throw Error('Audio checksum mismatch');
  if(epoch!==generation)throw Error('Audio download canceled');
  if(native()){
   const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   const saved=await bridge('put',{key,data:btoa(binary),bytes:clip.bytes});
   if(epoch!==generation)throw Error('Audio download canceled');return saved.uri;
  }
  const blob=new Blob([buffer],{type:'audio/mp4'});await transaction('readwrite',s=>s.put(buffer,key));return blob;
 })();inflight.set(key,promise);try{return await promise;}finally{if(inflight.get(key)===promise)inflight.delete(key);}
}
export async function resolveAudio(file){
 const clip=(await catalog()).files[file];if(!clip)throw Error(`Unpublished audio: ${file}`);
 const stored=await ensure(clip);
 if(typeof stored==='string')return {url:globalThis.Capacitor.convertFileSrc(stored),release(){}};
 const url=URL.createObjectURL(stored);return {url,release:()=>URL.revokeObjectURL(url)};
}
export async function downloadFiles(files,{signal,onProgress=()=>{}}={}){
 const c=await catalog();const unique=[...new Map(files.map(f=>{const clip=c.files[f];if(!clip)throw Error(`Unpublished audio: ${f}`);return [clip.sha256,clip];})).values()];
 let done=0;onProgress(done,unique.length);
 for(const clip of unique){if(signal?.aborted)throw new DOMException('Canceled','AbortError');await ensure(clip);if(signal?.aborted)throw new DOMException('Canceled','AbortError');onProgress(++done,unique.length);}
 // Persist browser downloads when the browser permits it; native uses Application Support.
 if(!native())await navigator.storage?.persist?.().catch(()=>{});
}
export async function downloadStatus(){
 if(native())return bridge('list');
 const blobs=await transaction('readonly',s=>s.getAll());return {count:blobs.length,bytes:blobs.reduce((n,b)=>n+b.byteLength,0)};
}
export async function clearDownloads(){
 generation++;await Promise.allSettled([...inflight.values()]);
 if(native())await bridge('clear');else await transaction('readwrite',s=>s.clear());
}
