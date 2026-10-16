import test from 'node:test';
import assert from 'node:assert/strict';
import {xs,ys,deform,durations} from '../scripts/onboarding-motion.mjs';

test('smooth mascot motion keeps the original rest shape and planted feet',()=>{
 for(const [name,duration] of Object.entries(durations)){
  for(const y of ys)for(const x of xs){
   assert.deepEqual(deform(x,y,0,name),[x,y]);
   const end=deform(x,y,duration,name);
   assert.ok(Math.hypot(end[0]-x,end[1]-y)<1e-8);
   if(y>=418)for(let f=0;f<=duration;f+=3)assert.deepEqual(deform(x,y,f,name),[x,y]);
  }
 }
});
test('the connected image mesh never folds, tears or jumps between adjacent frames',()=>{
 const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(const [name,duration] of Object.entries(durations)){
  let previous;
  for(let f=0;f<=duration;f++){
   const points=ys.flatMap(y=>xs.map(x=>deform(x,y,f,name)));
   if(previous)points.forEach((p,i)=>assert.ok(Math.hypot(p[0]-previous[i][0],p[1]-previous[i][1])<6,`${name} frame ${f} moves too far`));
   for(let r=0;r<ys.length-1;r++)for(let c=0;c<xs.length-1;c++){
    const a=r*xs.length+c,b=a+1,d=a+xs.length,e=d+1;
    assert.ok(area(points[a],points[b],points[d])>0,`${name} frame ${f}: folded triangle`);
    assert.ok(area(points[b],points[e],points[d])>0,`${name} frame ${f}: folded triangle`);
   }
   previous=points;
  }
 }
});

test('all poses keep the belly and body sides fixed',()=>{
 for(const [name,duration] of Object.entries(durations)){
  for(let frame=0;frame<=duration;frame++){
   for(const y of [320,344,368,392,416])for(const x of [176,192,216,240,264,288,312,320]){
    assert.deepEqual(deform(x,y,frame,name),[x,y],`${name} frame ${frame}: torso must stay fixed`);
   }
  }
 }
});
