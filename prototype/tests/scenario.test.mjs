import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {scenarioLessons,scenarioKey,scenarioProgress} from '../src/scenario-state.js';import {scenarioContent,scenarioAudio} from '../src/scenario-content.js';import {renderLearningMap} from '../src/learning-map.js';import {learningSnapshot,checkedAnswer} from '../src/analytics-learning.js';
const act=(s,type,id)=>reduce(s,{type,id},new Date('2026-10-19T12:00:00'));
for(const direction of ['ko-ja','ja-ko'])for(const l of scenarioLessons)test(`${direction}/${l.id}: map, learn, retry, resume, finish and replay preserve other progress`,()=>{
 let s={...freshState(),courseDirection:direction,onboardingLevel:l.level};
 assert.equal((renderLearningMap(s).match(/data-action="scenario"/g)||[]).length,l.level===4?4:l.level===5?3:l.level===7?2:l.level===2?6:1);
 s=act(s,'scenario-start',l.id);assert.equal(scenarioProgress(s).phase,'intro');s=act(s,'scenario-next');
 for(let i=0;i<3;i++){
  assert.equal(scenarioProgress(s).phase,['8','9','10','11','12','14','15','16','17'].includes(l.id)?'quiz':'learn');if(!['8','9','10','11','12','14','15','16','17'].includes(l.id))s=act(s,'scenario-next');const untouched=act(s,'scenario-next');assert.equal(scenarioProgress(untouched).phase,'quiz');
  if(['2','9','12'].includes(l.id)){for(const n of [2,1,0])s=act(s,'scenario-token',n);}else s=act(s,'scenario-select',((l.answers?.[i]??i)+1)%3);
  const b=learningSnapshot(s,'scenario');s=act(s,'scenario-check');assert.equal(checkedAnswer(b,learningSnapshot(s,'scenario'),'scenario-check'),false);assert.equal(scenarioProgress(s).retry,true);
  const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.deepEqual(scenarioProgress(restored.state),scenarioProgress(s));
  if(['2','9','12'].includes(l.id)){s=act(s,'scenario-clear');for(const n of [0,1,2])s=act(s,'scenario-token',n);}else s=act(s,'scenario-select',l.answers?.[i]??i);
  s=act(s,'scenario-check');assert.equal(scenarioProgress(s).checked,true);s=act(s,'scenario-next');if(['2','6','7','13'].includes(l.id)){assert.equal(scenarioProgress(s).phase,'speak');assert.equal(load({getItem:()=>JSON.stringify(s)}).blocked,false);s=act(s,'scenario-speak-next');}assert.ok(valid(s));
 }
 assert.equal(scenarioProgress(s).completed,true);assert.equal(learningSnapshot(s,'scenario').done,true);
 const h=direction==='ja-ko'?s.korean.history:s.history;assert.equal(h.days['2026-10-19'].cases,1);
 const other={...s,courseDirection:direction==='ko-ja'?'ja-ko':'ko-ja'};assert.equal(scenarioProgress(other).started,false);
 s=act(s,'scenario-start',l.id);assert.equal(scenarioProgress(s).phase,'intro');assert.equal(scenarioProgress(s).completed,true);assert.ok(valid(s));
});
test('new content teaches exact short answers and token builders before questions',()=>{
 for(const [direction,lessons]of Object.entries(scenarioContent))for(const [id,l]of Object.entries(lessons)){
  assert.equal(l.items.length,3);for(const [i,x]of l.items.entries()){
   assert.equal(scenarioAudio(direction,id,i).text,x.text);assert.ok(x.hint&&x.prompt);if(x.answerParts)assert.equal(x.answerParts.join(''),x.answer);
   if(['2','9','12'].includes(id)){assert.equal(x.parts.length,3);assert.equal(x.parts.join('').replaceAll('|','').replaceAll(' ',''),(['9','12'].includes(id)?x.answer:x.text).replaceAll(' ',''));}
   else{assert.equal(x.others.length,2);assert.equal(new Set([x.answer,...x.others]).size,3);if(Number(id)<=3)assert.ok(x.text.includes(x.answer));}
  }
 }
});
test('old states stay valid; malformed or cross-level scenario entry is rejected',()=>{
 const s={...freshState(),onboardingLevel:0};assert.ok(valid(s));assert.equal(load({getItem:()=>JSON.stringify(s)}).blocked,false);
 assert.equal(act(s,'scenario-start','5').scenarioActive,undefined);
 const started=act({...s,onboardingLevel:2},'scenario-start','2');assert.equal(valid({...started,scenarioActive:'99'}),false);
 const key=scenarioKey(started);assert.equal(valid({...started,scenarios:{[key]:{...scenarioProgress(started),index:99}}}),false);
});

test('all new lesson IDs survive the analytics privacy allowlist',async()=>{
 const {createAnalytics}=await import('../src/analytics-core.js');let saved;
 const a=createAnalytics({storage:{getItem:()=>null,setItem:(_,v)=>saved=JSON.parse(v)},send:async()=>{},uuid:()=> '11111111-1111-4111-8111-111111111111'});a.setConsent(true);
 for(const direction of ['ko-ja','ja-ko'])for(const l of scenarioLessons){const id=`${direction}:scenario:${l.id}`;a.capture('lesson_started',{lesson_id:id,course_direction:direction,level:Number(l.id),phase:'intro',answer:'private learner input'});const props=saved.queue.at(-1).properties;assert.equal(props.lesson_id,id);assert.equal(props.answer,undefined);}
});
test('starting a completed Korean lesson from an unfinished one never counts a new completion',()=>{
 let s={...freshState(),courseDirection:'ja-ko',onboardingLevel:2};s=act(s,'scenario-start','2');
 s.scenarios['ja-ko:scenario:3']={...scenarioProgress(s),phase:'done',completed:true};s.onboardingLevel=4;
 s=act(s,'scenario-start','3');assert.equal(s.korean?.history?.days?.['2026-10-19']?.cases??0,0);assert.ok(valid(s));
});

test('level one has no extra scenario and retired progress remains loadable',()=>{
 for(const courseDirection of ['ko-ja','ja-ko']){
  const s={...freshState(),courseDirection,onboardingLevel:0};
  assert.equal(scenarioLessons.some(l=>l.level===0),false);
  assert.doesNotMatch(renderLearningMap(s),/data-action="scenario"/);
  assert.deepEqual(act(s,'scenario-start','1'),s);
  const old={...s,scenarioActive:'1',scenarios:{[`${courseDirection}:scenario:1`]:{...scenarioProgress(s,'1'),started:true,completed:true,phase:'done'}}};
  if(courseDirection==='ko-ja')old.history={version:1,startedOn:'2026-10-19',completed:['ko-ja:scenario:1'],days:{}};
  assert.ok(valid(old));assert.equal(load({getItem:()=>JSON.stringify(old)}).blocked,false);
  assert.doesNotMatch(renderLearningMap(old),/data-action="scenario"/);
  assert.deepEqual(act(old,'scenario-next'),old);
 }
});

// A phrase must not wrap the end of one speaker's line together with the next.
test('dialogue phrase boundaries preserve line order and original audio text',()=>{
 const x=scenarioContent['ko-ja']['3'].items[0];
 assert.deepEqual(x.phrases,['お名前を','お願いします。','\n','キムの名前で','予約しています。']);
 for(const lessons of Object.values(scenarioContent))for(const lesson of Object.values(lessons))for(const x of lesson.items)if(x.phrases){
  assert.equal(x.phrases.join(''),x.text);
  assert.ok(x.phrases.every(p=>p==='\n'||!p.includes('\n')));
 }
});

test('level three adds through lesson 3-7 and keeps the video at 3-3',()=>{
 for(const courseDirection of ['ko-ja','ja-ko']){
  const s={...freshState(),courseDirection,onboardingLevel:4};const html=renderLearningMap(s);
  const stops=[...html.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"(?: data-id="([^"]+)")?/g)];
  assert.equal(stops.length,7);assert.equal(stops[2][1],'video');assert.deepEqual(stops[3].slice(1),['scenario','6']);
  assert.deepEqual(stops[4].slice(1),['scenario','7']);assert.equal(stops[5][1],'video');assert.deepEqual(stops[6].slice(1),['scenario','8']);assert.match(html,/5\. /);assert.equal(scenarioLessons.filter(l=>l.level===4).length,4);
 }
});

for(const direction of ['ko-ja','ja-ko'])test(`${direction} hotel requests resume speaking and only finish after the last speaking step`,async()=>{
 const {renderScenario,currentScenarioAudio}=await import('../src/scenario.js');
 let s={...freshState(),courseDirection:direction,onboardingLevel:4};s=act(s,'scenario-start','6');s=act(s,'scenario-next');
 for(let i=0;i<3;i++){
  s=act(s,'scenario-next');s=act(s,'scenario-select',i);s=act(s,'scenario-check');s=act(s,'scenario-next');
  assert.equal(scenarioProgress(s).phase,'speak');assert.equal(scenarioProgress(s).completed,false);
  const x=scenarioContent[direction]['6'].items[i],audio=currentScenarioAudio(s);assert.equal(audio.text,x.answer);assert.equal(audio.audioFile,x.speaking.audioFile);assert.notEqual(audio.audioFile,scenarioAudio(direction,'6',i).audioFile);
  assert.equal(load({getItem:()=>JSON.stringify(s)}).state.scenarios[scenarioKey(s)].phase,'speak');
  const html=renderScenario(s,t=>t);assert.match(html,/data-speaking-record/);assert.ok(html.includes('data-speaking-spoken="'+x.answer+'"'));
  const previous=act(s,'scenario-previous');assert.equal(scenarioProgress(previous).phase,'quiz');assert.equal(scenarioProgress(previous).completed,false);
  s=act(s,'scenario-speak-next');
 }
 assert.equal(scenarioProgress(s).phase,'done');assert.equal((direction==='ko-ja'?s.history:s.korean.history).days['2026-10-19'].cases,1);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} roleplay starts with the staff and reveals reply audio only after an answer`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');let s={...freshState(),courseDirection,onboardingLevel:4};s=act(s,'scenario-start','8');assert.equal(currentScenarioAudio(s),null);s=act(s,'scenario-next');assert.equal(scenarioProgress(s).phase,'quiz');
 const x=scenarioContent[courseDirection]['8'].items[0];assert.equal(currentScenarioAudio(s,'reply').text,x.text);s=act(s,'scenario-select',1);s=act(s,'scenario-check');assert.equal(currentScenarioAudio(s,'reply').text,x.text);
 s=act(s,'scenario-select',0);s=act(s,'scenario-check');assert.equal(currentScenarioAudio(s,'reply').text,x.reply);assert.equal(currentScenarioAudio(s,'answer').text,x.answer);assert.equal(currentScenarioAudio(s,'prompt').text,x.text);
 s=act(s,'scenario-next');assert.equal(scenarioProgress(s).index,1);s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).index,0);assert.equal(scenarioProgress(s).checked,false);assert.equal(currentScenarioAudio(s,'reply').text,x.text);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} level 4-5 reply builder preserves a draft and gates answer audio`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');let s={...freshState(),courseDirection,onboardingLevel:5};const html=renderLearningMap(s);const stops=[...html.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"(?: data-id="([^"]+)")?/g)];assert.equal(stops.length,7);assert.equal(stops[5][1],'video');assert.deepEqual(stops[4].slice(1),['scenario','9']);assert.equal(stops[2][1],'video');
 s=act(s,'scenario-start','9');s=act(s,'scenario-next');assert.equal(scenarioProgress(s).phase,'quiz');const x=scenarioContent[courseDirection]['9'].items[0];assert.equal(currentScenarioAudio(s,'answer').text,x.text);
 s=act(s,'scenario-token',0);s=act(s,'scenario-token',2);const draft=load({getItem:()=>JSON.stringify(s)});assert.equal(draft.blocked,false);assert.deepEqual(scenarioProgress(draft.state).tokens,[0,2]);assert.equal(scenarioProgress(act(s,'scenario-check')).checked,false);
 s=act(s,'scenario-token',2);s=act(s,'scenario-token',1);s=act(s,'scenario-token',2);s=act(s,'scenario-check');assert.equal(scenarioProgress(s).checked,true);assert.equal(currentScenarioAudio(s,'answer').text,x.answer);assert.deepEqual(scenarioProgress(act(s,'scenario-token',0)).tokens,[0,1,2]);
 s=act(s,'scenario-next');assert.equal(scenarioProgress(s).index,1);s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).index,0);assert.deepEqual(scenarioProgress(s).tokens,[]);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} level 4-7 listens before revealing intent and restores selected answer`,async()=>{
 const {renderScenario,currentScenarioAudio}=await import('../src/scenario.js');let s={...freshState(),courseDirection,onboardingLevel:5};const map=renderLearningMap(s);const stops=[...map.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"(?: data-id="([^"]+)")?/g)];assert.equal(stops.length,7);assert.deepEqual(stops[6].slice(1),['scenario','10']);
 s=act(s,'scenario-start','10');assert.equal(currentScenarioAudio(s),null);s=act(s,'scenario-next');assert.equal(scenarioProgress(s).phase,'quiz');assert.equal(currentScenarioAudio(s).text,scenarioContent[courseDirection]['10'].items[0].text);assert.match(renderScenario(s,()=>''),/intent-transcript/);assert.doesNotMatch(renderScenario(s,()=>''),/intent-result/);
 s=act(s,'scenario-select',1);s=load({getItem:()=>JSON.stringify(s)}).state;assert.equal(scenarioProgress(s).selected,1);s=act(s,'scenario-check');assert.equal(scenarioProgress(s).retry,true);assert.equal(scenarioProgress(act(s,'scenario-next')).index,0);
 s=act(s,'scenario-select',0);s=act(s,'scenario-check');assert.match(renderScenario(s,()=>''),/intent-result/);s=act(s,'scenario-next');assert.equal(scenarioProgress(s).index,1);s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).index,0);assert.equal(scenarioProgress(s).checked,false);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} level 5-7 keeps expert/video order and gates rewritten audio`,async()=>{
 const {currentScenarioAudio,renderScenario}=await import('../src/scenario.js');let s={...freshState(),courseDirection,onboardingLevel:7};const map=renderLearningMap(s),stops=[...map.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"(?: data-id="([^"]+)")?/g)];assert.equal(stops.length,9);assert.deepEqual(stops[6].slice(1),['scenario','11']);assert.equal(stops[4][1],'expert');assert.equal(stops[5][1],'video');assert.doesNotMatch(map,/data-action="scenario" data-id="5"/);
 s=act(s,'scenario-start','11');assert.equal(currentScenarioAudio(s),null);s=act(s,'scenario-next');const x=scenarioContent[courseDirection]['11'].items[0];assert.equal(currentScenarioAudio(s,'answer').text,x.text);
 s=act(s,'scenario-select',1);s=load({getItem:()=>JSON.stringify(s)}).state;assert.equal(scenarioProgress(s).selected,1);s=act(s,'scenario-check');assert.match(renderScenario(s,()=>''),/role="status"/);assert.equal(scenarioProgress(s).retry,true);assert.equal(scenarioProgress(act(s,'scenario-next')).index,0);
 s=act(s,'scenario-select',0);s=act(s,'scenario-check');assert.equal(currentScenarioAudio(s,'answer').text,x.answer);assert.equal(currentScenarioAudio(s,'prompt').text,x.text);assert.notEqual(currentScenarioAudio(s,'answer').audioFile,currentScenarioAudio(s,'prompt').audioFile);s=act(s,'scenario-next');s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).checked,false);assert.equal(currentScenarioAudio(s,'answer').text,x.text);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} level 5-8 appends a proposal builder and restores its partial answer`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');
 let s={...freshState(),courseDirection,onboardingLevel:7};
 const {studyCatalog}=await import('../src/study-catalog.js');
 const lessons=studyCatalog(s).filter(x=>x.level===7);
 assert.equal(lessons.length,9);assert.equal(lessons[7].id,'12');assert.equal(lessons[7].position,'5-8');assert.deepEqual(lessons.filter(x=>x.kind==='video').map(x=>x.position),['5-3','5-6','5-9']);
 s=act(s,'scenario-start','12');assert.equal(currentScenarioAudio(s),null);s=act(s,'scenario-next');
 const x=scenarioContent[courseDirection]['12'].items[0];assert.equal(currentScenarioAudio(s,'answer').text,x.text);
 s=act(s,'scenario-token',0);s=act(s,'scenario-token',2);s=load({getItem:()=>JSON.stringify(s)}).state;
 assert.deepEqual(scenarioProgress(s).tokens,[0,2]);assert.equal(scenarioProgress(act(s,'scenario-check')).attempts,0);
 s=act(s,'scenario-token',2);s=act(s,'scenario-token',1);s=act(s,'scenario-token',2);s=act(s,'scenario-check');
 assert.equal(currentScenarioAudio(s,'answer').text,x.answer);assert.equal(currentScenarioAudio(s,'answer').audioFile,x.speaking.audioFile);assert.equal(currentScenarioAudio(s,'prompt').text,x.text);
 s=act(s,'scenario-next');s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).index,0);assert.deepEqual(scenarioProgress(s).tokens,[]);assert.equal(scenarioProgress(s).checked,false);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} proposal tokens speak their own text only during an unanswered round`,async()=>{
 const {currentScenarioTokenAudio}=await import('../src/scenario.js');
 let s={...freshState(),courseDirection,onboardingLevel:7};s=act(s,'scenario-start','12');assert.equal(currentScenarioTokenAudio(s,0),null);s=act(s,'scenario-next');
 for(let i=0;i<3;i++){
  for(let token=0;token<3;token++){const a=currentScenarioTokenAudio(s,token);assert.equal(a.text,scenarioContent[courseDirection]['12'].items[i].parts[token].replaceAll('|','').trim());assert.equal(a.audioFile,`assets/audio/scenarios/${courseDirection}.12.token.${i}.${token}.wav`);}
  assert.equal(currentScenarioTokenAudio(s,3),null);assert.equal(currentScenarioTokenAudio(s,-1),null);
  for(let t=0;t<3;t++)s=act(s,'scenario-token',t);s=act(s,'scenario-check');assert.equal(currentScenarioTokenAudio(s,0),null);s=act(s,'scenario-next');
 }
 assert.equal(currentScenarioTokenAudio(s,0),null);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} level 2-8 adds the shop after existing lessons`,()=>{
 const s={...freshState(),courseDirection,onboardingLevel:2},html=renderLearningMap(s);
 const stops=[...html.matchAll(/data-action="(sentence|korean|scenario|video)" data-id="([^"]+)"/g)].map(x=>x.slice(1));
 assert.equal(stops.length,14);assert.deepEqual(stops[7],['scenario','13']);
 assert.equal(stops[2][0],'video');assert.equal(stops[5][0],'video');
 for(let i=0;i<3;i++)assert.equal(scenarioAudio(courseDirection,'13',i,true).text,scenarioContent[courseDirection]['13'].items[i].answer);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} message chat gates future audio and preserves completed turns`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');let s={...freshState(),courseDirection,onboardingLevel:2};
 s=act(s,'scenario-start','14');s=act(s,'scenario-next');assert.equal(currentScenarioAudio(s,'answer'),null);assert.equal(currentScenarioAudio(s,'1:prompt'),null);
 s=act(s,'scenario-select',2);s=act(s,'scenario-check');assert.equal(scenarioProgress(s).checked,true);assert.equal(currentScenarioAudio(s,'answer').text,scenarioContent[courseDirection]['14'].items[0].answer);
 s=act(s,'scenario-next');assert.equal(currentScenarioAudio(s,'0:answer').text,scenarioContent[courseDirection]['14'].items[0].answer);assert.equal(currentScenarioAudio(s,'1:answer'),null);assert.equal(currentScenarioAudio(s,'2:reply'),null);
 assert.equal(load({getItem:()=>JSON.stringify(s)}).blocked,false);
 const stops=[...renderLearningMap(s).matchAll(/data-action="(sentence|korean|scenario|video)" data-id="([^"]+)"/g)].map(x=>x.slice(1));assert.equal(stops.length,14);assert.deepEqual(stops[9],['scenario','14']);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} every chat choice speaks its exact sentence without changing progress`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');let s={...freshState(),courseDirection,onboardingLevel:2};s=act(s,'scenario-start','14');assert.equal(currentScenarioAudio(s,'choice:0'),null);s=act(s,'scenario-next');
 for(let i=0;i<3;i++){const x=scenarioContent[courseDirection]['14'].items[i],before=JSON.stringify(s);for(let c=0;c<3;c++)assert.equal(currentScenarioAudio(s,`choice:${c}`).text,[x.answer,...x.others][c]);assert.equal(JSON.stringify(s),before);assert.equal(currentScenarioAudio(s,'choice:3'),null);s=act(s,'scenario-select',[2,0,1][i]);s=act(s,'scenario-check');assert.equal(currentScenarioAudio(s,'choice:0'),null);s=act(s,'scenario-next');}
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} order repair is 2-11 and speaks displayed choices only in unanswered rounds`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');const {studyCatalog}=await import('../src/study-catalog.js');let s={...freshState(),courseDirection,onboardingLevel:2};const map=studyCatalog(s).filter(l=>l.level===2);assert.equal(map.length,14);assert.equal(map[10].position,'2-11');assert.equal(map[10].id,'15');assert.deepEqual(map.filter(l=>l.kind==='video').map(l=>l.position),['2-3','2-6','2-9','2-12']);s=act(s,'scenario-start','15');assert.equal(currentScenarioAudio(s,'choice:0'),null);s=act(s,'scenario-next');
 for(let i=0;i<3;i++){const x=scenarioContent[courseDirection]['15'].items[i];assert.equal(currentScenarioAudio(s).text,x.text);for(let c=0;c<3;c++)assert.equal(currentScenarioAudio(s,`choice:${c}`).text,[x.answer,...x.others][c]);assert.equal(currentScenarioAudio(s,'choice:3'),null);s=act(s,'scenario-select',[1,2,0][i]);s=act(s,'scenario-check');assert.equal(currentScenarioAudio(s,'answer').text,x.answer);assert.equal(currentScenarioAudio(s,'choice:0'),null);s=act(s,'scenario-next');}
 assert.equal(scenarioProgress(s).completed,true);assert.equal(currentScenarioAudio(s),null);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} weather lesson appends 2-13 and gates its answer audio`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');const {studyCatalog}=await import('../src/study-catalog.js');let s={...freshState(),courseDirection,onboardingLevel:2};const map=studyCatalog(s).filter(l=>l.level===2);assert.equal(map.length,14);assert.equal(map[12].position,'2-13');assert.equal(map[12].id,'16');assert.deepEqual(map.filter(l=>l.kind==='video').map(l=>l.position),['2-3','2-6','2-9','2-12']);s=act(s,'scenario-start','16');assert.equal(currentScenarioAudio(s),null);s=act(s,'scenario-next');
 for(let i=0;i<3;i++){const x=scenarioContent[courseDirection]['16'].items[i];assert.equal(currentScenarioAudio(s).text,x.text);for(let c=0;c<3;c++)assert.equal(currentScenarioAudio(s,`choice:${c}`).text,[x.answer,...x.others][c]);assert.equal(currentScenarioAudio(s,'choice:3'),null);s=act(s,'scenario-select',[2,0,1][i]);s=act(s,'scenario-check');assert.equal(currentScenarioAudio(s,'answer').text,x.answer);assert.equal(currentScenarioAudio(s,'choice:0'),null);s=act(s,'scenario-next');}assert.equal(scenarioProgress(s).completed,true);assert.equal(currentScenarioAudio(s),null);
});

for(const courseDirection of ['ko-ja','ja-ko'])test(`${courseDirection} lost bag 2-14 gates conversation and choice audio`,async()=>{
 const {currentScenarioAudio}=await import('../src/scenario.js');const {studyCatalog}=await import('../src/study-catalog.js');let s={...freshState(),courseDirection,onboardingLevel:2};const map=studyCatalog(s).filter(l=>l.level===2);assert.equal(map.length,14);assert.equal(map.at(-1).position,'2-14');assert.equal(map.at(-1).id,'17');s=act(s,'scenario-start','17');assert.equal(currentScenarioAudio(s),null);s=act(s,'scenario-next');
 for(let i=0;i<3;i++){const x=scenarioContent[courseDirection]['17'].items[i];assert.equal(currentScenarioAudio(s).text,x.text);assert.equal(currentScenarioAudio(s,'answer'),null);assert.equal(currentScenarioAudio(s,'2:reply'),null);for(let c=0;c<3;c++)assert.equal(currentScenarioAudio(s,`choice:${c}`).text,[x.answer,...x.others][c]);assert.equal(currentScenarioAudio(s,'choice:3'),null);s=act(s,'scenario-select',[1,0,2][i]);s=act(s,'scenario-check');assert.equal(currentScenarioAudio(s,'answer').text,x.answer);assert.equal(currentScenarioAudio(s,'reply').text,x.reply);assert.equal(currentScenarioAudio(s,'choice:0'),null);assert.equal(currentScenarioAudio(s,'0:answer').text,scenarioContent[courseDirection]['17'].items[0].answer);s=act(s,'scenario-next');}assert.equal(scenarioProgress(s).completed,true);assert.equal(currentScenarioAudio(s),null);
});
