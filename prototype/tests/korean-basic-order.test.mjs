import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {load,valid} from '../src/storage.js';
import {koreanContent} from '../src/korean-content.js';
import {koreanExample,koreanExampleAudio} from '../src/korean-letters.js';
import {koreanAudio} from '../src/korean.js';
import {pronunciationAudio} from '../src/korean-pronunciation.js';
import {pronunciationRecords} from '../src/korean-pronunciation-data.js';
import {koreanLessons} from '../src/korean-state.js';
test('basic consonants use 가나다 order and distinguish names from syllable audio',()=>{
 assert.equal(koreanLessons.filter(l=>l.level===0).length,10);
 assert.equal(koreanContent['1-1'].map(x=>x.text).join(''),'ㅏㅓㅗㅜㅡㅣㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ');
 assert.equal(koreanContent['1-1'].slice(6).map(x=>koreanExample(x).text).join(''),'가나다라마바사아자차카타파하');
 assert.equal(koreanContent['1-2'].slice(6).map(x=>x.text).join(''),'가나다라마바사아자차카타파하');
 assert.equal(koreanContent['1-3'].map(x=>x.text).join(''),'ㅑㅕㅛㅠ');assert.equal(koreanContent['1-4'].map(x=>x.text).join(''),'야여요유');
 for(let index=6;index<20;index++){const item=koreanContent['1-1'][index],s={korean:{active:'1-1',lessons:{'1-1':{index}}}};assert.equal(koreanAudio(s).text,item.spoken);assert.equal(koreanExampleAudio(s).text,koreanExample(item).text);assert.notEqual(koreanAudio(s).audioFile,koreanExampleAudio(s).audioFile);assert.equal(pronunciationAudio(koreanExample(item).text).audioFile,koreanExampleAudio(s).audioFile);}
 assert.equal(pronunciationRecords['ㅁ'].sample,'마');
});
test('old last positions and completion load before the shorter lessons are normalized',()=>{
 for(const id of ['1-1','1-2','1-3','1-4'])for(const completed of [true,false]){
 const last=id==='1-1'||id==='1-2'?9:13,history={version:1,startedOn:'2026-10-20',days:{'2026-10-20':{letters:12,expressions:0,sentences:0,cases:2}}};
 const s={...freshState(),onboarded:true,courseDirection:'ja-ko',onboardingLevel:0,korean:{version:4,active:id,history,lessons:{[id]:{index:last,phase:completed?'done':id==='1-1'||id==='1-3'?'learn':'quiz',selected:completed?null:2,retry:!completed,started:true,completed}}}};
 assert.ok(valid(s));const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.ok(valid(restored.state));const p=restored.state.korean.lessons[id];assert.equal(p.contentVersion,1);assert.equal(p.completed,completed);assert.equal(p.index,completed?koreanContent[id].length-1:0);assert.deepEqual(restored.state.korean.history,history);const again=load({getItem:()=>JSON.stringify(restored.state)});assert.deepEqual(again.state.korean,restored.state.korean);
 }
});
