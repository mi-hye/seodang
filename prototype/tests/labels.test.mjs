import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {freshKana} from '../src/kana-state.js';
import {labelWords,validLabels} from '../src/labels-state.js';
import {valid,load,save} from '../src/storage.js';
const unlocked=()=>{const s=freshState();s.kana=freshKana();s.kana.lessons.forEach(l=>{l.completed=l.caseSolved=true;l.phase='summary';});return s;};
test('labels require all three current kana lessons',()=>{
 let s=freshState();s=reduce(s,{type:'labels-start'});assert.equal(s.labels.started,false);
 s=unlocked();s.kana.lessons[2].completed=false;s=reduce(s,{type:'labels-start'});assert.equal(s.labels.started,false);
});
test('word building, saved progress, matching and completion',()=>{
 let s=unlocked();const act=(type,extra={})=>{s=reduce(s,{type,...extra});assert.equal(valid(s),true);};
 act('labels-start');act('labels-next');assert.equal(s.labels.phase,'read');
 for(const word of labelWords){
  act('labels-next');act('labels-next');assert.equal(s.labels.phase,'build');
  act('labels-tile',{id:'0'});act('labels-tile',{id:'0'});assert.deepEqual(s.labels.tiles,[null]);act('labels-tile',{id:'0'});act('labels-tile',{id:'1'});act('labels-check');assert.equal(s.labels.checked,false);assert.ok(s.labels.feedback);
  act('labels-tile',{id:'0'});assert.deepEqual(s.labels.tiles,[null,1]);act('labels-remove',{id:'1'});act('labels-tile',{id:'1'});act('labels-tile',{id:'0'});act('labels-check');assert.equal(s.labels.checked,false);assert.equal(s.labels.phase,word.id==='neko'?'match':'read');
  let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};save(storage,s);assert.deepEqual(load(storage).state.labels,s.labels);
  assert.ok(s.labels.learned.includes(word.id));
 }
 assert.equal(Object.values(s.history.days).reduce((n,d)=>n+d.expressions,0),4);
 assert.equal(s.labels.phase,'match');act('labels-next');assert.equal(s.labels.phase,'match');
 act('labels-match',{left:'kasa',right:'hana'});assert.equal(s.labels.matches.length,0);
 for(const {id} of labelWords)act('labels-match',{left:id,right:id});
 act('labels-match',{left:'kasa',right:'kasa'});assert.equal(s.labels.matches.length,4);
 act('labels-next');assert.equal(s.labels.completed,true);assert.ok(s.history.completed.includes('labels'));
 const cases=Object.values(s.history.days).reduce((n,d)=>n+d.cases,0);act('labels-restart');assert.equal(s.labels.phase,'intro');assert.equal(s.labels.completed,true);assert.equal(Object.values(s.history.days).reduce((n,d)=>n+d.cases,0),cases);
 assert.equal(validLabels({...s.labels,tiles:[3]}),false);assert.equal(validLabels({...s.labels,matches:['other']}),false);
});

test('all four picture labels have bundled audio matching the shipped manifest',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');
 const manifest=JSON.parse(readFileSync(new URL('../assets/audio/labels/manifest.json',import.meta.url)));
 for(const w of labelWords){const a=manifest.files[w.id],buffer=readFileSync(new URL('../'+a.file,import.meta.url));assert.equal(a.text,w.text);assert.equal(createHash('sha256').update(buffer).digest('hex'),a.sha256);assert.equal(buffer.toString('ascii',0,4),'RIFF');assert.ok(a.duration>.5);}
});

test('previous correct-answer saves advance with one confirmation; repeated checks do not skip words',()=>{
 let s=unlocked();s=reduce(s,{type:'labels-start'});s.labels={...s.labels,phase:'build',index:3,tiles:[1,0],checked:true};
 assert.ok(valid(s));s=reduce(s,{type:'labels-check'});assert.equal(s.labels.phase,'match');assert.deepEqual(s.labels.learned,['neko']);
 const progress=structuredClone(s.labels);s=reduce(s,{type:'labels-check'});assert.deepEqual(s.labels,progress);
 assert.equal(Object.values(s.history.days).reduce((n,d)=>n+d.expressions,0),1);
});

test('last label match moves to the next lesson atomically and resumes previous complete-match saves',()=>{
 for(const action of [{type:'labels-match',left:'neko',right:'neko'},{type:'labels-start'}]){
  let s=unlocked();s=reduce(s,{type:'labels-start'});s.labels.phase='match';s.labels.matches=action.type==='labels-start'?labelWords.map(w=>w.id):['kasa','kutsu','hana'];
  s=reduce(s,action);assert.equal(s.labels.completed,true);assert.equal(s.onboardingLevel,1);assert.equal(s.episode.started,false);assert.equal(s.listening.started,true);assert.equal(s.episode.step,'intro');assert.ok(valid(s));assert.ok(s.history.completed.includes('labels'));
  const saved=load({getItem:()=>JSON.stringify(s)});assert.equal(saved.blocked,false);assert.equal(saved.state.onboardingLevel,1);
  const legacy=load({getItem:()=>JSON.stringify({...s,listening:undefined,onboardingLevel:2})});assert.equal(legacy.blocked,false);assert.equal(legacy.state.onboardingLevel,1);
 }
});
