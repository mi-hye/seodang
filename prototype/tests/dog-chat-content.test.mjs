import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dogChatLessons} from '../../supabase/functions/dog-chat/lessons.mjs';
import {dogChatKey,dogChatLessonKeys} from '../src/dog-chat-catalog.js';
import {extraSentenceCases} from '../src/level-two-content.js';
import {koreanContent} from '../src/korean-content.js';

test('dog conversation is limited to the two supported self-introduction lessons',()=>{
 assert.deepEqual(Object.keys(dogChatLessons).sort(),[...dogChatLessonKeys].sort());
 assert.equal(dogChatKey({courseDirection:'ko-ja',sentenceActive:3},'sentence'),'ko-ja:sentence:3');
 assert.equal(dogChatKey({courseDirection:'ja-ko',korean:{active:'3-1'}},'korean'),'ja-ko:korean:3-1');
 for(const [state,kind] of [
  [{courseDirection:'ko-ja',sentenceActive:0},'sentence'],
  [{courseDirection:'ko-ja',sentenceActive:3},'video'],
  [{courseDirection:'ja-ko',sentenceActive:3},'sentence'],
  [{courseDirection:'ko-ja',korean:{active:'3-1'}},'korean'],
  [{courseDirection:'ja-ko',korean:{active:'25-3'}},'korean'],
  [{courseDirection:'ja-ko'},'korean'],[{},'sentence'],[null,'korean'],
 ])assert.equal(dogChatKey(state,kind),null);
});

test('the allowed expressions and suggested replies come from each completed lesson',()=>{
 const source={
  'ko-ja:sentence:3':extraSentenceCases[3].sentences,
  'ja-ko:korean:3-1':koreanContent['3-1'],
 };
 for(const [key,lesson]of Object.entries(dogChatLessons)){
  assert.equal(lesson.key,key);
  assert.equal(lesson.level,2);
  assert.deepEqual(lesson.learnedExpressions,source[key].map(unit=>unit.text),key);
  const texts=new Map(source[key].map(unit=>[unit.text,unit.meaning]));
  for(const turn of lesson.turns)for(const choice of turn.choices){
   assert.ok(texts.has(choice.text),`${key}: unseen target expression ${choice.text}`);
   assert.equal(choice.meaning,texts.get(choice.text),`${key}: mismatched translation`);
  }
 }
});

test('each short conversation contains exactly three accessible turns without distractors',()=>{
 for(const lesson of Object.values(dogChatLessons)){
  const ja=lesson.targetLanguage==='ja';
  assert.equal(lesson.nativeLanguage,ja?'ko':'ja');
  assert.equal(lesson.turns.length,3);
  assert.ok(lesson.title);
  for(const turn of lesson.turns){
   for(const field of ['prompt','meaning','hint'])assert.ok(typeof turn[field]==='string'&&turn[field].trim()&&turn[field].length<=140,field);
   assert.ok(turn.choices.length>=1&&turn.choices.length<=3);
   assert.deepEqual(turn.accepted,turn.choices.map(choice=>choice.text));
   assert.equal(new Set(turn.accepted).size,turn.accepted.length);
   assert.ok(ja?/[ぁ-ゟァ-ヿ]/u.test(turn.prompt):/[가-힣]/u.test(turn.prompt));
   assert.ok(ja?/[가-힣]/u.test(turn.meaning):/[ぁ-ゟァ-ヿ]/u.test(turn.meaning));
   assert.ok(ja?/[가-힣]/u.test(turn.hint):/[ぁ-ゟァ-ヿ]/u.test(turn.hint));
  }
 }
});

test('eligibility metadata does not eagerly import dialogue content or lesson data',async()=>{
 const source=await readFile(new URL('../src/dog-chat-catalog.js',import.meta.url),'utf8');
 assert.ok(Buffer.byteLength(source)<1400);
 assert.doesNotMatch(source,/\bimport\s|supabase|learnedExpressions|turns\s*:/);
});
