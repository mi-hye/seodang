import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
async function* walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())yield*walk(p);else yield p;}}
const jobs=new Map();
for await(const path of walk('assets/audio')){
 if(!path.endsWith('manifest.json'))continue;
 const manifest=JSON.parse(await readFile(path));
 for(const entry of Object.values(manifest.files||{})){const locale=entry.locale||manifest.locale||(/\/korean(?:-pronunciation)?\//.test(path)?'ko-KR':'ja-JP');jobs.set(entry.file,{file:entry.file,text:entry.spoken||entry.synthesisText||entry.text,locale});}
}
const {extraSentenceCases,extraKoreanCases}=await import('../src/level-two-content.js');
for(const [id,c] of Object.entries(extraSentenceCases))for(const x of [{id:`sentence.${id}.intro`,spoken:c.intro},...c.sentences]){const file=`assets/audio/level-two/${x.id}.wav`;jobs.set(file,{file,text:x.spoken,locale:'ja-JP'});}
for(const [id,c] of Object.entries(extraKoreanCases))for(const [i,x] of c.items.entries()){const file=`assets/audio/level-two/korean.${id}.${i}.wav`;jobs.set(file,{file,text:x.text,locale:'ko-KR'});}
const {scenarioContent,scenarioAudio}=await import('../src/scenario-content.js');
for(const [direction,lessons]of Object.entries(scenarioContent))for(const [id,c]of Object.entries(lessons))for(const [i]of c.items.entries()){const a=scenarioAudio(direction,id,i);jobs.set(a.audioFile,{file:a.audioFile,text:a.text,locale:a.locale});}
if([...jobs.values()].some(j=>!j.text||!j.file))throw Error('Incomplete audio source');
await mkdir('output/final-voices',{recursive:true});await writeFile('output/final-voices/jobs.json',JSON.stringify([...jobs.values()],null,2)+'\n');
console.log(jobs.size,'audio jobs');
