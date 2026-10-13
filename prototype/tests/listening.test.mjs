import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {freshLabels} from '../src/labels-state.js';
import {listeningOrder} from '../src/listening-state.js';
import {load,valid} from '../src/storage.js';
test('level one listening gates entry, saves answers, keeps level two intact and counts completion once',()=>{
 let s=reduce(freshState(),{type:'listening-start'});assert.equal(s.listening.started,false);
 s.labels={...freshLabels(),completed:true};s.onboardingLevel=1;const episode=structuredClone(s.episode);
 s=reduce(s,{type:'listening-start'});s=reduce(s,{type:'listening-answer',id:'wrong'});assert.equal(s.listening.index,0);
 for(const id of listeningOrder){s=reduce(s,{type:'listening-answer',id});assert.ok(valid(s));assert.deepEqual(load({getItem:()=>JSON.stringify(s)}).state.listening,s.listening);}
 assert.equal(s.onboardingLevel,1);assert.deepEqual(s.episode,episode);assert.equal(s.listening.completed,true);assert.equal(s.history.completed.filter(x=>x==='listening').length,1);
 s=reduce(s,{type:'listening-start'});assert.equal(s.listening.index,0);assert.equal(s.listening.completed,true);
 for(const id of listeningOrder)s=reduce(s,{type:'listening-answer',id});assert.equal(s.history.completed.filter(x=>x==='listening').length,1);
 // Later explicit difficulty selection is preserved, rather than migrated again.
 s=reduce(s,{type:'level',value:2});assert.equal(load({getItem:()=>JSON.stringify(s)}).state.onboardingLevel,2);
});
