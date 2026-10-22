import test from 'node:test';
import assert from 'node:assert/strict';
import {mountOnboardingCharacter} from '../src/onboarding-character.js';

test('character resize defers canvas writes, coalesces notifications and cancels disposal work',async()=>{
 const globals=['window','document','Image','fetch','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
 const original=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const frames=new Map(),observers=[];let frameId=0,resizes=0,insideObserver=false,writesDuringObserver=0;
 let bounds={width:100.8,height:99.2};
 class Canvas {
  constructor(){this._width=300;this._height=150;this.style={};}
  get width(){return this._width;}set width(value){if(insideObserver)writesDuringObserver++;this._width=Math.floor(value);}
  get height(){return this._height;}set height(value){if(insideObserver)writesDuringObserver++;this._height=Math.floor(value);}
  get clientWidth(){return Math.round(bounds.width);}get clientHeight(){return Math.round(bounds.height);}
  getBoundingClientRect(){return bounds;}
  getContext(){return {drawImage(){},clearRect(){},getImageData:()=>({data:new Uint8Array([0,0,0,255])})};}
  toBlob(callback){callback(new Blob(['image']));}
  setAttribute(){}remove(){}
 }
 const media={matches:false,addEventListener(){},removeEventListener(){}};
 const doc={hidden:false,addEventListener(){},removeEventListener(){},createElement:tag=>tag==='canvas'?new Canvas():{},head:{append:script=>queueMicrotask(()=>script.onload())}};
 const api={RuntimeLoader:{setWasmBinary(){}},decodeImage:async()=>({unref(){}}),Rive:class{
  constructor(options){this.canvas=options.canvas;this.animationNames=[];this.stateMachineNames=[];queueMicrotask(options.onLoad);}
  resizeDrawingSurfaceToCanvas(){resizes++;this.canvas.width=bounds.width*1.5;this.canvas.height=bounds.height*1.5;}
  pause(){}play(){}stop(){}cleanup(){}
 }};
 const host={ownerDocument:doc,dataset:{},append(canvas){this.canvas=canvas;}};
 let dispose;
 try{
  Object.assign(globalThis,{
   window:{rive:api,devicePixelRatio:1.5,matchMedia:()=>media},document:doc,
   Image:class{async decode(){}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}),
   ResizeObserver:class{constructor(callback){this.callback=callback;this.targets=[];observers.push(this);}observe(target){this.targets.push(target);}disconnect(){this.disconnected=true;}},
   requestAnimationFrame:callback=>{frames.set(++frameId,callback);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
  });
  dispose=mountOnboardingCharacter(host,{reducedMotion:true});
  for(let i=0;i<10&&!observers.length;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(observers.length,1);assert.equal(resizes,1);
  assert.deepEqual(observers[0].targets,[],'registration waits until the next frame');
  const notify=()=>{insideObserver=true;try{observers[0].callback();}finally{insideObserver=false;}};
  const flush=()=>{const batch=[...frames.values()];frames.clear();batch.forEach(callback=>callback());};
  flush();
  assert.deepEqual(observers[0].targets,[host.canvas]);
  bounds={width:120.8,height:110.2};
  notify();notify();notify();
  assert.equal(writesDuringObserver,0);assert.equal(resizes,1);
  assert.equal(frames.size,1,'resize notifications share one pending frame');
  flush();assert.equal(resizes,2);assert.equal(host.canvas.width,181);assert.equal(host.canvas.height,165);
  notify();flush();assert.equal(resizes,2,'fractional CSS sizes must match Rive integer dimensions');
  bounds={width:140,height:130};notify();assert.equal(frames.size,1);
  dispose();assert.equal(frames.size,0);assert.equal(observers[0].disconnected,true);
  notify();flush();assert.equal(resizes,2);assert.equal(writesDuringObserver,0);
  dispose=mountOnboardingCharacter(host,{reducedMotion:true});
  for(let i=0;i<10&&observers.length<2;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(observers.length,2);assert.deepEqual(observers[1].targets,[]);
  dispose();flush();
  assert.deepEqual(observers[1].targets,[],'disposal cancels pending registration');
  assert.equal(observers[1].disconnected,true);assert.equal(frames.size,0);
 }finally{
  dispose?.();
  for(const [key,descriptor]of original)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
 }
});
