import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanupPhotos} from '../../supabase/functions/community-photo-cleanup/worker.mjs';
const response=(value,status=200)=>new Response(JSON.stringify(value),{status});
const jobs=[{path:'owner/photo.jpg',lease_token:'lease-1'},{path:'owner/other.jpg',lease_token:'lease-2'}];
test('storage deletion failures are acknowledged for durable retry without dropping other jobs',async()=>{
 const acknowledged=[];
 const result=await cleanupPhotos({url:'https://example.invalid',service:'server-only',fetcher:async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer server-only');const body=JSON.parse(options.body);
  if(url.endsWith('community_claim_photo_cleanup'))return response(jobs);
  if(url.includes('/storage/'))return body.prefixes[0]===jobs[0].path?response({error:'unavailable'},503):response([]);
  acknowledged.push(body);return response(body.succeeded);
 }});
 assert.deepEqual(result,{claimed:2,deleted:1,retry:1});assert.equal(acknowledged.find(a=>a.photo_path===jobs[0].path).failure,'storage_503');assert.equal(acknowledged[1].token,'lease-2');
});
test('network and acknowledgement failure leave work retryable through expiring leases',async()=>{
 const result=await cleanupPhotos({url:'https://example.invalid',service:'server-only',fetcher:async url=>{
  if(url.endsWith('community_claim_photo_cleanup'))return response(jobs);
  throw Error('network unavailable');
 }});assert.deepEqual(result,{claimed:2,deleted:0,retry:2});
});
test('an already absent object is a successful idempotent deletion',async()=>{
 const result=await cleanupPhotos({url:'https://example.invalid',service:'server-only',fetcher:async(url,options)=>{
  if(url.endsWith('community_claim_photo_cleanup'))return response([jobs[0]]);
  if(url.includes('/storage/'))return response([]);
  assert.equal(JSON.parse(options.body).succeeded,true);return response(true);
 }});assert.equal(result.deleted,1);
});
test('claim failure performs no storage deletion',async()=>{
 let calls=0;await assert.rejects(cleanupPhotos({url:'https://example.invalid',service:'server-only',fetcher:async()=>{calls++;return response({},500);}}));assert.equal(calls,1);
});
