import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityAPI,SESSION_KEY,validText,uuid} from '../src/community-api.js';
const user='11111111-1111-4111-8111-111111111111',config={url:'https://example.invalid',key:'public-test-key'};
function storage(session){const map=new Map(session?[[SESSION_KEY,JSON.stringify(session)]]:[]);return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const session=(expired=false)=>({user:{id:user},access_token:'access',refresh_token:'refresh',expires_at:Math.floor(Date.now()/1000)+(expired?-10:3600)});
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('refresh token is shared across concurrent reads',async()=>{
 const calls=[];const api=createCommunityAPI({config,storage:storage(session(true)),fetcher:async(url,opts)=>{calls.push({url,opts});return url.includes('/token?')?response(session()):response([]);}});
 await Promise.all([api.feed(),api.rooms()]);assert.equal(calls.filter(c=>c.url.includes('/token?')).length,1);assert.ok(calls.filter(c=>c.url.includes('/rest/')).every(c=>c.opts.headers.Authorization==='Bearer access'));
});
test('failed refresh clears expired session but transient network failure does not',async()=>{
 const s=storage(session(true)),api=createCommunityAPI({config,storage:s,fetcher:async()=>response({message:'expired'},400)});await assert.rejects(api.feed());assert.equal(api.session,null);assert.equal(s.getItem(SESSION_KEY),null);
 const api2=createCommunityAPI({config,storage:storage(session(true)),fetcher:async()=>{throw TypeError('offline');}});await assert.rejects(api2.feed());assert.ok(api2.session);
});
test('device session is created once and reused without credentials',async()=>{
 let created=0;const s=storage(),api=createCommunityAPI({config,storage:s,fetcher:async(url,opts)=>{assert.ok(url.endsWith('/auth/v1/signup'));assert.deepEqual(JSON.parse(opts.body),{});created++;return response(session());}});
 await Promise.all([api.ensureDeviceSession(),api.ensureDeviceSession()]);await api.ensureDeviceSession();assert.equal(created,1);assert.ok(s.getItem(SESSION_KEY));
});
test('offline device authentication does not create a replacement for a saved account',async()=>{
 const s=storage(session(true)),api=createCommunityAPI({config,storage:s,fetcher:async()=>{throw TypeError('offline');}});await assert.rejects(api.ensureDeviceSession());assert.ok(s.getItem(SESSION_KEY));
});
test('profile updates never send an owner identifier',async()=>{
 const calls=[],api=createCommunityAPI({config,storage:storage(session()),fetcher:async(url,opts)=>{calls.push(opts);return response([{id:user,nickname:'test'}]);}});await api.saveProfile({nickname:'test'});assert.equal(calls[1].method,'PATCH');assert.equal(JSON.parse(calls[1].body).id,undefined);
});
test('retry after uncertain write result reuses an existing message without duplicating',async()=>{
 const calls=[],api=createCommunityAPI({config,storage:storage(session()),fetcher:async(url,opts)=>{calls.push(opts);return response([{id:user,body:'hello'}]);}});const result=await api.message({id:user,room_id:user,body:'hello'});assert.equal(result.body,'hello');assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');
});
test('empty acceptance result is an error, never success',async()=>{
 const api=createCommunityAPI({config,storage:storage(session()),fetcher:async()=>response([])});await assert.rejects(api.respond(user,'accepted'),/room_changed/);
});
test('malformed IDs cannot inject REST filters',()=>{
 assert.throws(()=>uuid('x&select=*'));assert.equal(uuid(user),user);assert.equal(validText(' ',600),false);assert.equal(validText('日'.repeat(601),600),false);assert.equal(validText('こんにちは',600),true);
});
test('a failed account deletion preserves the session',async()=>{
 const api=createCommunityAPI({config,storage:storage(session()),fetcher:async()=>response({error:'unavailable'},503)});await assert.rejects(api.deleteAccount());assert.ok(api.session);
});

test('invalid stored session can recover instead of trapping the user',async()=>{const api=createCommunityAPI({config,storage:storage({user:{id:'invalid'}}),fetcher:async()=>response(session())});await api.ensureDeviceSession();assert.equal(api.session.user.id,user);});
test('storage failure prevents creating an unrecoverable anonymous account',async()=>{let called=false;const api=createCommunityAPI({config,storage:{getItem:()=>null,setItem:()=>{throw Error('blocked');},removeItem:()=>{}},fetcher:async()=>{called=true;return response(session());}});await assert.rejects(api.ensureDeviceSession(),/device_storage_unavailable/);assert.equal(called,false);});
test('photo retries use immutable paths and deduplicate an already published post',async()=>{
 const calls=[],photo={id:'22222222-2222-4222-8222-222222222222',blob:new Blob(['jpeg'],{type:'image/jpeg'})};let stored=[];
 const api=createCommunityAPI({config,storage:storage(session()),fetcher:async(url,opts)=>{calls.push({url,opts});if(url.includes('/storage/'))return response({Key:'saved'});if(opts.method==='POST')stored=[JSON.parse(opts.body)];return response(stored);}});
 const body={id:user,body:'photo',language:'ko',wants_correction:false};await api.publishPhotos(body,[photo]);await api.publishPhotos(body,[photo]);assert.equal(calls.filter(x=>x.url.includes('/storage/')&&x.opts.method==='POST').length,1);assert.equal(stored[0].image_paths[0],`${user}/${user}-${photo.id}.jpg`);assert.equal(calls.find(x=>x.url.includes('/storage/')).opts.body,photo.blob);
});
test('photo cap is enforced before network calls',async()=>{let calls=0;const api=createCommunityAPI({config,storage:storage(session()),fetcher:async()=>{calls++;return response([]);}});await assert.rejects(api.publishPhotos({id:user},[{},{},{}]),/photo_limit/);assert.equal(calls,0);});
test('private photo downloads use authentication and bypass stale browser caches',async()=>{
 let request;const api=createCommunityAPI({config,storage:storage(session()),fetcher:async(url,opts)=>{request={url,opts};return new Response('jpeg');}});await api.downloadPhoto(`${user}/${user}-${user}.jpg`);assert.equal(request.opts.headers.Authorization,'Bearer access');assert.equal(request.opts.cache,'no-store');assert.ok(!request.url.includes('?v='));await assert.rejects(api.downloadPhoto('../../other'),/invalid_photo_path/);
});
test('private photo cache is reused and cleared by blocks, removal and account deletion',async()=>{
 let downloads=0;const api=createCommunityAPI({config,storage:storage(session()),fetcher:async(url,opts)=>{
  if(url.includes('/object/authenticated/')){downloads++;return new Response('jpeg');}
  return response([{}]);
 }}),path=`${user}/${user}-${user}.jpg`;
 await Promise.all([api.downloadPhoto(path),api.downloadPhoto(path)]);await api.downloadPhoto(path);assert.equal(downloads,1);
 await api.block(user);await api.downloadPhoto(path);assert.equal(downloads,2);
 await api.removePhotos([path]);await api.downloadPhoto(path);assert.equal(downloads,3);
 await api.deleteAccount();await assert.rejects(api.downloadPhoto(path),/device_session_required/);assert.equal(downloads,3);
});
