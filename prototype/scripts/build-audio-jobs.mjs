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
const {scenarioContent,scenarioAudio,scenarioRoleAudio,scenarioChoiceAudio,scenarioTokenAudio}=await import('../src/scenario-content.js');
for(const [direction,lessons]of Object.entries(scenarioContent))for(const [id,c]of Object.entries(lessons))for(const [i,x]of c.items.entries())for(const speaking of x.speaking?[false,true]:[false]){const a=scenarioAudio(direction,id,i,speaking);jobs.set(a.audioFile,{file:a.audioFile,text:a.text,locale:a.locale});}
for(const direction of ['ko-ja','ja-ko'])for(let i=0;i<3;i++)for(let token=0;token<3;token++){const a=scenarioTokenAudio(direction,'12',i,token);jobs.set(a.audioFile,{file:a.audioFile,text:a.text,locale:a.locale});}
for(const id of ['8','14','17'])for(const direction of ['ko-ja','ja-ko'])for(let i=0;i<3;i++)for(const part of ['answer','reply']){const a=scenarioRoleAudio(direction,i,part,id);jobs.set(a.audioFile,{file:a.audioFile,text:a.text,locale:a.locale});}
for(const id of ["14","15","16","17"])for(const direction of ["ko-ja","ja-ko"])for(let i=0;i<3;i++)for(let choice=1;choice<3;choice++){const a=scenarioChoiceAudio(direction,id,i,choice);jobs.set(a.audioFile,{file:a.audioFile,text:a.text,locale:a.locale});}

const {introductionWords}=await import('../src/introduction-word-content.js');
for(const ui of [false,true])for(const bag of [false,true])for(const {audio:a} of introductionWords(ui,bag))jobs.set(a.audioFile,{file:a.audioFile,text:a.text,locale:a.locale});
const {expandedReviewAudio}=await import('../src/level-two-review-content.js');
for(const a of expandedReviewAudio())jobs.set(a.audioFile,{file:a.audioFile,text:a.text,locale:a.locale});
if([...jobs.values()].some(j=>!j.text||!j.file))throw Error('Incomplete audio source');
await mkdir('output/final-voices',{recursive:true});await writeFile('output/final-voices/jobs.json',JSON.stringify([...jobs.values()],null,2)+'\n');
console.log(jobs.size,'audio jobs');
