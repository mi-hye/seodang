import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {scenarioAudio,scenarioRoleAudio} from '../src/scenario-content.js';
import {scenarioRehearsal} from '../src/scenario-rehearsal-content.js';

test('2-17 colour question uses corrected naniiro recording in learning and rehearsal',async()=>{
 const entry=scenarioAudio('ko-ja','17',1);
 const report=JSON.parse(await readFile(new URL('../docs/asset-provenance/lost-item-pronunciation-20261023.json',import.meta.url)));
 assert.equal(entry.text,'何色の傘ですか。');
 assert.equal(entry.bundled,true);
 assert.equal(entry.audioFile,report.file);
 assert.equal(report.correctedMoras.join(''),'ナニイロノカサデスカ');
 assert.equal(report.synthesisText,'なにいろの傘ですか。');
 const bytes=await readFile(new URL(`../${entry.audioFile}`,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),report.sha256);
 assert.deepEqual(scenarioRoleAudio('ko-ja',1,'prompt','17'),entry);
 assert.deepEqual(scenarioRehearsal('ko-ja:scenario:17')[1].promptAudio,entry);
 assert.equal(scenarioAudio('ja-ko','17',1).audioFile,'assets/audio/scenarios/ja-ko.17.1.wav');
 assert.equal(scenarioAudio('ko-ja','17',0).audioFile,'assets/audio/scenarios/ko-ja.17.0.wav');
});
