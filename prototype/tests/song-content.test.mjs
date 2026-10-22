import test from 'node:test';
import assert from 'node:assert/strict';
import {songLessons} from '../src/song-state.js';
import {songContent} from '../src/song-lesson-content.js';

test('all six song previews have a verified short clip and matching exercise answers',()=>{
 assert.deepEqual(Object.keys(songContent).sort(),songLessons.map(l=>l.id).sort());
 for(const l of songLessons){
  const c=songContent[l.id];
  assert.equal(l.released,false,`${l.id}: release requires separate rights review`);
  assert.match(c.videoId,/^[A-Za-z0-9_-]{11}$/);
  assert.ok(Number.isInteger(c.startSeconds)&&Number.isInteger(c.endSeconds));
  assert.ok(c.endSeconds-c.startSeconds>=4&&c.endSeconds-c.startSeconds<=6);
  assert.equal(c.parts.join(''),c.target);
  assert.equal(c.exampleParts.join(''),c.example);
  assert.equal(c.gap.before+c.gap.options[c.gap.answer]+c.gap.after,c.target);
  assert.deepEqual(l.answers,[c.gap.answer,c.apply.answer]);
  for(const q of [c.gap,c.apply]){assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(q.options[q.answer]);}
  assert.notEqual(c.example,c.target);
  assert.ok(c.artist&&c.channel&&c.usage&&c.meaning&&c.exampleTranslation);
 }
});
