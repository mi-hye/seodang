import test from 'node:test';import assert from 'node:assert/strict';
import {createMessagePush} from '../src/message-push.js';
import {createHandler} from '../../supabase/functions/message-push/handler.mjs';
import {createProviders} from '../../supabase/functions/message-push/providers.mjs';
const id='10000000-0000-4000-8000-000000000001';
function setup({permission='prompt',saveFails=false,nativeBridge=false,storedRecord=null,promptResult='granted',permissionGate=null}={}){
 const listeners={},calls=[];let stored=JSON.stringify(storedRecord);
 const api={session:{user:{id}},async pushDevice(p){calls.push(p);if(saveFails)throw Error('offline');}};
 const plugin={async addListener(n,fn){listeners[n]=fn;return {remove(){}};},async checkPermissions(){if(permissionGate)await permissionGate;return {receive:permission};},async requestPermissions(){calls.push('permission');permission=promptResult;return {receive:permission};},async register(){calls.push('register');queueMicrotask(()=>listeners.registration({value:'a'.repeat(64)}));},async unregister(){calls.push('unregister');},async createChannel(){}};
 const controller=createMessagePush({cap:{getPlatform:()=> 'ios',isPluginAvailable:()=>true,...(nativeBridge?{Plugins:{PushNotifications:plugin}}:{registerPlugin:()=>plugin})},api,config:{ios:true},storage:{getItem:()=>stored,setItem:(k,v)=>{stored=v;}},emit(){},timeoutMs:50});
 return {controller,calls,listeners,setPermission:p=>permission=p};
}
test('startup never prompts; user opt-in registers after permission; off removes server token',async()=>{const x=setup();await x.controller.sync();assert.deepEqual(x.calls,[]);assert.equal(await x.controller.enable(),'on');assert.equal(x.calls[0],'permission');assert.equal(x.calls[2].p_action,'register');await x.controller.disable();assert.equal(x.calls.at(-2).p_action,'remove');assert.equal(x.calls.at(-1),'unregister');});
test('native injected plugin works without loading the Capacitor JavaScript SDK',async()=>{const x=setup({nativeBridge:true});await x.controller.sync();assert.equal(x.controller.state,'off');assert.equal(await x.controller.enable(),'on');assert.equal(x.calls[2].p_action,'register');await x.controller.disable();assert.equal(x.controller.state,'off');});
test('denied permission never registers; failed server save never claims notifications are on',async()=>{const denied=setup({permission:'denied'});assert.equal(await denied.controller.enable(),'denied');assert.deepEqual(denied.calls,[]);const bad=setup({saveFails:true});assert.equal(await bad.controller.enable(),'error');});
test('revoked OS permission removes stored server delivery token',async()=>{const x=setup();await x.controller.enable();x.setPermission('denied');await x.controller.sync();assert.equal(x.calls.at(-1).p_action,'remove');});
test('worker rejects unauthorized and unconfigured requests before touching database',async()=>{let calls=0;const h=createHandler({MESSAGE_PUSH_WORKER_SECRET:'secret'},{fetcher:async()=>{calls++;throw Error();},providers:{platforms:[]}});assert.equal((await h(new Request('https://test',{method:'POST'}))).status,401);assert.equal((await h(new Request('https://test',{method:'POST',headers:{'x-push-secret':'secret'}}))).status,503);assert.equal(calls,0);});
test('worker uses leases, retries provider exceptions, never returns tokens',async()=>{const finishes=[];const h=createHandler({MESSAGE_PUSH_WORKER_SECRET:'secret',SUPABASE_URL:'https://db',SUPABASE_SERVICE_ROLE_KEY:'server'},{providers:{platforms:['ios'],async send(){throw Error('network');}},fetcher:async(url,opts)=>{if(url.endsWith('claim'))return Response.json([{id:1,lease:id,token:'secret-device'}]);finishes.push(JSON.parse(opts.body));return new Response(null,{status:204});}});const r=await h(new Request('https://test',{method:'POST',headers:{'x-push-secret':'secret'}}));assert.equal(r.status,200);assert.equal(finishes[0].p_result,'retry');assert.equal(finishes[0].p_lease,id);assert.ok(!(await r.text()).includes('secret-device'));});
test('APNs payload is private, sandbox-aware, signed and invalid tokens are removed',async()=>{const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const key=Buffer.from(await crypto.subtle.exportKey('pkcs8',keys.privateKey)).toString('base64');let sent;const provider=createProviders({APNS_PRIVATE_KEY:key,APNS_KEY_ID:'test',APNS_TEAM_ID:'team'},{fetcher:async(url,opts)=>{sent={url,...opts};return Response.json({reason:'Unregistered'},{status:410});}});assert.equal(await provider.send({platform:'ios',locale:'ja',environment:'development',token:'a'.repeat(64),room_id:id,message_id:id}),'invalid');assert.ok(sent.url.includes('sandbox'));const payload=JSON.parse(sent.body);assert.equal(payload.aps.alert.body,'新しいメッセージが届きました');assert.deepEqual(Object.keys(payload).sort(),['aps','message_id','room_id','type']);const parts=sent.headers.authorization.slice(7).split('.');assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},keys.publicKey,Buffer.from(parts[2],'base64url'),new TextEncoder().encode(parts.slice(0,2).join('.'))),true);});

test('conversation entry waits for startup sync and requests the OS permission only once',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);const x=setup({permissionGate:gate,promptResult:'denied'});
 const sync=x.controller.sync();const enter=x.controller.enter();release();await sync;
 assert.equal(await enter,'denied');assert.equal(await x.controller.enter(),'denied');assert.equal(x.calls.filter(c=>c==='permission').length,1);
});
test('existing OS denial gets one settings hint and explicit app opt-out stays off',async()=>{
 const x=setup({permission:'denied'});assert.equal(await x.controller.enter(),'settings');assert.equal(await x.controller.enter(),'denied');assert.deepEqual(x.calls,[]);
 const off=setup({permission:'granted',storedRecord:{enabled:false}});assert.equal(await off.controller.enter(),'off');assert.deepEqual(off.calls,[]);assert.equal(await off.controller.enable(),'on');
});
test('allowed permission registers on entry; no prompt after leaving the conversation',async()=>{
 const x=setup({permission:'granted'});assert.equal(await x.controller.enter(),'on');assert.ok(!x.calls.includes('permission'));
 let release;const gate=new Promise(resolve=>release=resolve);let active=true;const gone=setup({permissionGate:gate});const enter=gone.controller.enter('ko',()=>active);active=false;release();await enter;assert.deepEqual(gone.calls,[]);
});
test('dismissed OS prompt and prior settings notice persist across controllers',async()=>{
 const x=setup({storedRecord:{asked:true}});await x.controller.enter();assert.deepEqual(x.calls,[]);
 const denied=setup({permission:'denied',storedRecord:{settingsNoticeShown:true}});assert.equal(await denied.controller.enter(),'denied');
});

test('granting OS permission in settings registers on return without prompting again',async()=>{const x=setup({permission:'denied'});assert.equal(await x.controller.enter(),'settings');x.setPermission('granted');assert.equal(await x.controller.sync(),'on');assert.ok(!x.calls.includes('permission'));});
