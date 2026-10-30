import test from 'node:test';import assert from 'node:assert/strict';
import {koreanLessons} from '../src/korean-state.js';
import {koreanStrokes,strokePath} from '../src/korean-stroke-data.js';import {koreanContent} from '../src/korean-content.js';
test('every taught letter and practice syllable has ordered finite strokes',()=>{
 let count=0;for(const [id,items] of Object.entries(koreanContent)){if(koreanLessons.find(l=>l.id===id).level!==0||koreanLessons.find(l=>l.id===id).practice)continue;for(const {text} of items.filter(item=>!item.finalSoundPractice)){const strokes=koreanStrokes(text);assert.ok(strokes?.length,text);for(const s of strokes){assert.ok(s.points.length>=2);assert.ok(s.points.flat().every(n=>Number.isFinite(n)&&n>=0&&n<=100),text);assert.ok(/^M/.test(strokePath(s)));}count++;}}assert.equal(count,46);
});
test('single, double, compound and final-consonant stroke counts and sequence',()=>{
 const counts={'ㄱ':1,'ㄴ':1,'ㄷ':2,'ㄹ':3,'ㅁ':3,'ㅂ':4,'ㅅ':2,'ㅇ':1,'ㅈ':2,'ㅊ':3,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3,'ㄲ':2,'ㄸ':4,'ㅃ':8,'ㅆ':4,'ㅉ':4,'ㅐ':3,'ㅒ':4,'ㅔ':3,'ㅖ':4,'ㅘ':4,'ㅙ':5,'ㅚ':3,'ㅝ':4,'ㅞ':5,'ㅟ':3,'ㅢ':2,'가':3,'나':3,'다':4,'고':3,'무':5,'이':2,'산':5,'밤':9,'강':4,'문':6,'물':8,'밥':10};
 for(const [glyph,count] of Object.entries(counts))assert.equal(koreanStrokes(glyph).length,count,glyph);
 assert.deepEqual(koreanStrokes('ㅓ')[0].points,[[25,50],[60,50]]);assert.deepEqual(koreanStrokes('ㅏ')[0].points,[[40,20],[40,80]]);assert.deepEqual(koreanStrokes('ㅗ')[0].points,[[50,25],[50,65]]);assert.equal(koreanStrokes('안녕'),null);
});
