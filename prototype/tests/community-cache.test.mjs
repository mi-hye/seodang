import test from 'node:test';import assert from 'node:assert/strict';
import {readCommunityCache,saveCommunityCache,clearCommunityCache} from '../src/community-cache.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const post={id:'p',body:'안녕하세요',profile:{nickname:'친구'},created_at:'2026-10-19T00:00:00Z'};
test('cached feed is scoped to the signed in device account',()=>{const s=storage();saveCommunityCache('a',{id:'a'},[post],s);assert.equal(readCommunityCache('a',s).posts[0].body,'안녕하세요');assert.equal(readCommunityCache('b',s),null);assert.equal(readCommunityCache(null,s),null);clearCommunityCache(s);assert.equal(readCommunityCache('a',s),null);});
test('invalid dates in cached content are ignored without breaking rendering',()=>{const s=storage();saveCommunityCache('a',{id:'a'},[{...post,created_at:'invalid'}],s);assert.equal(readCommunityCache('a',s),null);});
