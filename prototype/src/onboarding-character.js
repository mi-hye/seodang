const rigAtlas='assets/mascot/seodang-cartoon-atlas-v1.png';
// Shared optional Rive renderer, loaded on demand by onboarding and the learning map.
let runtimePromise;const layerBytePromises={};
function loadRuntime(){
 return runtimePromise ||= new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='assets/vendor/rive/rive.js';
  script.onload=async()=>{try{const api=window.rive;const response=await fetch('assets/vendor/rive/rive.wasm');if(!response.ok)throw Error('Rive WASM unavailable');api.RuntimeLoader.setWasmBinary(await response.arrayBuffer());resolve(api);}catch(error){runtimePromise=null;reject(error);}};
  script.onerror=()=>{script.remove();runtimePromise=null;reject(Error('Rive runtime unavailable'));};document.head.append(script);
 });
}
// Copy whole original poses without repainting, stretching, or reassembling anatomy.
async function layerBytes(includeVariants){
 return layerBytePromises[includeVariants] ||= (async()=>{
  const atlas=new Image();atlas.src=rigAtlas;
  await atlas.decode();
  const sitting=new Image();if(includeVariants){sitting.src='assets/mascot/seodang-sitting-v1.png';await sitting.decode();}
  const result={};
  for(const pose of (includeVariants?['standing','sitting','happy']:['standing'])){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
   const context=canvas.getContext('2d');
   if(pose==='sitting'){
    // Same head width and foot baseline as the original; no body scaling animation.
    context.drawImage(sitting,-64,-55,640,640);
   }else{
    // Restore the intact original pose, including its resting front paws.
    context.drawImage(atlas,pose==='happy'?1024:0,0,512,512,0,0,512,512);
   }
   const blob=await new Promise(resolve=>canvas.toBlob(resolve));if(!blob)throw Error('Character image unavailable');
   result[`${pose}:neutral`]=new Uint8Array(await blob.arrayBuffer());
  }
  return result;
 })().catch(error=>{delete layerBytePromises[includeVariants];throw error;});
}
export function mountOnboardingCharacter(host,{state='idle',pose='standing',reducedMotion=false}={}){
 let disposed=false,instance,observer,transition,readyFrame,observeFrame,resizeFrame;const decoded=[],assets={},images={};
 let activePose=pose;
 const machine=()=>activePose==='sitting'?'Sitting':activePose==='happy'?'Happy':state==='greeting'?'Welcome':state==='talking'?'Speaking':'Rest';
 const doc=host.ownerDocument,media=window.matchMedia('(prefers-reduced-motion: reduce)');
 const still=()=>reducedMotion||media.matches;
 let activeMachine=machine();
 const visibility=()=>{if(!instance)return;if(doc.hidden)instance.pause();else if(!still())instance.play(activeMachine);};
 const motion=()=>{if(!instance)return;instance.stop();activeMachine=machine();host.dataset.riveAnimation=activeMachine;instance.play(activeMachine);if(still())instance.pause();};
 const canvas=document.createElement('canvas');canvas.className='guide-rive-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 host.dataset.renderer='loading';
 (async()=>{
  const [api,bytes]=await Promise.all([loadRuntime(),layerBytes(state!=='idle'||pose!=='standing')]);if(disposed)return;
  for(const [name,data]of Object.entries(bytes)){const image=await api.decodeImage(data);if(disposed){image.unref();return;}decoded.push(image);images[name]=image;}
  instance=new api.Rive({src:'assets/rive/seodang-onboarding.riv',canvas,artboard:'SeodangOnboarding',stateMachine:activeMachine,autoplay:true,
   enableRiveAssetCDN:false,
   assetLoader:asset=>{const image=images[`${activePose}:${asset.name}`];if(!image)return false;assets[asset.name]=asset;asset.setRenderImage(image);return true;},
   onLoad:()=>{
    if(disposed)return;
    instance.resizeDrawingSurfaceToCanvas();host.dataset.pose=activePose;host.dataset.riveAnimation=still()?'Idle':activeMachine;
    // Load completes before Rive's deferred renderer has painted its first frame.
    // Keep the original pose visible until the canvas actually contains pixels.
    const probe=doc.createElement('canvas');probe.width=probe.height=32;
    const context=probe.getContext('2d',{willReadFrequently:true});
    const reveal=()=>{
     if(disposed||!instance)return;
     if(canvas.width&&canvas.height){
      context.clearRect(0,0,32,32);context.drawImage(canvas,0,0,32,32);
      const pixels=context.getImageData(0,0,32,32).data;
      if(pixels.some((value,index)=>index%4===3&&value>0)){host.dataset.renderer='rive';return;}
     }
     readyFrame=requestAnimationFrame(reveal);
    };
    readyFrame=requestAnimationFrame(reveal);
    host.dataset.riveAnimations=instance.animationNames.join(',');host.dataset.riveMachines=instance.stateMachineNames.join(',');
    if(still()||doc.hidden)instance.pause();
    observer=new ResizeObserver(()=>{
     if(disposed||resizeFrame!==undefined)return;
     // Canvas backing-size writes must run outside ResizeObserver delivery.
     resizeFrame=requestAnimationFrame(()=>{
      resizeFrame=undefined;if(disposed||!instance)return;
      const ratio=window.devicePixelRatio||1,{width,height}=canvas.getBoundingClientRect();
      // Match Rive's bounding-rect sizing and the canvas integer attributes.
      if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio))instance.resizeDrawingSurfaceToCanvas();
     });
    });
    // Start observing on a frame boundary after Rive's initial surface setup.
    observeFrame=requestAnimationFrame(()=>{observeFrame=undefined;if(!disposed)observer.observe(canvas);});
   },
   onLoadError:()=>{host.dataset.renderer='fallback';instance?.cleanup();instance=null;}
  });
 })().catch(()=>{if(!disposed)host.dataset.renderer='fallback';});
 doc.addEventListener('visibilitychange',visibility);media.addEventListener('change',motion);
 const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(readyFrame);cancelAnimationFrame(observeFrame);cancelAnimationFrame(resizeFrame);transition?.remove();observer?.disconnect();doc.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motion);instance?.cleanup();instance=null;for(const image of decoded)image.unref();canvas.remove();};
 dispose.replay=()=>{if(disposed||!instance||still())return;instance.stop();activeMachine=activePose==='sitting'?'Listening':activePose==='happy'?'Happy':'Welcome';instance.play(activeMachine);host.dataset.riveAnimation=activeMachine;};
 dispose.setPose=next=>{
  if(disposed||!['standing','sitting','happy'].includes(next)||next===activePose)return;
  if(instance&&!images[`${next}:neutral`])return;
  transition?.remove();
  if(instance&&!still()&&host.dataset.renderer==='rive'){
   transition=doc.createElement('canvas');transition.width=canvas.width;transition.height=canvas.height;
   transition.className='guide-rive-canvas';transition.style.zIndex='1';transition.setAttribute('aria-hidden','true');
   transition.getContext('2d').drawImage(canvas,0,0);host.append(transition);
   const overlay=transition;
   overlay.animate([{opacity:1},{opacity:0}],{duration:240,easing:'ease-in-out',fill:'forwards'}).onfinish=()=>overlay.remove();
  }
  activePose=next;activeMachine=machine();host.dataset.pose=next;
  if(!instance)return;
  for(const [name,asset]of Object.entries(assets))asset.setRenderImage(images[`${next}:${name}`]);
  instance.stop();instance.play(activeMachine);if(still()||doc.hidden)instance.pause();
 };
 return dispose;
}
