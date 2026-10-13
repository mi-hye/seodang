import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {kanaLetters,kanaLessons,legacyKanaGroups,legacyKanaLessons,versionSevenLessons,kanaRound,normalizeKana,kanaSolvedCount,selectedLevel} from '../src/kana-state.js';
import {completedCases} from '../src/learning-history.js';
import {valid,load,save} from '../src/storage.js';
import {renderKana,kanaAudio} from '../src/kana.js';
import {renderLearningMap} from '../src/learning-map.js';
const progress=s=>s.kana.lessons[s.kana.active];
function finishLesson(s){
 let guard=0;
 while(progress(s).phase!=='summary'){
  assert.ok(++guard<200);const l=progress(s),lesson=kanaLessons[s.kana.active],round=kanaRound(lesson,l.index);
  if(l.phase==='quiz'){
   assert.deepEqual(reduce(s,{type:'kana-next'}),s);
   s=reduce(s,{type:'kana-match',left:round.letters[0].id,right:round.letters[1].id});assert.equal(progress(s).answered,false);
   for(const letter of round.letters)s=reduce(s,{type:'kana-match',left:letter.id,right:letter.id});
  }
  s=reduce(s,{type:'kana-next'});assert.ok(valid(s));
 }
 return s;
}
test('three lessons contain all 46 letters once in standard order, with row boundaries',()=>{
 assert.deepEqual(kanaLessons.map(l=>l.letters.length),[15,15,16]);
 assert.deepEqual(kanaLessons.flatMap(l=>l.letters),kanaLetters);
 assert.equal(new Set(kanaLessons.flatMap(l=>l.letters.map(x=>x.id))).size,46);
 assert.deepEqual(kanaLessons.map(l=>[l.letters[0].text,l.letters.at(-1).text]),[['あ','そ'],['た','ほ'],['ま','ん']]);
 for(const l of kanaLessons){let n=0;for(const group of l.groups){const r=kanaRound(l,n);assert.deepEqual(r.letters,legacyKanaGroups[group].letters);n=r.end;}assert.equal(n,l.letters.length);}
 let s={...freshState(),onboardingLevel:1};const original=structuredClone(s.episode);
 for(let i=0;i<3;i++){s=finishLesson(reduce(s,{type:'kana-start',lesson:i}));assert.equal(kanaSolvedCount(s.kana),i+1);}
 assert.equal(s.kana.learned.length,46);assert.deepEqual(s.episode,original);
 assert.deepEqual(completedCases(s),['kana-v8-0','kana-v8-1','kana-v8-2']);
 assert.match(renderKana(s,()=>''),/3\/3 学習|3\/3 학습/);
});
test('each row must finish writing then reading before matching; save and reload preserve each phase',()=>{
 let s=reduce(freshState(),{type:'kana-start'});
 assert.equal(kanaAudio(s),null);s=reduce(s,{type:'kana-next'});
 for(const phase of ['learn','reading'])for(const letter of kanaLessons[0].letters.slice(0,5)){
  assert.equal(progress(s).phase,phase);assert.equal(kanaAudio(s).text,letter.text);
  assert.match(renderKana(s,()=>''),phase==='learn'?/canvas/:phase==='reading'?/읽기 연습/:/글자 카드/);
  let raw;save({setItem:(_,v)=>raw=v},s);const restored=load({getItem:()=>raw});assert.equal(restored.blocked,false);assert.deepEqual(restored.state.kana,s.kana);s=restored.state;
  assert.deepEqual(reduce(s,{type:'kana-match',left:letter.id,right:letter.id}),s);
  s=reduce(s,{type:'kana-next'});
 }
 assert.equal(progress(s).phase,'quiz');assert.equal(kanaAudio(s),null);
 for(const letter of kanaLessons[0].letters.slice(0,5)){
  assert.deepEqual(reduce(s,{type:'kana-next'}),s);
  s=reduce(s,{type:'kana-match',left:letter.id,right:letter.id});
  const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.deepEqual(restored.state.kana,s.kana);s=restored.state;
 }
 s=reduce(s,{type:'kana-next'});
 assert.equal(progress(s).phase,'intro');assert.equal(progress(s).index,5);
 assert.deepEqual(s.kana.learned,['a','i','u','e','o']);
});
test('previous stays within its row and reading help returns to matching without advancing completion',()=>{
 let s=reduce(freshState(),{type:'kana-start'});s=reduce(s,{type:'kana-next'});
 assert.deepEqual(reduce(s,{type:'kana-previous'}),s);
 s=reduce(s,{type:'kana-next'});assert.equal(kanaAudio(s).text,'い');s=reduce(s,{type:'kana-previous'});assert.equal(kanaAudio(s).text,'あ');
 for(let i=0;i<10;i++)s=reduce(s,{type:'kana-next'});
 assert.equal(progress(s).phase,'quiz');s=reduce(s,{type:'kana-help'});assert.equal(progress(s).phase,'reading');
 for(let i=0;i<5;i++)s=reduce(s,{type:'kana-next'});
 assert.equal(progress(s).phase,'quiz');assert.equal(progress(s).index,0);assert.equal(kanaSolvedCount(s.kana),0);
});
test('locks, replay, difficulty changes and another lesson progress are preserved',()=>{
 let s=reduce(freshState(),{type:'kana-start'});assert.deepEqual(reduce(s,{type:'kana-start',lesson:2}),s);
 assert.equal((renderLearningMap({...s,onboardingLevel:1}).match(/class="map-choice" disabled/g)||[]).length,4);
 s=finishLesson(s);s=reduce(s,{type:'kana-start',lesson:1});s=reduce(s,{type:'kana-next'});const second=structuredClone(progress(s));
 s=reduce(s,{type:'kana-start',lesson:0});assert.equal(progress(s).phase,'intro');assert.equal(kanaSolvedCount(s.kana),1);
 s=reduce(s,{type:'kana-start',lesson:1});assert.deepEqual(progress(s),second);
 const kana=structuredClone(s.kana);for(const value of [1,2,5,1]){s=reduce(s,{type:'level',value});assert.deepEqual(s.kana,kana);assert.equal(selectedLevel(s),value);assert.ok(valid(s));}
 s=reduce(s,{type:'kana-restart'});assert.equal(progress(s).index,0);assert.equal(progress(s).phase,'intro');assert.deepEqual(completedCases(s),['kana-v8-0']);
});
test('v4-v7 archives and completions survive without marking expanded lessons complete',()=>{
 for(const version of [4,5,6,7]){
  const old={version,active:1,learned:['a','o','i','ki'],lessons:[{started:true,phase:'summary',index:0,answered:false,feedback:'',completed:true,caseSolved:true},{started:true,phase:'learn',index:1,answered:false,feedback:'',completed:false,caseSolved:false},{started:false,phase:'intro',index:0,answered:false,feedback:'',completed:false,caseSolved:false}]};
  const before=structuredClone(old),result=load({getItem:()=>JSON.stringify({...freshState(),kana:old})});
  assert.equal(result.blocked,false);const k=result.state.kana;assert.equal(k.version,8);assert.deepEqual(k.previousCourse,old);assert.deepEqual(k.learned,old.learned);assert.deepEqual(old,before);
  assert.equal(kanaSolvedCount(k),0);assert.equal(k.active,0);assert.ok(valid(result.state));assert.deepEqual(completedCases(result.state),['kana-0']);
  const reloaded=load({getItem:()=>JSON.stringify(result.state)});assert.deepEqual(reloaded.state.kana,k);assert.deepEqual(completedCases(reloaded.state),['kana-0']);
 }
});
test('original and v2/v3 saves remain readable; invalid v8 phase and index do not overwrite data',()=>{
 for(const version of [undefined,2,3]){
  const lesson={started:true,phase:'learn',index:1,answered:false,feedback:'',completed:false,caseSolved:false};
  const old=version?{version,active:0,learned:['a'],lessons:legacyKanaGroups.map((_,i)=>({...lesson,started:i===0,index:i===0?1:0}))}:{...lesson,learned:['a']};
  const r=load({getItem:()=>JSON.stringify({...freshState(),kana:old})});assert.equal(r.blocked,false);assert.equal(r.state.kana.version,8);assert.deepEqual(r.state.kana.previousCourse,old);assert.deepEqual(r.state.kana.learned,['a']);assert.ok(valid(r.state));
 }
 for(const invalid of [{index:99},{phase:'solve'}]){
  const s=reduce(freshState(),{type:'kana-start'});Object.assign(progress(s),invalid);const raw=JSON.stringify(s);let written=false;
  assert.equal(load({getItem:()=>raw,setItem:()=>written=true}).blocked,true);assert.equal(written,false);
 }
});

test('matching rejects wrong, duplicate and out-of-row links and keeps correct links during reading help',()=>{
 let s=reduce(freshState(),{type:'kana-start'});for(let i=0;i<11;i++)s=reduce(s,{type:'kana-next'});
 s=reduce(s,{type:'kana-match',left:'a',right:'i'});assert.deepEqual(progress(s).matches,[]);assert.match(progress(s).feedback,/다른/);
 s=reduce(s,{type:'kana-match',left:'a',right:'a'});assert.deepEqual(progress(s).matches,['a']);
 for(const action of [{left:'a',right:'a'},{left:'ka',right:'ka'},{left:'i',right:'a'}])assert.deepEqual(reduce(s,{type:'kana-match',...action}),s);
 s=reduce(s,{type:'kana-help'});for(let i=0;i<5;i++)s=reduce(s,{type:'kana-next'});assert.deepEqual(progress(s).matches,['a']);assert.equal(progress(s).answered,false);
 s=reduce(s,{type:'kana-quiz-restart'});assert.deepEqual(progress(s).matches,[]);
});
test('sequential quiz saves become a board with already answered pairs connected',()=>{
 const s=reduce(freshState(),{type:'kana-start'});const l=progress(s);delete l.matches;Object.assign(l,{phase:'quiz',index:2,answered:true});
 const r=load({getItem:()=>JSON.stringify(s)});assert.equal(r.blocked,false);assert.deepEqual(progress(r.state).matches,['a','i','u']);assert.equal(progress(r.state).index,0);assert.equal(progress(r.state).answered,false);assert.ok(valid(r.state));
 for(const matches of [['a','a'],['ka'],['a','i','u','e','o']]){const invalid=structuredClone(r.state);progress(invalid).matches=matches;assert.equal(valid(invalid),false);}
});
