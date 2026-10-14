import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freshState,reduce} from '../src/engine.js';
import {valid,load,save,STORAGE_KEY} from '../src/storage.js';
import {sentenceProgress,validSentence} from '../src/sentence-state.js';
import {sentences,sentenceAudio} from '../src/sentence-content.js';
import {renderLearningMap} from '../src/learning-map.js';

test('level 3 requires correct sentence order and both color/location clues, preserves other courses',()=>{
  let state=freshState();state.onboardingLevel=3;
  const oldEpisode=structuredClone(state.episode);
  const go=(type,id)=>{state=reduce(state,{type,id});assert.ok(valid(state));};
  go('sentence-start');go('sentence-next');
  for(let i=0;i<3;i++) {
    assert.equal(state.sentence.index,i);assert.equal(state.sentence.phase,'learn');
    go('sentence-next');go('sentence-next');assert.equal(state.sentence.phase,'arrange');
    go('sentence-check');assert.equal(state.sentence.checked,false);
    for(const n of sentences[i].order)go('sentence-token',String(n));
    go('sentence-check');assert.equal(state.sentence.checked,false);assert.ok(state.sentence.feedback);
    go('sentence-clear');
    for(let n=0;n<sentences[i].parts.length;n++)go('sentence-token',String(n));
    go('sentence-check');assert.equal(state.sentence.checked,true);go('sentence-next');
  }
  assert.equal(state.sentence.phase,'solve');assert.deepEqual(state.sentence.learned,[0,1,2]);
  go('sentence-submit');assert.equal(state.sentence.completed,false);
  for(const id of ['window-red','door-blue']){go('sentence-select',id);go('sentence-submit');assert.equal(state.sentence.phase,'solve');assert.ok(state.sentence.feedback);}
  go('sentence-select','window-blue');go('sentence-submit');assert.equal(state.sentence.phase,'summary');assert.equal(state.sentence.completed,true);
  const done=structuredClone(state);go('sentence-submit');assert.deepEqual(state,done);
  go('sentence-restart');assert.equal(state.sentence.phase,'intro');assert.equal(state.sentence.completed,true);assert.deepEqual(state.sentence.learned,[0,1,2]);
  assert.deepEqual(state.episode,oldEpisode);assert.deepEqual(state.encountered,[]);
});

test('old records, mid-sentence restore, previous and difficulty switches retain progress',()=>{
 let s=freshState();assert.ok(valid(s));assert.equal(sentenceProgress(s).phase,'intro');
 s=reduce(s,{type:'sentence-start'});s=reduce(s,{type:'sentence-next'});s=reduce(s,{type:'sentence-next'});s=reduce(s,{type:'sentence-token',id:'0'});
 const storage={getItem:()=>storage.raw,setItem:(key,value)=>{assert.equal(key,STORAGE_KEY);storage.raw=value;}};
 assert.equal(save(storage,s),'');s=load(storage).state;assert.deepEqual(s.sentence.tokens,[0]);
 const progress=structuredClone(s.sentence);s=reduce(s,{type:'level',value:1});s=reduce(s,{type:'level',value:3});assert.deepEqual(s.sentence,progress);
 s=reduce(s,{type:'sentence-previous'});assert.equal(s.sentence.phase,'learn');assert.deepEqual(s.sentence.tokens,[]);
 s=reduce(s,{type:'sentence-previous'});assert.equal(s.sentence.phase,'intro');
 assert.equal(validSentence({...s.sentence,tokens:[20]}),false);assert.equal(valid({...s,sentence:{...s.sentence,index:8}}),false);
});

test('all new speech uses bundled Nemo female 1 WAVs with matching source and hash',()=>{
 const meta=JSON.parse(readFileSync(new URL('../assets/audio/sentences/manifest.json',import.meta.url)));
 assert.equal(meta.styleId,10005);
 for(const entry of Object.values(sentenceAudio)) {
   const info=meta.files[entry.id];assert.equal(entry.text,info.text);assert.equal(entry.status,'ready');
   const file=readFileSync(new URL('../'+entry.audioFile,import.meta.url));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(createHash('sha256').update(file).digest('hex'),info.sha256);assert.ok(info.duration>1);
 }
});

test('level 3 map offers the implemented case and locks only future cases',()=>{
 const s=freshState();s.onboardingLevel=3;const html=renderLearningMap(s);
 assert.ok(html.includes('가방 주인을 찾아요'));assert.equal((html.match(/data-action="sentence"/g)||[]).length,1);assert.equal((html.match(/ disabled/g)||[]).length,2);
});
