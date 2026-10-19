import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {valid,load,save,STORAGE_KEY} from '../src/storage.js';
import {freshReading,validReading,readingAnswers} from '../src/reading-state.js';
import {advancedCourse,advancedAudio} from '../src/reading-advanced.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readingCourses} from '../src/reading-content.js';
import {renderReading,prepareReading} from '../src/reading.js';
const day=new Date(2026,9,13,12);
const act=(s,type,id)=>reduce(s,{type,id},day);
test('reading levels validate, retry, resume, complete independently, and preserve earlier progress',async()=>{
 await prepareReading(7);
 let s={...freshState(),onboarded:true};const originalEpisode=structuredClone(s.episode);
 for(const level of [5,6]){
  s=reduce(s,{type:'level',value:level},day);assert.equal(s.onboardingLevel,level);
  s=act(s,'reading-start');s=act(s,'reading-next');s=act(s,'reading-next');
  s=act(s,'reading-select','bogus');assert.equal(s.readings[level].selected,null);
  s=act(s,'reading-check');assert.equal(s.readings[level].index,0);
  for(let i=0;i<6;i++){
   assert.equal(s.readings[level].index,i);
   while(s.readings[level].phase!=='read')s=act(s,'reading-next');
   const answer=readingAnswers[level][i];
   s=act(s,'reading-select',(answer+1)%3);s=act(s,'reading-check');assert.equal(s.readings[level].retry,true);assert.equal(s.readings[level].index,i);
   assert.ok(valid(s));const map=new Map();const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};save(storage,s);s=load(storage).state;assert.equal(s.readings[level].retry,true);
   if(level>=6){const html=renderReading(s);assert.match(html,/확인/);assert.match(html,/[가-힣]/);assert.doesNotMatch(html,/\||undefined/);}
   s=act(s,'reading-select',answer);s=act(s,'reading-check');
  }
  assert.equal(s.onboardingLevel,level);assert.equal(s.readings[level].phase,'done');assert.ok(valid(s));assert.ok(s.history.completed.includes(`reading-${level}`));
  const cases=Object.values(s.history.days)[0].cases;s=act(s,'reading-check');assert.equal(Object.values(s.history.days)[0].cases,cases);
  s=act(s,'reading-start');assert.equal(s.readings[level].phase,'intro');assert.equal(s.readings[level].completed,true);assert.ok(valid(s));
 }
 assert.deepEqual(s.episode,originalEpisode);assert.equal(Object.values(s.history.days)[0].sentences,12);assert.equal(Object.values(s.history.days)[0].cases,2);
});
test('previous does not double count solved questions; new stages cannot advance outside their selected level',()=>{
 let s=reduce({...freshState(),onboarded:true},{type:'level',value:5},day);s=act(s,'reading-start');s=act(s,'reading-next');s=act(s,'reading-next');s=act(s,'reading-select',1);s=act(s,'reading-check');s=act(s,'reading-previous');assert.equal(s.readings[5].index,0);s=act(s,'reading-select',1);s=act(s,'reading-check');assert.equal(Object.values(s.history.days)[0].sentences,1);
 s=reduce(s,{type:'level',value:4},day);const prior=structuredClone(s.readings);s=act(s,'reading-next');assert.deepEqual(s.readings,prior);
 assert.ok(valid(freshState()));assert.equal(validReading({...freshReading(),index:6}),false);assert.equal(validReading({...freshReading(),phase:'done',completed:true}),false);assert.equal(valid({...freshState(),readings:{8:freshReading()}}),false);
});
test('six questions per level preserve Japanese study text with Korean level-four guidance',()=>{
 for(const level of [5,6]){const questions=readingCourses[level].passages.flatMap(p=>p.questions);assert.equal(questions.length,6);assert.equal(new Set(readingAnswers[level]).size,3);questions.forEach((q,i)=>{assert.equal(q.choices.length,3);assert.ok(q.choices[readingAnswers[level][i]]);});}
 for(const p of readingCourses[6].passages){assert.match(p.title,/[가-힣]/);assert.doesNotMatch(p.paragraphs.join(''),/[가-힣]/);for(const q of p.questions){assert.match(q.prompt,/[가-힣]/);assert.match(q.hint,/[가-힣]/);assert.doesNotMatch(q.choices.join(''),/[가-힣]/);}}
});

test('level 5 opens a scene and learning screen, and resumes answers',()=>{
 let s={...freshState(),onboarded:true,onboardingLevel:5,readings:{5:{...freshReading(),started:true}}};s=act(s,'reading-start');assert.equal(s.readings[5].phase,'intro');s=act(s,'reading-next');assert.equal(s.readings[5].phase,'learn');s=act(s,'reading-next');
 s=act(s,'reading-select',1);s=act(s,'reading-check');s=act(s,'reading-select',2);const saved=structuredClone(s.readings[5]);s=act(s,'reading-start');assert.deepEqual(s.readings[5],saved);
});
test('expert reading shows the article with four-way reasoning and matching audio',async()=>{
 await prepareReading(7);const manifest=JSON.parse(readFileSync('assets/audio/advanced/manifest.json'));
 assert.doesNotMatch(JSON.stringify({...advancedCourse,passages:advancedCourse.passages.map(({words,...passage})=>passage)}),/[가-힣]/);
 for(const passage of advancedCourse.passages)for(const entry of passage.words.split(' · ')){assert.match(entry,/^[一-龯]+ [가-힣]/);assert.doesNotMatch(entry.slice(entry.indexOf(' ')+1),/[一-龯ぁ-ゖァ-ヺ]/);}
 for(let i=0;i<3;i++){
  const passage=advancedCourse.passages[i];assert.ok(passage.paragraphs.join('').length>550);
  const state={...freshState(),onboardingLevel:7,readings:{7:{...freshReading(),started:true,phase:'read',index:i*2}}};
  const html=renderReading(state);for(const para of passage.paragraphs)assert.ok(html.replace(/<[^>]*>/g,'').includes(para));
  const learnHtml=renderReading({...state,readings:{7:{...state.readings[7],phase:'learn'}}});assert.ok(learnHtml.includes(passage.words));assert.match(learnHtml,/글 속 단어/);
  assert.match(html,/reading-passage/);assert.match(html,/학습 홈으로/);assert.match(html,/>확인</);assert.match(html,/reading-audio/);
  for(const q of passage.questions)assert.equal(q.choices.length,4);
  const a=advancedAudio[i],meta=manifest.files[`level7-${i+1}`],bytes=readFileSync(a.audioFile);assert.equal(meta.text,a.text);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.ok(meta.duration>60&&meta.duration<240);assert.equal(bytes.toString('ascii',0,4),'RIFF');
 }
});
