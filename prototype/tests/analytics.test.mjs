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
 const events=[];const t=createLearningTracker({capture:(e,p)=>events.push([e,p])},()=> '00000000-0000-4000-8000-000000000001',()=>0);
 const start={lesson_id:'ko-ja:sentence:3',position:'intro',done:false};t.enter(start);
 const quiz={...start,position:'practice'};t.transition(start,quiz);assert.equal(events.filter(e=>e[0]==='lesson_completed').length,0);
 const done={...start,position:'summary',done:true};t.transition(quiz,done);t.transition(quiz,done);assert.equal(events.filter(e=>e[0]==='lesson_completed').length,1);
 t.enter(done);assert.equal(events.filter(e=>e[0]==='lesson_started').length,1);
 t.enter(start);t.transition(start,done);assert.equal(events.filter(e=>e[0]==='lesson_completed').length,2);
});
test('selection/no-op and opening/restarting a lesson do not count as learning',()=>{
 const events=[];const t=createLearningTracker({capture:e=>events.push(e)},()=> '00000000-0000-4000-8000-000000000001',()=>0);const s={lesson_id:'ja-ko:korean:3-1',position:'learn',done:false};t.enter(s);t.transition(s,{...s});t.transition(s,{...s,position:'intro'},'korean-start');assert.deepEqual(events,['lesson_started']);
});
test('reconfirming consent preserves offline records and identity',()=>{
 const f=fixture();f.a.setConsent(true);f.a.capture('learning_progress');const id=f.a.installationId;assert.equal(f.a.setConsent(true),true);assert.equal(f.a.pending,2);assert.equal(f.a.installationId,id);
});
test('malformed persisted queue entries cannot crash collection',async()=>{
 const f=fixture();f.storage.setItem(ANALYTICS_KEY,JSON.stringify({consent:true,consent_version:3,queue:[null,{},'invalid']}));const a=createAnalytics(f.options);assert.equal(a.capture('app_opened'),true);await a.flush();assert.equal(a.pending,0);
});

test('expanded collection requires renewed version 3 consent',async()=>{
 const f=fixture(async()=>assert.fail('old consent must not send'));
 f.storage.setItem(ANALYTICS_KEY,JSON.stringify({consent:true,consent_version:1,queue:[]}));
 const a=createAnalytics(f.options);assert.equal(a.consent,null);assert.equal(a.capture('app_opened'),false);await a.flush();
});
test('foreground duration excludes background and idle beyond 60 seconds, resumes on interaction',()=>{
 let time=0;const events=[];const t=createLearningTracker({capture:(e,p)=>events.push([e,p])},()=> '00000000-0000-4000-8000-000000000001',()=>time);
 t.enter({lesson_id:'ko-ja:basic:6',position:'learn',done:false});time=10000;t.visibility(false);time=900000;t.visibility(true);time+=5000;t.activity();time+=300000;t.tick();
 assert.equal(events.filter(e=>e[0]==='step_time').reduce((n,e)=>n+e[1].active_ms,0),75000);
 time+=100000;t.tick();assert.equal(events.filter(e=>e[0]==='step_time').length,3);
});
test('real reducer repeated wrong answers, correct answers and empty selections are distinct',()=>{
 const events=[];const t=createLearningTracker({capture:(e,p)=>events.push([e,p])},()=> '00000000-0000-4000-8000-000000000001',()=>0);
 let s=reduce({...freshState(),listening:{completed:true}},{type:'basic-start',id:6});t.enter(learningSnapshot(s,'basic'));
 const act=a=>{const before=learningSnapshot(s,'basic');s=reduce(s,a);t.transition(before,learningSnapshot(s,'basic'),a.type);};
 act({type:'basic-next'});act({type:'basic-next'});act({type:'basic-check'});
 act({type:'basic-select',id:1});act({type:'basic-check'});act({type:'basic-check'});act({type:'basic-select',id:0});act({type:'basic-check'});
 assert.deepEqual(events.filter(e=>e[0]==='answer_checked').map(e=>e[1].correct),[false,false,true]);
});
test('final checked answer uses reducer result before practice interception; completion waits for practice',async()=>{
 const {prepareContent,interceptCompletion}=await import('../src/practice-content.js');await prepareContent('sentence');
 const events=[];const t=createLearningTracker({capture:(e,p)=>events.push([e,p])},()=> '00000000-0000-4000-8000-000000000001',()=>0);
 let s=reduce(freshState(),{type:'sentence-start',id:3});s.sentenceLessons[3]={...s.sentenceLessons[3],phase:'arrange',index:5,selected:'2'};
 const before=learningSnapshot(s,'sentence');t.enter(before);const action={type:'sentence-check'},judged=reduce(s,action),after=interceptCompletion(s,judged,'sentence',action);
 t.transition(before,learningSnapshot(after,'sentence'),action.type,learningSnapshot(judged,'sentence'));
 assert.equal(events.find(e=>e[0]==='answer_checked')[1].correct,true);assert.equal(events.some(e=>e[0]==='lesson_completed'),false);
 assert.equal(learningSnapshot({...after,practices:{...after.practices,'ko-ja:sentence:3':{...after.practices['ko-ja:sentence:3'],index:2}}},'sentence').item_index,2);
});
test('audio context stays with initiating attempt; navigation records explicit exit',()=>{
 const events=[];let id=0;const t=createLearningTracker({capture:(e,p)=>events.push([e,p])},()=>String(++id),()=>0);
 t.enter({lesson_id:'ko-ja:basic:6',position:'learn'});const report=t.audio('file');report('started');t.enter({lesson_id:'ko-ja:basic:7',position:'intro'});report('failed');
 assert.equal(events.find(e=>e[0]==='audio_playback'&&e[1].audio_result==='failed')[1].lesson_id,'ko-ja:basic:6');
 assert.equal(events.find(e=>e[0]==='lesson_exited')[1].exit_reason,'navigation');
});
test('new properties remain numeric/enum only; internal state never leaves queue',()=>{
 const f=fixture();f.a.setConsent(true);f.a.capture('answer_checked',{item_index:3,correct:false,_selected:true,_retry:true,position:'secret',round_index:0,mode_index:2,audio_result:'secret',active_ms:999999});
 const p=JSON.parse(f.map.get(ANALYTICS_KEY)).queue.at(-1).properties;assert.equal(p.item_index,3);assert.equal(p.correct,false);for(const k of ['_selected','_retry','position','audio_result','active_ms'])assert.equal(p[k],undefined);
});
test('restart followed by navigation starts exactly one fresh attempt',()=>{
 const events=[];let id=0;const t=createLearningTracker({capture:(e,p)=>events.push([e,p])},()=>String(++id),()=>0);
 const s={lesson_id:'ko-ja:play:0',position:'learn',done:false};t.enter(s);const reset={...s,position:'intro'};t.transition(s,reset,'restart');t.enter(reset);
 assert.equal(events.filter(e=>e[0]==='lesson_started').length,2);assert.deepEqual(events.filter(e=>e[0]==='lesson_exited').map(e=>e[1].exit_reason),['restart']);
});
