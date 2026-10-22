import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoCache} from '../src/community-photo-cache.js';
test('photo cache coalesces concurrent requests and retries failures',async()=>{
 const cache=createPhotoCache();let calls=0;const load=async()=>{calls++;return new Blob(['jpeg']);};
 const values=await Promise.all([cache.get('a',load),cache.get('a',load)]);assert.equal(calls,1);assert.equal(values[0],values[1]);await cache.get('a',load);assert.equal(calls,1);
 await assert.rejects(cache.get('bad',()=>{throw Error('offline');}));await cache.get('bad',load);assert.equal(calls,2);
});
test('cache expires and evicts least recently used blobs by size and count',async()=>{
 let now=0,calls=0;const cache=createPhotoCache({now:()=>now,ttl:10,maxBytes:8,maxEntries:2}),load=async()=>{calls++;return new Blob(['1234']);};
 await cache.get('a',load);await cache.get('b',load);await cache.get('a',load);await cache.get('c',load);await cache.get('b',load);assert.equal(calls,4);
 now=11;await cache.get('b',load);assert.equal(calls,5);
 const large=async()=>{calls++;return new Blob(['123456789']);};await cache.get('large',large);await cache.get('large',large);assert.equal(calls,7);
});
test('clear discards in-flight results without deleting a newer request',async()=>{
 const cache=createPhotoCache();let finish;const old=cache.get('a',()=>new Promise(r=>finish=r));await Promise.resolve();cache.clear();
 const next=await cache.get('a',async()=>new Blob(['new']));finish(new Blob(['old']));await assert.rejects(old,/photo_load/);assert.equal(await cache.get('a',()=>{throw Error('unexpected');}),next);
});
test('dropping one photo preserves other cached blobs and rejects a stale in-flight result',async()=>{
 const cache=createPhotoCache();const kept=await cache.get('kept',()=>new Blob(['keep']));let finish;
 const pending=cache.get('removed',()=>new Promise(r=>finish=r));await Promise.resolve();cache.drop('removed');finish(new Blob(['old']));await assert.rejects(pending,/photo_load/);
 assert.equal(await cache.get('kept',()=>{throw Error('unexpected');}),kept);
});
