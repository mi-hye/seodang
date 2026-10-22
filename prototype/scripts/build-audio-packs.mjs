import {readFile,writeFile} from 'node:fs/promises';
import {freshState} from '../src/engine.js';
import {prepareContent,practiceUnits,practiceKey} from '../src/practice-content.js';
import {kanaLessons} from '../src/kana-state.js';
import {kanaCaseAudio} from '../src/kana-audio.js';
import {basicLessons,basicLevel} from '../src/basics-state.js';
import {koreanLessons} from '../src/korean-state.js';
import {koreanAudio,koreanExampleAudio} from '../src/korean.js';
import {sentenceLessons} from '../src/sentence-state.js';
import {sentenceCourse} from '../src/sentence-content.js';
import {dialogueAudio} from '../src/dialogue-content.js';
import {lessonReviewWords} from '../src/introduction-word-content.js';
import {audioManifest} from '../src/media.js';
const jobs=JSON.parse(await readFile('output/final-voices/jobs.json'));
const known=new Map(jobs.map(j=>[j.file,j]));const packs={};let missing=[];
function add(s,kind,title,extras=[]){
 const entries=[...practiceUnits(s,kind).map(x=>x.audio),...extras,...lessonReviewWords(practiceKey(s,kind)).map(x=>x.audio)].filter(Boolean);
 const files=[...new Set(entries.map(x=>x.audioFile))];
 for(const file of files)if(!known.has(file))missing.push(file);
 packs[practiceKey(s,kind)]={title,course:s.courseDirection,level:s.onboardingLevel,files};
}
for(const kind of ['kana','basic','korean','sentence','dialogue','reading','labels','listening','play'])await prepareContent(kind);
for(const [id,l]of kanaLessons.entries()){
 const s={...freshState(),courseDirection:'ko-ja',onboardingLevel:0,kana:{active:id}};
 const extra=jobs.filter(j=>j.file.includes('/kana-stories/')&&j.file.endsWith(l.letters.map(x=>x.id).join('-')+'.wav')).map(j=>({audioFile:j.file}));
 add(s,'kana',l.title,extra);
}
for(const l of basicLessons)add({...freshState(),courseDirection:'ko-ja',onboardingLevel:basicLevel(l.id),basics:{active:l.id}},'basic',l.title);
for(const l of koreanLessons){
 const s={...freshState(),courseDirection:'ja-ko',onboardingLevel:l.level,korean:{active:l.id}};
 const extras=[];for(let index=0;index<l.count;index++){
  const t={...s,korean:{active:l.id,lessons:{[l.id]:{index}}}};extras.push(koreanAudio(t));if(l.level===0)extras.push(koreanExampleAudio(t));
 }
 if(l.level===0)extras.push(...jobs.filter(j=>j.file.includes('/korean-pronunciation/')).map(j=>({audioFile:j.file})));
 add(s,'korean',l.title,extras);
}
for(const [index,{id}] of sentenceLessons.entries()){const s={...freshState(),courseDirection:'ko-ja',onboardingLevel:2,sentenceActive:id};add(s,'sentence',`Level 2 · ${index+1}`,Object.values(sentenceCourse(s).audio));}
for(const level of [5,6,7]){const s={...freshState(),courseDirection:'ko-ja',onboardingLevel:level};add(s,'reading',`Reading · ${level}`,jobs.filter(j=>level===7?j.file.includes('/advanced/'):j.file.startsWith(`assets/audio/reading/reading.${level}.`)).map(j=>({audioFile:j.file})));}
for(const kind of ['dialogue','labels','listening','play'])add({...freshState(),courseDirection:'ko-ja',onboardingLevel:kind==='dialogue'?4:2},kind,kind,kind==='dialogue'?Object.values(dialogueAudio):kind==='play'?Object.values(audioManifest):[]);
const {scenarioLessons,scenarioKey,scenarioTitle}=await import('../src/scenario-state.js');
const {scenarioAudio,scenarioRoleAudio,scenarioChoiceAudio,scenarioTokenAudio}=await import('../src/scenario-content.js');
for(const courseDirection of ['ko-ja','ja-ko'])for(const l of scenarioLessons){const s={courseDirection,scenarioActive:l.id};const files=[...new Set([0,1,2].flatMap(i=>['8','14','17'].includes(l.id)?['prompt','answer','reply'].map(part=>scenarioRoleAudio(courseDirection,i,part,l.id).audioFile):[false,true].map(speaking=>scenarioAudio(courseDirection,l.id,i,speaking).audioFile)))];if(['14','15','16','17'].includes(l.id))for(let i=0;i<3;i++)for(let choice=1;choice<3;choice++)files.push(scenarioChoiceAudio(courseDirection,l.id,i,choice).audioFile);if(l.id==='12')for(let i=0;i<3;i++)for(let token=0;token<3;token++)files.push(scenarioTokenAudio(courseDirection,l.id,i,token).audioFile);for(const file of files)if(!known.has(file))missing.push(file);packs[scenarioKey(s)]={title:scenarioTitle(s,l),course:courseDirection,level:l.level,files};}
const {levelTwoReviewData}=await import('../src/level-two-review-data.js');
for(const [key,c]of Object.entries(levelTwoReviewData)){const files=[...new Set([...(packs[key]?.files||[]),...c.units.map(u=>u.audio.audioFile),...lessonReviewWords(key).map(w=>w.audio.audioFile)])];for(const f of files)if(!known.has(f))missing.push(f);packs[key]={title:packs[key]?.title||`Level 2 · ${c.number}`,course:key.split(':')[0],level:2,files};}
if(missing.length)throw Error('Missing audio jobs: '+[...new Set(missing)].join(', '));
await writeFile('output/final-voices/packs.json',JSON.stringify(packs,null,2)+'\n');
console.log(Object.keys(packs).length,'lesson packs; all references covered');
