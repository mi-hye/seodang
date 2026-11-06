import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics,ANALYTICS_KEY} from '../src/analytics-core.js';
import {createOperationLogger,operationError} from '../src/analytics-operations.js';
function fixture(){
 const saved=new Map(),batches=[];let n=0,time=0;
 const uuid=()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`;
 const storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const options={storage,uuid,send:async batch=>{batches.push(...batch);return {ok:true};}};
 const analytics=createAnalytics(options),logger=createOperationLogger(analytics,{uuid,now:()=>time});
 return {analytics,logger,options,saved,batches,tick:ms=>time+=ms};
}
test('operations are consent-gated, paired once, timed, and privacy filtered',async()=>{
 const f=fixture();f.logger.start('message_send').finish();assert.equal(f.saved.size,0);
 f.analytics.setConsent(true);
 const op=f.logger.start('speech_recognition',{course_direction:'ja-ko',lesson_id:'ja-ko:korean:7-1',body:'private message',transcript:'private voice',token:'private token'});
 f.tick(30);op.ready();op.ready();f.tick(70);op.finish('succeeded',{recognition_result:'different',stack:'private stack'});op.fail(Error('late'));
 await f.analytics.flush();const events=f.batches.filter(e=>e.event==='feature_operation');
 assert.deepEqual(events.map(e=>e.properties.result),['started','ready','succeeded']);
 assert.equal(new Set(events.map(e=>e.properties.operation_id)).size,1);
 assert.equal(events[2].properties.duration_ms,100);assert.equal(events[2].properties.recognition_result,'different');
 assert.ok(!JSON.stringify(f.batches).includes('private'));assert.equal(events[0].properties.consent_version,4);
});
test('withdrawal and re-consent cannot complete an earlier user operation',async()=>{
 const f=fixture();f.analytics.setConsent(true);const op=f.logger.start('message_send');
 f.analytics.setConsent(false);f.analytics.setConsent(true);op.finish();await f.analytics.flush();
 assert.equal(f.batches.filter(e=>e.event==='feature_operation').length,0);
});
test('v3 consent cannot authorize new operations and opting out remains opted out',async()=>{
 const f=fixture();f.saved.set(ANALYTICS_KEY,JSON.stringify({consent:true,consent_version:3,queue:[]}));
 const a=createAnalytics(f.options);assert.equal(a.consent,null);assert.equal(a.capture('feature_operation'),false);await a.flush();assert.equal(f.batches.length,0);
 f.saved.set(ANALYTICS_KEY,JSON.stringify({consent:false,consent_version:3,queue:[]}));assert.equal(createAnalytics(f.options).consent,false);
});
test('unknown error messages and codes do not leak; known permission and HTTP failures map to codes',()=>{
 assert.equal(operationError({message:'secret transcript',code:'secret code'}),'unknown');
 assert.equal(operationError({code:'PERMISSION_DENIED'}),'permission_denied');
 assert.equal(operationError({status:503,message:'secret URL'}),'unavailable');
 assert.equal(operationError({name:'TimeoutError'}),'timeout');
});
test('logging failure preserves operation result and original rejection',async()=>{
 const logger=createOperationLogger({consent:true,installationId:'owner',capture(){throw Error('logging');}});
 assert.equal(await logger.run('message_send',{},async()=>42),42);
 const original=Error('private server failure');await assert.rejects(logger.run('message_send',{},async()=>{throw original;}),e=>e===original);
});
test('waiting and cancellation are terminal outcomes, not failures',async()=>{
 const f=fixture();f.analytics.setConsent(true);
 await f.logger.run('conversation_match',{},async()=>({status:'waiting'}),r=>r.status);
 f.logger.start('speech_recognition').finish('cancelled');await f.analytics.flush();
 assert.deepEqual(f.batches.filter(e=>e.event==='feature_operation').map(e=>e.properties.result),['started','waiting','started','cancelled']);
});
