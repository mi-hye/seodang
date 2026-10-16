import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics,ANALYTICS_KEY} from '../src/analytics-core.js';
import {createLearningTracker,learningSnapshot} from '../src/analytics-learning.js';
import {freshState,reduce} from '../src/engine.js';
function fixture(send=async()=>({ok:true})){
 const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 let time=Date.parse('2026-10-16T10:00:00Z'),i=0;
 const options={storage,send,now:()=>time,uuid:()=>`00000000-0000-4000-8000-${String(++i).padStart(12,'0')}`,environment:'development'};
 return {storage,map,options,a:createAnalytics(options),advance:ms=>time+=ms};
}
test('no storage, identifiers, events or requests before explicit consent',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return {ok:true};});
 assert.equal(f.a.capture('app_opened'),false);await f.a.flush();assert.equal(calls,0);assert.equal(f.map.size,0);assert.equal(f.a.installationId,null);
});
test('allowlist strips answers, names and unknown events; anonymous properties enforced',async()=>{
 let batches=[];const f=fixture(async b=>{batches.push(b);return {ok:true};});f.a.setConsent(true);
 f.a.capture('learning_progress',{course_direction:'ja-ko',level:2,answer:'secret',name:'name',$process_person_profile:true});
 assert.equal(f.a.capture('unknown'),false);await f.a.flush();assert.equal(batches[0].length,2);
 const p=batches[0][1].properties;assert.equal(p.answer,undefined);assert.equal(p.name,undefined);assert.equal(p.$process_person_profile,false);assert.equal(p.$geoip_disable,true);assert.equal(p.$ip,null);assert.equal(p.level,2);
});
test('retry survives restart with the exact UUID and original timestamp; backoff',async()=>{
 const seen=[];let success=false;const f=fixture(async b=>{seen.push(b);return {ok:success};});f.a.setConsent(true);f.a.capture('app_opened');await f.a.flush();await f.a.flush();assert.equal(seen.length,1);
 const restarted=createAnalytics(f.options);success=true;await restarted.flush();assert.deepEqual(seen[0],seen[1]);assert.equal(restarted.pending,0);
});
test('bounded offline queue expires after 7 days',async()=>{
 const f=fixture();f.a.setConsent(true);for(let i=0;i<250;i++)f.a.capture('learning_progress');assert.equal(f.a.pending,200);
 f.advance(8*86400000);await f.a.flush();assert.equal(f.a.pending,0);
});
test('withdraw consent aborts inflight and clears queue and identity; fresh opt-in uses new ID',async()=>{
 let signal,finish;const f=fixture((b,s)=>{signal=s;return new Promise(r=>finish=r);});f.a.setConsent(true);const first=f.a.installationId;const task=f.a.flush();f.a.setConsent(false);assert.equal(signal.aborted,true);finish({ok:true});await task;
 assert.equal(f.a.pending,0);assert.equal(f.a.installationId,null);assert.equal(f.a.capture('app_opened'),false);
 f.a.setConsent(true);assert.notEqual(f.a.installationId,first);
});
test('session survives page reload, opens again only after inactivity',()=>{
 const f=fixture();f.a.setConsent(true);assert.equal(f.a.capture('app_opened'),true);
 const a=createAnalytics(f.options);assert.equal(a.capture('app_opened'),false);f.advance(31*60000);assert.equal(a.capture('app_opened'),true);
});
test('storage errors never break learning and cannot activate collection',()=>{
 const a=createAnalytics({storage:{getItem(){throw Error();},setItem(){throw Error();}},send:async()=>assert.fail('must not send')});assert.equal(a.setConsent(true),false);assert.equal(a.capture('app_opened'),false);
});
test('cross-tab withdrawal reload prevents queued sends',async()=>{
 const f=fixture();f.a.setConsent(true);f.storage.setItem(ANALYTICS_KEY,JSON.stringify({consent:false,queue:[]}));f.a.reload();assert.equal(f.a.consent,false);assert.equal(f.a.pending,0);
});
test('new event arriving during flush is retained',async()=>{
 let finish;const f=fixture(()=>new Promise(r=>finish=r));f.a.setConsent(true);const task=f.a.flush();f.a.capture('learning_progress');finish({ok:true});await task;assert.equal(f.a.pending,1);
});
test('real Japanese and Korean snapshots track visible levels and independent lesson IDs',()=>{
 let s=freshState();s.courseDirection='ko-ja';s.onboardingLevel=2;s=reduce(s,{type:'sentence-start',id:3});let p=learningSnapshot(s,'sentence');assert.equal(p.lesson_id,'ko-ja:sentence:3');assert.equal(p.level,2);assert.equal(p.done,false);
 s=reduce(s,{type:'course',value:'ja-ko'});s.onboardingLevel=7;s=reduce(s,{type:'korean-start',id:'7-1'});p=learningSnapshot(s,'korean');assert.equal(p.lesson_id,'ja-ko:korean:7-1');assert.equal(p.level,5);
});
test('practice interception does not complete until final practice step; replay can complete again',()=>{
 const events=[];const t=createLearningTracker({capture:(e,p)=>events.push([e,p])},()=> '00000000-0000-4000-8000-000000000001');
 const start={lesson_id:'ko-ja:sentence:3',position:'intro',done:false};t.enter(start);
 const quiz={...start,position:'practice'};t.transition(start,quiz);assert.equal(events.filter(e=>e[0]==='lesson_completed').length,0);
 const done={...start,position:'summary',done:true};t.transition(quiz,done);t.transition(quiz,done);assert.equal(events.filter(e=>e[0]==='lesson_completed').length,1);
 t.enter(done);assert.equal(events.filter(e=>e[0]==='lesson_started').length,1);
 t.enter(start);t.transition(start,done);assert.equal(events.filter(e=>e[0]==='lesson_completed').length,2);
});
test('selection/no-op and opening/restarting a lesson do not count as learning',()=>{
 const events=[];const t=createLearningTracker({capture:e=>events.push(e)},()=> '00000000-0000-4000-8000-000000000001');const s={lesson_id:'ja-ko:korean:3-1',position:'learn',done:false};t.enter(s);t.transition(s,{...s});t.transition(s,{...s,position:'intro'},'korean-start');assert.deepEqual(events,['lesson_started']);
});
test('reconfirming consent preserves offline records and identity',()=>{
 const f=fixture();f.a.setConsent(true);f.a.capture('learning_progress');const id=f.a.installationId;assert.equal(f.a.setConsent(true),true);assert.equal(f.a.pending,2);assert.equal(f.a.installationId,id);
});
test('malformed persisted queue entries cannot crash collection',async()=>{
 const f=fixture();f.storage.setItem(ANALYTICS_KEY,JSON.stringify({consent:true,queue:[null,{},'invalid']}));const a=createAnalytics(f.options);assert.equal(a.capture('app_opened'),true);await a.flush();assert.equal(a.pending,0);
});
