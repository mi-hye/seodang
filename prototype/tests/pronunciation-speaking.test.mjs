import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSpeakingTarget} from '../src/korean-speaking.js';
import {pronunciationCourseContent} from '../src/pronunciation-course-content.js';
test('all pronunciation targets match while contrast sounds remain distinct',()=>{
 for(const items of Object.values(pronunciationCourseContent))for(const item of items){
  assert.ok(matchesSpeakingTarget(item.text,item.text));
  for(const other of items.filter(x=>x.text!==item.text))assert.equal(matchesSpeakingTarget(other.text,item.text),false,`${other.text} must not pass ${item.text}`);
  assert.equal(matchesSpeakingTarget('',item.text),false);
 }
});
test('sentence practice does not accept an isolated syllable or numeral as the whole sentence',()=>{
 for(const item of Object.values(pronunciationCourseContent).flat())for(const text of ['이','2','사','4','오','5'])assert.equal(matchesSpeakingTarget(text,item.text),false);
});
