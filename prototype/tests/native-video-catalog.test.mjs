import {songContent} from '../src/song-lesson-content.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {videoContent} from '../src/video-lesson-content.js';
import {videoLessons} from '../src/video-lesson-state.js';

test('every lesson video is permitted by the real iOS player, not only the browser mock',()=>{
 const swift=readFileSync(new URL('../ios/App/App/SceneDelegate.swift',import.meta.url),'utf8');
 const guard=swift.match(/\[([^\]]+)\]\.contains\(videoID\)/);
 assert.ok(guard,'Native video allowlist must be inspected when its implementation changes');
 const allowed=new Set([...guard[1].matchAll(/"([A-Za-z0-9_-]{11})"/g)].map(m=>m[1]));
 for(const [id,clip] of Object.entries(songContent))assert.ok(allowed.has(clip.videoId),`${id}: iOS would reject ${clip.videoId}`);
 for(const lesson of videoLessons)for(const clip of videoContent[lesson.id]){
  assert.ok(allowed.has(clip.videoId),`${lesson.id}: iOS would reject ${clip.videoId}`);
 }
});
