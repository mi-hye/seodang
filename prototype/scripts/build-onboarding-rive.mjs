// Reproducible Rive v7 binary authored from the public Rive runtime schema.
// Field/type IDs: github.com/rive-app/rive-runtime/include/rive/generated.
// This source is the editable animation project; no editor account is required.
import {xs,ys,deform,durations} from './onboarding-motion.mjs';
import {writeFile} from 'node:fs/promises';
const chunks=[];
const uint=n=>{const b=[];do{let v=n&127;n>>>=7;b.push(v|(n?128:0));}while(n);return Buffer.from(b);};
const float=n=>{const b=Buffer.alloc(4);b.writeFloatLE(n);return b;};
const string=s=>{const b=Buffer.from(s);return Buffer.concat([uint(b.length),b]);};
const bytes=b=>Buffer.concat([uint(b.length),b]);
const obj=(type,props=[])=>{chunks.push(uint(type));for(const [id,kind,value]of props)chunks.push(uint(id),({u:uint,f:float,s:string,b:bytes}[kind])(value));chunks.push(uint(0));};
chunks.push(Buffer.from('RIVE'),uint(7),uint(0),uint(0),uint(0));
obj(23);
obj(105,[[203,'s','neutral'],[204,'u',0],[207,'f',512],[208,'f',512]]);
obj(1,[[4,'s','SeodangOnboarding'],[7,'f',512],[8,'f',512]]);
obj(100,[[4,'s','Original mascot'],[5,'u',0],[206,'u',0]]); // image 1
const indices=[];
for(let row=0;row<ys.length-1;row++)for(let col=0;col<xs.length-1;col++){
 const a=row*xs.length+col,b=a+1,c=a+xs.length,d=c+1;
 indices.push(a,b,c,b,d,c);
}
obj(109,[[4,'s','Connected original mesh'],[5,'u',1],[223,'b',Buffer.concat(indices.map(uint))]]); // mesh 2
const vertices=[];
for(const y of ys)for(const x of xs){
 const id=vertices.length+3;vertices.push({id,x,y});
 obj(108,[[5,'u',2],[24,'f',x],[25,'f',y],[215,'f',x/512],[216,'f',y/512]]);
}
function animation(name,duration,loop,tracks){
 obj(31,[[55,'s',name],[56,'u',60],[57,'u',duration],[59,'u',loop]]);
 for(const [object,property,frames,linear=true]of tracks){
  obj(25,[[51,'u',object]]);obj(26,[[53,'u',property]]);
  for(const [frame,value]of frames)obj(30,[[67,'u',frame],[68,'u',linear?1:0],[70,'f',value]]);
 }
}
// Remove redundant keys with a sub-pixel error bound (0.035 source pixels).
// This keeps long resting intervals cheap without changing visible motion.
function compact(keys){
 if(keys.length<=2)return keys;
 const [start,from]=keys[0],[end,to]=keys.at(-1);let error=.035,index=-1;
 for(let i=1;i<keys.length-1;i++){
  const [f,v]=keys[i],delta=Math.abs(v-(from+(to-from)*(f-start)/(end-start)));
  if(delta>error){error=delta;index=i;}
 }
 return index<0?[keys[0],keys.at(-1)]:[...compact(keys.slice(0,index+1)).slice(0,-1),...compact(keys.slice(index))];
}
// Smooth mesh coordinates are linearly interpolated by Rive at display refresh rate.
for(const [name,duration] of Object.entries(durations)){
 const tracks=[];
 for(const {id,x,y} of vertices){
  const frames=Array.from({length:duration/3+1},(_,i)=>{const f=i*3;return [f,deform(x,y,f,name)];});
  for(let axis=0;axis<2;axis++){
   const base=axis?y:x;
   if(frames.some(([,point])=>Math.abs(point[axis]-base)>.035))tracks.push([id,axis?25:24,compact(frames.map(([f,p])=>[f,p[axis]]))]);
  }
 }
 animation(name,duration,['Idle','Sit','Cheer'].includes(name)?1:0,tracks);
}
// Each machine owns entry → one-shot → idle, including the exit timing.
for(const [name,animationId]of [['Welcome',0],['Rest',1],['Speaking',2],['Sitting',3],['Listening',4],['Happy',5]]){
 obj(53,[[55,'s',name]]);obj(57,[[138,'s','Character']]);
 obj(63);obj(65,[[151,'u',3]]); // Entry → action
 obj(62);obj(64); // Any and exit states
 obj(61,[[138,'s',Object.keys(durations)[animationId]],[149,'u',animationId]]);
 if(animationId!==1&&animationId!==3&&animationId!==5){
  obj(65,[[151,'u',4],[152,'u',12],[160,'u',100]]); // 100% exit time
  obj(61,[[138,'s',animationId===4?'Sit':'Idle'],[149,'u',animationId===4?3:1]]);
 }
}
await writeFile('assets/rive/seodang-onboarding.riv',Buffer.concat(chunks));
console.log('Wrote Rive v7: standing, seated listening, and happy gestures');
