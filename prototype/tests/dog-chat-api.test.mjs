import test from 'node:test';
import assert from 'node:assert/strict';
import {createDogChatAPI,DogChatError} from '../src/dog-chat-api.js';
import {dogChatConfig} from '../src/dog-chat-config.js';
import {SESSION_KEY} from '../src/community-api.js';

const lessonKey='ja-ko:korean:3-1',requestId='11111111-1111-4111-8111-111111111111';
const answers=['저는 학생이에요.','서울에 살아요.','커피를 좋아해요.'];
const input=()=>({lessonKey,requestId,answers:[...answers],consent:true});
const config={enabled:true,serverURL:'https://example.invalid/functions/v1/dog-chat',authURL:'https://example.invalid',key:'public-key'};
const auth={ensureDeviceSession:async()=>({access_token:'current-token'})};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const success=()=>({requestId,remaining:2,feedback:{praise:{quote:answers[0],explanation:'自分のことを伝えられました。'},correction:null}});
const make=options=>createDogChatAPI({config,auth,fetcher:async()=>response(success()),...options});
const hasCode=code=>error=>error instanceof DogChatError&&error.code===code&&error.message===code;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function storage(initial){const map=new Map(initial?[[SESSION_KEY,JSON.stringify(initial)]]:[]);return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key),map};}
const session=(token='old',expired=false)=>({access_token:token,refresh_token:'refresh',expires_at:Math.floor(Date.now()/1000)+(expired?-1:3600),user:{id:requestId}});

test('default configuration stays off and cannot create auth, fetch or storage side effects',async()=>{
 assert.equal(dogChatConfig.enabled,false);let effects=0;
 const store={getItem(){effects++;},setItem(){effects++;},removeItem(){effects++;}};
 const api=createDogChatAPI({storage:store,auth:{ensureDeviceSession(){effects++;}},fetcher(){effects++;}});
 assert.equal(effects,0);await assert.rejects(api.availability(lessonKey),hasCode('unavailable'));await assert.rejects(api.submit(input()),hasCode('unavailable'));assert.equal(effects,0);
});

test('enabled construction is inert until the learner explicitly starts',async()=>{
 let effects=0;make({auth:{ensureDeviceSession(){effects++;}},fetcher(){effects++;}});await Promise.resolve();assert.equal(effects,0);
});

test('availability is authenticated, does not transmit answers, and trusts only bounded fields',async()=>{
 let seen;const api=make({fetcher:async(url,options)=>{seen={url,options};return response({available:true,remaining:3,providerDebug:'private'});}});
 assert.deepEqual(await api.availability(lessonKey),{available:true,remaining:3});
 assert.equal(new URL(seen.url).searchParams.get('lessonKey'),lessonKey);assert.equal(seen.options.method,'GET');assert.equal(seen.options.body,undefined);
 assert.equal(seen.options.headers.Authorization,'Bearer current-token');assert.equal(seen.options.headers.apikey,'public-key');assert.equal(seen.options.cache,'no-store');assert.equal(seen.options.credentials,'omit');assert.equal(seen.options.redirect,'error');
});

test('availability preserves safe reasons and maps unknown reasons without exposing them',async()=>{
 for(const [reason,expected] of [['daily_limit','daily_limit'],['OpenAI sk-private','unavailable']]){
  const api=make({fetcher:async()=>response({available:false,remaining:0,reason})});assert.deepEqual(await api.availability(lessonKey),{available:false,remaining:0,reason:expected});
 }
});

test('submit sends only the three answers, consent and stable identifiers',async()=>{
 let seen;const api=make({fetcher:async(url,options)=>{seen={url,options};return response({...success(),provider:{secret:'never-return'}});}});
 assert.deepEqual(await api.submit({...input(),analyticsId:'must-not-send',extra:'discard'}),success());
 assert.deepEqual(JSON.parse(seen.options.body),input());assert.equal(seen.options.method,'POST');assert.equal(seen.url,config.serverURL);
});

test('missing consent, malformed identifiers and oversized/empty input stop before auth',async()=>{
 let calls=0;const api=make({auth:{ensureDeviceSession(){calls++;}},fetcher(){calls++;}});
 for(const change of [{consent:false},{consent:undefined},{requestId:'not-uuid'},{answers:['one','two']},{answers:Array(3)},{answers:[...answers,'four']},{answers:[' ',...answers.slice(1)]},{answers:['가'.repeat(161),...answers.slice(1)]},{answers:['<b>안녕</b>',...answers.slice(1)]},{answers:[null,...answers.slice(1)]}])await assert.rejects(api.submit({...input(),...change}),hasCode('invalid_request'));
 await assert.rejects(api.submit({...input(),lessonKey:'ja-ko:korean:unseen'}),hasCode('unsupported_lesson'));
 await assert.rejects(api.availability('unknown'),hasCode('unsupported_lesson'));assert.equal(calls,0);
});

test('160 Unicode code points are allowed and whitespace is normalized before transmission',async()=>{
 const long='あ'.repeat(160),api=make({fetcher:async(_url,options)=>{const sent=JSON.parse(options.body);assert.equal(sent.answers[0],long);return response({...success(),feedback:{praise:{quote:long,explanation:'伝わりました。'},correction:null}});}});
 await api.submit({...input(),answers:[` ${long} `,...answers.slice(1)]});
});

test('duplicate in-flight sends share one promise and reject conflicting payloads',async()=>{
 const pending=deferred();let calls=0,authenticated=0;
 const api=make({auth:{ensureDeviceSession:async()=>{authenticated++;return {access_token:'a'};}},fetcher:async()=>{calls++;await pending.promise;return response(success());}});
 const first=api.submit(input()),again=api.submit(input());assert.equal(first,again);
 await assert.rejects(api.submit({...input(),answers:['changed',...answers.slice(1)]}),hasCode('request_conflict'));
 pending.resolve();assert.deepEqual(await first,success());assert.equal(calls,1);assert.equal(authenticated,1);
});

test('manual retry retains its ID and never schedules automatic provider retries',async()=>{
 const ids=[];const api=make({fetcher:async(_url,options)=>{ids.push(JSON.parse(options.body).requestId);if(ids.length===1)throw TypeError('network private detail');return response(success());}});
 await assert.rejects(api.submit(input()),hasCode('offline'));await new Promise(resolve=>setTimeout(resolve,5));assert.equal(ids.length,1);
 assert.deepEqual(await api.submit(input()),success());assert.deepEqual(ids,[requestId,requestId]);
});

test('server limits, in-progress, expired and credit errors retain only safe details',async()=>{
 for(const code of ['daily_limit','capacity_limit','in_progress','request_conflict','request_expired','credit_unavailable','timeout','feedback_unavailable']){
  let calls=0;const api=make({fetcher:async()=>{calls++;return response({error:code,remaining:0,retryAfter:10,message:'private-provider-message',apiKey:'secret'},429);}});
  await assert.rejects(api.submit(input()),error=>{assert.ok(hasCode(code)(error));assert.equal(error.remaining,0);assert.equal(error.retryAfter,10);assert.equal(error.apiKey,undefined);assert.equal(error.cause,undefined);assert.ok(!JSON.stringify(error).includes('private'));return true;});assert.equal(calls,1);
 }
});

test('unknown server and authentication errors never reveal their messages',async()=>{
 const bad=make({fetcher:async()=>response({error:'secret provider diagnostic',message:'sk-provider-key'},500)});
 await assert.rejects(bad.submit(input()),hasCode('feedback_unavailable'));
 const denied=make({auth:{ensureDeviceSession:async()=>{throw Object.assign(Error('private'),{status:401});}}});await assert.rejects(denied.submit(input()),hasCode('unauthorized'));
 const missing=make({auth:{ensureDeviceSession:async()=>({})}});await assert.rejects(missing.submit(input()),hasCode('unauthorized'));
});

test('timeout includes authentication and prevents a late auth resolution from posting',async()=>{
 const pending=deferred();let calls=0;
 const api=make({timeoutMs:5,auth:{ensureDeviceSession:()=>pending.promise},fetcher:async()=>{calls++;return response(success());}});
 await assert.rejects(api.submit(input()),hasCode('timeout'));pending.resolve({access_token:'late'});await new Promise(resolve=>setTimeout(resolve,5));assert.equal(calls,0);
});

test('timeout aborts a pending fetch and allows an explicit same-ID retry',async()=>{
 let calls=0,signal;
 const api=make({timeoutMs:5,fetcher:async(_url,options)=>{calls++;signal=options.signal;if(calls===1)return new Promise(()=>{});return response(success());}});
 await assert.rejects(api.submit(input()),hasCode('timeout'));assert.equal(signal.aborted,true);assert.equal(calls,1);assert.deepEqual(await api.submit(input()),success());
});

test('external cancellation before start has no side effects, and cancellation during fetch is typed',async()=>{
 let calls=0,seen;const controller=new AbortController();controller.abort();
 const api=make({auth:{ensureDeviceSession:async()=>{calls++;return {access_token:'a'};}},fetcher:async(_url,options)=>{calls++;seen=options.signal;return new Promise(()=>{});}});
 await assert.rejects(api.submit(input(),{signal:controller.signal}),hasCode('aborted'));assert.equal(calls,0);
 const running=new AbortController(),promise=api.submit(input(),{signal:running.signal});await new Promise(resolve=>setTimeout(resolve,1));running.abort();await assert.rejects(promise,hasCode('aborted'));assert.equal(seen.aborted,true);
});

test('feedback rejects mismatched IDs, invented quotations, HTML and unbounded strings',async()=>{
 const invalid=[
  {...success(),requestId:'22222222-2222-4222-8222-222222222222'},
  {...success(),remaining:4},
  {...success(),feedback:{praise:{quote:'학생',explanation:'good'},correction:null}},
  {...success(),feedback:{praise:{quote:answers[0],explanation:'<img src=x onerror=alert(1)>'},correction:null}},
  {...success(),feedback:{praise:{quote:answers[0],explanation:'x'.repeat(161)},correction:null}},
  {...success(),feedback:{praise:null,correction:{original:'invented',suggestion:'other',explanation:'wrong'}}},
  {...success(),feedback:{praise:null,correction:{original:answers[0],suggestion:answers[0],explanation:'unneeded'}}},
  {...success(),feedback:{praise:null}},
 ];
 for(const data of invalid)await assert.rejects(make({fetcher:async()=>response(data)}).submit(input()),hasCode('feedback_unavailable'));
});

test('optional correction is copied as plain bounded data without synthesizing one',async()=>{
 const data={...success(),feedback:{praise:null,correction:{original:answers[0],suggestion:'저는 선생님이에요.',explanation:'「先生」は 선생님 といいます。',html:'discard'}}};
 const result=await make({fetcher:async()=>response(data)}).submit(input());assert.equal(result.feedback.praise,null);assert.deepEqual(Object.keys(result.feedback.correction),['original','suggestion','explanation']);
 assert.equal((await make().submit(input())).feedback.correction,null);
});

test('malformed or overlarge JSON and unexpected availability fields fail closed',async()=>{
 for(const raw of ['not json','x'.repeat(12001)])await assert.rejects(make({fetcher:async()=>new Response(raw)}).submit(input()),hasCode('feedback_unavailable'));
 for(const data of [{available:true,remaining:-1},{available:'true',remaining:3},{available:true,remaining:3.5}])await assert.rejects(make({fetcher:async()=>response(data)}).availability(lessonKey),hasCode('feedback_unavailable'));
});

test('default auth reuses and refreshes the shared device account without storing transcripts',async()=>{
 const store=storage(session('expired',true)),calls=[];
 const api=createDogChatAPI({config,storage:store,fetcher:async(url,options)=>{
  calls.push({url,options});if(url.includes('/auth/v1/token?'))return response(session('fresh'));return response(options.method==='GET'?{available:true,remaining:3}:success());
 }});
 await api.availability(lessonKey);await api.submit(input());
 assert.equal(calls.filter(call=>call.url.includes('/token?')).length,1);assert.equal(calls.some(call=>call.url.includes('/signup')),false);
 assert.ok(calls.filter(call=>call.url.includes('/functions/')).every(call=>call.options.headers.Authorization==='Bearer fresh'));
 assert.deepEqual([...store.map.keys()],[SESSION_KEY]);assert.ok(![...store.map.values()].join('').includes(answers[0]));
});

test('default auth observes a token refreshed elsewhere after the panel was created',async()=>{
 const store=storage(session('before')),tokens=[];
 const api=createDogChatAPI({config,storage:store,fetcher:async(_url,options)=>{tokens.push(options.headers.Authorization);return response({available:true,remaining:3});}});
 await api.availability(lessonKey);store.setItem(SESSION_KEY,JSON.stringify(session('after')));await api.availability(lessonKey);assert.deepEqual(tokens,['Bearer before','Bearer after']);
});

test('auth signup is single-flight for concurrent optional requests',async()=>{
 const store=storage();let signups=0;const pending=deferred();
 const api=createDogChatAPI({config,storage:store,fetcher:async(url,options)=>{
  if(url.includes('/signup')){signups++;await pending.promise;return response(session('new'));}
  return response(options.method==='GET'?{available:true,remaining:3}:success());
 }});
 const first=api.availability(lessonKey),second=api.submit(input());await new Promise(resolve=>setTimeout(resolve,2));pending.resolve();await Promise.all([first,second]);assert.equal(signups,1);
});

test('invalid or insecure configured endpoints are refused before auth',async()=>{
 let calls=0;for(const serverURL of ['http://example.invalid','https://user:password@example.invalid','https://example.invalid?key=x','not a URL']){
  const api=make({config:{...config,serverURL},auth:{ensureDeviceSession(){calls++;}}});await assert.rejects(api.availability(lessonKey),hasCode('unavailable'));
 }assert.equal(calls,0);
});
