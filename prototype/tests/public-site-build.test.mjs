import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const build=destination=>promisify(execFile)(process.execPath,[join(root,'scripts/build-public-site.mjs'),destination]);
const publicHTML=['privacy-policy.html','privacy-policy-legacy.html','third-party-notices.html'];

test('Pages artifact contains only public legal pages and the standalone quiz',async t=>{
 const destination=await mkdtemp(join(tmpdir(),'seodang-public-site-'));
 t.after(()=>rm(destination,{recursive:true,force:true}));
 await build(destination);
 const files=(await readdir(destination,{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile()).map(entry=>join(entry.parentPath,entry.name).slice(destination.length+1)).sort();
 assert.deepEqual(files,[...publicHTML,'quiz.html','quiz-assets/share-quiz.js','quiz-assets/share-quiz-content.js','quiz-assets/share-quiz.css'].sort());
 for(const name of publicHTML)assert.equal(await readFile(join(destination,name),'utf8'),await readFile(join(root,'docs',name),'utf8'));
 const quiz=await readFile(join(destination,'quiz.html'),'utf8');
 assert.match(quiz,/quiz-assets\/share-quiz\.js/);
 assert.match(quiz,/quiz-assets\/share-quiz\.css/);
 assert.doesNotMatch(quiz,/src\/share-quiz|rel="icon"/);
 const workflow=await readFile(join(root,'.github/workflows/pages.yml'),'utf8');
 assert.match(workflow,/run: node scripts\/build-public-site\.mjs/);
 assert.match(workflow,/path: dist\/public-site/);
 assert.doesNotMatch(workflow,/path: docs(?:\s|$)/);
});

test('Pages build refuses a staging directory containing leftover private files',async t=>{
 const destination=await mkdtemp(join(tmpdir(),'seodang-public-site-private-'));
 t.after(()=>rm(destination,{recursive:true,force:true}));
 for(const name of ['ai-context.md','supabase-schema.sql'])await writeFile(join(destination,name),'private fixture');
 await assert.rejects(build(destination),/empty staging directory/);
 assert.deepEqual((await readdir(destination)).sort(),['ai-context.md','supabase-schema.sql']);
 assert.equal(await readFile(join(destination,'ai-context.md'),'utf8'),'private fixture');
});
