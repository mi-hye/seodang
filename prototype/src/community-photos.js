export const MAX_PHOTOS=2;
export async function preparePhoto(file){
 if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type))throw Error('photo_format');
 if(file.size>20*1024*1024)throw Error('photo_size');
 const source=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('photo_format'));image.src=source;});
  if(!image.naturalWidth||!image.naturalHeight)throw Error('photo_format');
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));
  if(!blob||blob.size>3*1024*1024)throw Error('photo_size');
  return {id:crypto.randomUUID(),blob,preview:URL.createObjectURL(blob)};
 }finally{URL.revokeObjectURL(source);image.src='';}
}
// Keep decoded nodes across redraws; transfer their object URLs to the next mount.
const photoScope=api=>`${api.session?.user?.id||''}:${api.photoCacheVersion||0}`;
export function retainPostPhotos(host,api){
 const images=new Map([...host.querySelectorAll('[data-post-photo].ready')].filter(image=>image.dataset.photoScope===photoScope(api)).map(image=>[image.dataset.postPhoto,image]));
 return ()=>host.querySelectorAll('[data-post-photo]').forEach(next=>{const old=images.get(next.dataset.postPhoto);if(old){next.replaceWith(old);images.delete(next.dataset.postPhoto);}});
}
export function mountPostPhotos(host,api,failureLabel){
 let live=true;const urls=new Map();
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const image=entry.target;observer.unobserve(image);
  void api.downloadPhoto(image.dataset.postPhoto).then(async blob=>{
   if(!live||!image.isConnected)return;
   const url=URL.createObjectURL(blob);urls.set(url,image);image.loading='eager';image.src=url;
   try{await image.decode();}catch(error){if(!image.complete||!image.naturalWidth)throw error;}
   if(live&&image.isConnected){image.classList.add('ready');image.closest('.community-photo-frame')?.setAttribute('aria-busy','false');}
  }).catch(()=>{if(live&&image.isConnected){api.discardPhoto?.(image.dataset.postPhoto);const url=image.getAttribute('src');if(url&&urls.has(url)){URL.revokeObjectURL(url);urls.delete(url);}image.removeAttribute('src');image.alt=failureLabel;image.classList.add('failed');image.closest('.community-photo-frame')?.setAttribute('aria-busy','false');}});
 }},{rootMargin:'200px'});
 host.querySelectorAll('[data-post-photo]').forEach(image=>{image.dataset.photoScope=photoScope(api);if(image.classList.contains('ready')&&image.src.startsWith('blob:')){urls.set(image.src,image);image.closest('.community-photo-frame')?.setAttribute('aria-busy','false');}else observer.observe(image);});
 return (transfer=false)=>{live=false;observer.disconnect();for(const [url,image] of urls)if(!transfer||!image.isConnected)URL.revokeObjectURL(url);};
}
