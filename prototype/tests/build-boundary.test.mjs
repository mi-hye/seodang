import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {measureModuleGraph} from '../build.mjs';

test('initial size follows static imports and re-exports once without evaluating modules',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'seodang-build-graph-'));
 try{
  const sources={
   'entry.js':`import './shared.js'; export {value} from './barrel.js';
    const sample="import './string-only.js'";
    // import './comment-only.js';
    const lazy=()=>import('./lazy-only.js');
    throw Error('Build measurements must never execute the app');`,
   'shared.js':`import './entry.js'; export const shared=true;`,
   'barrel.js':`export {value} from './leaf.js'; import './shared.js';`,
   'leaf.js':`export const value=1;`
  };
  await Promise.all(Object.entries(sources).map(([name,text])=>writeFile(join(directory,name),text)));
  const graph=await measureModuleGraph('entry.js',directory);
  assert.deepEqual(graph.files,Object.keys(sources).sort());
  assert.equal(graph.gzip,Object.values(sources).reduce((n,text)=>n+gzipSync(text).length,0));
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('app state is eager while lesson material, community and optional screens remain lazy',async()=>{
 const directory=fileURLToPath(new URL('../src/',import.meta.url));
 const graph=await measureModuleGraph('app.js',directory);
 for(const file of ['app.js','curriculum.js','lesson-title.js','song-state.js','storage.js'])assert.ok(graph.files.includes(file),file);
 for(const file of ['song-lesson.js','song-lesson-content.js','video-lesson-content.js','scenario-content.js','practice.js','community.js','pronunciation-course.js','speaking-coach.js','dog-chat.js','dog-chat-api.js','dog-chat-lessons.js'])assert.ok(!graph.files.includes(file),`${file} must stay outside the initial app graph`);
 const sizes=await Promise.all(graph.files.map(async file=>gzipSync(await readFile(join(directory,file))).length));
 assert.equal(graph.gzip,sizes.reduce((sum,size)=>sum+size,0));
});
