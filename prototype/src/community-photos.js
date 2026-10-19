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
// Fetch private images only near the viewport; never persist authenticated image URLs.
export function mountPostPhotos(host,api,failureLabel){
 let live=true;const urls=new Set();
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const image=entry.target;observer.unobserve(image);
  void api.downloadPhoto(image.dataset.postPhoto).then(blob=>{if(!live||!image.isConnected)return;const url=URL.createObjectURL(blob);urls.add(url);image.src=url;image.classList.add('ready');}).catch(()=>{if(live&&image.isConnected){image.alt=failureLabel;image.classList.add('failed');}});
 }},{rootMargin:'200px'});
 host.querySelectorAll('[data-post-photo]').forEach(image=>observer.observe(image));
 return ()=>{live=false;observer.disconnect();urls.forEach(url=>URL.revokeObjectURL(url));};
}
