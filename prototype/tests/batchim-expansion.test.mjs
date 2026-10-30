import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {batchimExpansion} from '../src/batchim-expansion-content.js';
import {koreanContent} from '../src/korean-content.js';
import {koreanLessons,koreanProgress} from '../src/korean-state.js';
import {koreanLetterChoices,renderKoreanLetters} from '../src/korean-letters.js';
import {pronunciationParts,finalPronunciation} from '../src/korean-pronunciation-data.js';
import {pronunciationAudio} from '../src/korean-pronunciation.js';
import {pronunciationDiagram} from '../src/korean-pronunciation-diagram.js';
import {freshState,reduce} from '../src/engine.js';import {load} from '../src/storage.js';
import {koreanAudio} from '../src/korean.js';
import {prepareContent,practiceUnits} from '../src/practice-content.js';
test('batchim extension preserves original items, course count and word-specific sounds',()=>{
 assert.equal(koreanLessons.filter(l=>l.level===0).length,10);
 for(const id of ['1-9','1-10'])assert.deepEqual(koreanContent[id].slice(0,6).map(x=>x.text),Array.from('산밤강문물밥'));
 assert.deepEqual(batchimExpansion.map(x=>[x.text,x.glyph,x.finalSound]),[['국','ㄱ','ㄱ'],['옷','ㅅ','ㄷ'],['넋','ㄳ','ㄱ'],['앉다','ㄵ','ㄴ'],['닭','ㄺ','ㄱ'],['여덟','ㄼ','ㄹ'],['삶','ㄻ','ㅁ'],['값','ㅄ','ㅂ']]);
 for(const item of batchimExpansion){const parts=pronunciationParts(item.text);assert.deepEqual(parts,[{glyph:item.glyph,final:true}]);const r=finalPronunciation(item.glyph,item.text);assert.equal(r.sample,item.text);assert.match(pronunciationDiagram(r,0),/role="img"/);assert.doesNotMatch(pronunciationDiagram(r,0),/undefined/);assert.equal(pronunciationAudio(item.text).audioFile,item.audio.audioFile);assert.ok(existsSync(item.audio.audioFile));}
 // A bare cluster is never assigned an unconditional sound.
 assert.equal(finalPronunciation('ㄼ'),null);
});
test('new rounds teach before sound choices, retry, resume and complete without extra writing',async()=>{
 await prepareContent('korean');let s={...freshState(),courseDirection:'ja-ko',onboardingLevel:0,onboarded:true,korean:{version:4,active:'1-10',lessons:{'1-10':{index:5,phase:'quiz',selected:1,retry:false,started:true,completed:false}}}};
 s=reduce(s,{type:'korean-check'});assert.equal(koreanProgress(s,'1-10').index,6);
 for(let index=6;index<14;index++){
  const item=koreanContent['1-10'][index];assert.equal(koreanProgress(s,'1-10').phase,'learn');assert.ok(renderKoreanLetters(s,()=> '').includes(item.reading));assert.equal(koreanAudio(s).text,item.text);assert.equal(practiceUnits(s,'korean')[index].audio.audioFile,item.audio.audioFile);
  s=reduce(s,{type:'korean-next'});assert.equal(koreanProgress(s,'1-10').phase,'quiz');assert.doesNotMatch(renderKoreanLetters(s,()=>''),/data-korean-writing|聞こえる音|書く形/);
  const choices=koreanLetterChoices('1-10',index);assert.equal(new Set(choices).size,4);assert.equal(choices[index%4],item.finalSound);assert.ok(choices.every(x=>'ㄱㄴㄷㄹㅁㅂㅇ'.includes(x)));
  s=reduce(s,{type:'korean-select',id:(index+1)%4});s=reduce(s,{type:'korean-check'});assert.equal(koreanProgress(s,'1-10').retry,true);
  const reloaded=load({getItem:()=>JSON.stringify(s)});assert.equal(reloaded.blocked,false);s=reloaded.state;
  s=reduce(s,{type:'korean-select',id:index%4});s=reduce(s,{type:'korean-check'});
 }
 assert.equal(koreanProgress(s,'1-10').phase,'done');
});
test('previously completed six-item batchim lessons stay completed',()=>{
 const p={index:5,phase:'done',selected:null,retry:false,started:true,completed:true};const s={...freshState(),courseDirection:'ja-ko',onboardingLevel:0,korean:{version:4,active:'1-10',lessons:{'1-9':p,'1-10':p}}};const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.deepEqual(restored.state.korean.lessons,s.korean.lessons);
});
