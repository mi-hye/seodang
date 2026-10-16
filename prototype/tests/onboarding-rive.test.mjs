import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
test('the shipped Rive asset can be reproduced from its editable source',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'seodang-rive-'));
 try{
  await mkdir(join(dir,'assets/rive'),{recursive:true});
  execFileSync(process.execPath,[new URL('../scripts/build-onboarding-rive.mjs',import.meta.url).pathname],{cwd:dir});
  const shipped=await readFile(new URL('../assets/rive/seodang-onboarding.riv',import.meta.url));
  assert.equal(shipped.subarray(0,4).toString(),'RIVE');
  assert.deepEqual(await readFile(join(dir,'assets/rive/seodang-onboarding.riv')),shipped);
  for(const name of ['SeodangOnboarding','Welcome','Rest','Speaking','Greet','Idle','Talk','Sitting','Listening','Happy','Sit','Listen','Cheer'])assert.ok(shipped.includes(Buffer.from(name)));
 }finally{await rm(dir,{recursive:true,force:true});}
});
