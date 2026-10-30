import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {pronunciationRecords,pronunciationParts,finalPronunciation,vowelOrder,consonantOrder} from '../src/korean-pronunciation-data.js';
import {pronunciationAudio} from '../src/korean-pronunciation.js';
import {pronunciationDiagram} from '../src/korean-pronunciation-diagram.js';
import {koreanContent} from '../src/korean-content.js';
test('all 40 letters have diagrams and audible syllables rather than consonant names',()=>{
 assert.equal(Object.keys(pronunciationRecords).length,40);assert.equal(vowelOrder.length,21);assert.equal(consonantOrder.length,19);
 for(const glyph of vowelOrder+consonantOrder){const r=pronunciationRecords[glyph];assert.ok(r.cue&&r.note);assert.equal(r.sample.length,1);assert.ok(r.sample.charCodeAt(0)>=0xac00);for(let i=0;i<r.poses.length;i++){const svg=pronunciationDiagram(r,i);assert.ok(!svg.includes('undefined'));assert.match(svg,/role="img"/);}const audio=pronunciationAudio(r.sample);assert.equal(audio.status,'ready',r.sample);assert.ok(existsSync(audio.audioFile));}
});
test('curriculum syllables retain initial, vowel and final context including silent versus nasal ieung',()=>{
 for(const [id,items] of Object.entries(koreanContent).filter(([id])=>/^1-(?:[1-9]|10)$/.test(id)))for(const item of items){const parts=pronunciationParts(item.text);if(item.text==='ㅇ'){assert.deepEqual(parts,[]);continue;}assert.ok(parts.length,`${id}: ${item.text}`);for(const p of parts)assert.ok(p.final?finalPronunciation(p.glyph,item.text):pronunciationRecords[p.glyph]);}
 assert.deepEqual(pronunciationParts('아'),[{glyph:'ㅏ',final:false}]);assert.deepEqual(pronunciationParts('앙'),[{glyph:'ㅏ',final:false},{glyph:'ㅇ',final:true}]);assert.deepEqual(pronunciationParts('강'),[{glyph:'ㄱ',final:false},{glyph:'ㅏ',final:false},{glyph:'ㅇ',final:true}]);assert.equal(pronunciationRecords['ㅇ'].poses[0],'silent');assert.equal(finalPronunciation('ㅇ').nasal,true);assert.equal(finalPronunciation('ㄹ').poses[0],'alveolar');assert.equal(finalPronunciation('ㄸ'),null);
});
test('glides have two different visible positions and consonant contrasts preserve place',()=>{
 for(const r of Object.values(pronunciationRecords).filter(r=>r.kind==='glide')){assert.equal(r.poses.length,2);assert.notEqual(pronunciationDiagram(r,0),pronunciationDiagram(r,1));}
 for(const group of ['ㄱㅋㄲ','ㄷㅌㄸ','ㅂㅍㅃ','ㅈㅊㅉ']){const [plain,aspirated,tense]=Array.from(group,g=>pronunciationRecords[g]);assert.deepEqual(plain.poses,aspirated.poses);assert.deepEqual(plain.poses,tense.poses);assert.equal(aspirated.aspirated,true);assert.equal(tense.tense,true);assert.equal(tense.aspirated,false);}
});
