import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('release has no AI entry, provider route, or chat assets',async()=>{
 for(const path of ['src/app.js','src/lesson-completion.js','src/practice.css','build.mjs','server.mjs'])assert.doesNotMatch(await readFile(new URL('../'+path,import.meta.url),'utf8'),/dog-chat|dogChat|completion-dog-chat/,path);
 assert.deepEqual((await readdir(new URL('../src/',import.meta.url))).filter(name=>name.startsWith('dog-chat')),[]);
});
