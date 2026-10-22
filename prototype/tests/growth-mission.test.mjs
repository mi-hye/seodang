import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {growthEntry,growthKey,validGrowth} from '../src/growth-state.js';
import {currentMission,latestCompletion,missionForCommunity,storedMission,validMissions} from '../src/mission-state.js';
import {hasMissionTask,missionTask} from '../src/mission-content.js';
import {growthSituations} from '../src/growth-content.js';
import {recordStudyCompletion,validStudy} from '../src/study-state.js';
import {courseLevels} from '../src/curriculum.js';

const day=d=>new Date(`2026-10-${d}T12:00:00`);
const base=(direction='ko-ja',level=2)=>({...freshState(),onboarded:true,onboardingLevel:level,courseDirection:direction});
const roundTrip=s=>{const r=load({getItem:()=>JSON.stringify(s)});assert.equal(r.blocked,false);return r.state;};

test('every direction and course level has one fixed growth situation',()=>{
 for(const direction of ['ko-ja','ja-ko'])for(const level of courseLevels)assert.ok(growthSituations[direction][level]?.length>10,`${direction}:${level}`);
});

test('growth keeps the first answer, stores later answers, and restores drafts per direction and level',()=>{
 let s=base();
 assert.equal(growthKey(s),'ko-ja:2');
 assert.equal(reduce(s,{type:'growth-save',text:'   ',completed:0},day(21)),s,'empty answers are rejected');
 s=reduce(s,{type:'growth-draft',text:'わたしは'},day(21));assert.equal(growthEntry(s).draft.text,'わたしは');
 s=roundTrip(s);assert.equal(growthEntry(s).draft.on,'2026-10-21');
 s=reduce(s,{type:'growth-save',text:' わたしはミヘです。 ',completed:4},day(21));
 assert.deepEqual(growthEntry(s).answers,[{text:'わたしはミヘです。',on:'2026-10-21',completed:4}]);assert.equal(growthEntry(s).draft,undefined);
 // No lock: a later answer can be saved right away, and the first one never changes.
 s=reduce(s,{type:'growth-save',text:'はじめまして。ミヘです。',completed:4},day(21));
 for(let i=0;i<15;i++)s=reduce(s,{type:'growth-save',text:`答え${i}`,completed:5+i},day(22));
 const answers=growthEntry(s).answers;assert.equal(answers.length,12);assert.equal(answers[0].text,'わたしはミヘです。');assert.equal(answers.at(-1).text,'答え14');
 assert.ok(valid(s));s=roundTrip(s);
 // Other level and other direction have their own entries.
 assert.deepEqual(growthEntry({...s,onboardingLevel:4}).answers,[]);
 assert.deepEqual(growthEntry({...s,courseDirection:'ja-ko'}).answers,[]);
 // Growth writing is not lesson activity.
 assert.equal(s.history,undefined);
});

test('malformed growth and mission records are rejected',()=>{
 assert.equal(validGrowth({version:1,entries:{'ko-ja:3':{answers:[]}}}),false);
 assert.equal(validGrowth({version:1,entries:{'ko-ja:2':{answers:[{text:'',on:'2026-10-21',completed:0}]}}}),false);
 assert.equal(validGrowth({version:1,entries:{'ko-ja:2':{answers:[{text:'a',on:'2026-02-31',completed:0}]}}}),false);
 assert.equal(validMissions({version:1,items:{'ko-ja':{lessonKey:'ja-ko:scenario:2',lessonOn:'2026-10-21',text:'',status:'draft',updatedOn:'2026-10-21'}}}),false);
 assert.equal(validMissions({version:1,items:{'ko-ja':{lessonKey:'ko-ja:scenario:2',lessonOn:'2026-10-21',text:'',status:'ready',updatedOn:'2026-10-21'}}}),false);
 assert.equal(validStudy({'ko-ja':{lessons:{'ko-ja:scenario:2':{completedOn:'2026-10-21',at:-1}}}}),false);
});

test('completion records keep their time so same-day retakes become the latest lesson',()=>{
 const snap=(id,done)=>({lesson_id:`ko-ja:scenario:${id}`,course_direction:'ko-ja',done});
 let s=base();
 s=recordStudyCompletion(s,snap(2,false),snap(2,true),new Date('2026-10-21T09:00:00'));
 s=recordStudyCompletion(s,snap(3,false),snap(3,true),new Date('2026-10-21T10:00:00'));
 assert.equal(latestCompletion(s).key,'ko-ja:scenario:3');
 s=recordStudyCompletion(s,snap(2,false),snap(2,true),new Date('2026-10-21T11:00:00'));
 assert.equal(latestCompletion(s).key,'ko-ja:scenario:2','retaken lesson comes last even though its key was stored first');
 assert.ok(validStudy(s.studyTools));
 // Older records without a time still work.
 assert.equal(latestCompletion({...s,studyTools:{'ko-ja':{lessons:{'ko-ja:scenario:9':{completedOn:'2026-10-20'},'ko-ja:scenario:4':{completedOn:'2026-10-20'}}}}}).key,'ko-ja:scenario:4');
});

test('missions follow lessons with a fitting task and hide video and letter lessons',()=>{
 assert.ok(missionTask('ko-ja:scenario:12').includes('제안'));assert.ok(missionTask('ja-ko:scenario:12').includes('提案'));
 for(const key of ['ko-ja:video:frieren-subtext','ko-ja:kana:0','ko-ja:basic:7','ja-ko:korean:1-1','ja-ko:sentence:3'])assert.equal(hasMissionTask(key),false,key);
 const s={...base(),studyTools:{'ko-ja':{lessons:{'ko-ja:scenario:9':{completedOn:'2026-10-20',at:1},'ko-ja:video:frieren-subtext':{completedOn:'2026-10-21',at:2}}}}};
 assert.equal(currentMission(s,hasMissionTask).lessonKey,'ko-ja:scenario:9');
 assert.equal(currentMission({...s,studyTools:{'ko-ja':{lessons:{'ko-ja:kana:0':{completedOn:'2026-10-21'}}}}},hasMissionTask),null);
});

test('mission draft, save, community hand-off, and no silent overwrite',()=>{
 const lessons={'ko-ja:scenario:9':{completedOn:'2026-10-20',at:1}};
 let s={...base(),studyTools:{'ko-ja':{lessons}}};
 const target={lessonKey:'ko-ja:scenario:9',lessonOn:'2026-10-20'};
 assert.equal(reduce(s,{type:'mission-draft',text:'x',lessonKey:'ko-ja:scenario:2',lessonOn:'2026-10-20'},day(21)),s,'unknown completion is rejected');
 s=reduce(s,{type:'mission-draft',text:'遅れそうです',...target},day(21));
 assert.equal(storedMission(s).status,'draft');assert.equal(missionForCommunity(s),null);
 assert.equal(reduce(s,{type:'mission-save',text:'  ',...target},day(21)),s);
 s=reduce(s,{type:'mission-save',text:' 少し遅れそうです。',...target},day(21));
 assert.deepEqual(missionForCommunity(s),{text:'少し遅れそうです。',language:'ja'});
 s=roundTrip(s);
 // A newer lesson does not replace the unfinished sentence.
 s={...s,studyTools:{'ko-ja':{lessons:{...lessons,'ko-ja:scenario:12':{completedOn:'2026-10-21',at:2}}}}};
 const m=currentMission(s,hasMissionTask);assert.equal(m.lessonKey,'ko-ja:scenario:9');assert.equal(m.stale,true);
 assert.equal(reduce(s,{type:'mission-draft',text:'new',lessonKey:'ko-ja:scenario:12',lessonOn:'2026-10-21'},day(21)),s);
 s=reduce(s,{type:'mission-shared'},day(21));assert.equal(storedMission(s).status,'shared');assert.equal(missionForCommunity(s),null);
 // After hand-off the newest lesson gets a fresh mission.
 assert.equal(currentMission(s,hasMissionTask).lessonKey,'ko-ja:scenario:12');
 assert.ok(valid(s));assert.equal(s.history,undefined);
});

test('a stored unfinished mission stays editable after its lesson is retaken on a later day',()=>{
 const target={lessonKey:'ko-ja:scenario:9',lessonOn:'2026-10-20'};
 let s={...base(),studyTools:{'ko-ja':{lessons:{'ko-ja:scenario:9':{completedOn:'2026-10-20',at:1}}}}};
 s=reduce(s,{type:'mission-draft',text:'遅れ',...target},day(20));
 // Retake moves the completion date forward.
 s={...s,studyTools:{'ko-ja':{lessons:{'ko-ja:scenario:9':{completedOn:'2026-10-21',at:5}}}}};
 const m=currentMission(s,hasMissionTask);assert.equal(m.lessonOn,'2026-10-20');assert.equal(m.text,'遅れ');
 s=reduce(s,{type:'mission-draft',text:'遅れそう',...target},day(21));assert.equal(storedMission(s).text,'遅れそう');
 s=reduce(s,{type:'mission-save',text:'遅れそうです。',...target},day(21));assert.equal(storedMission(s).status,'ready');
 s=reduce(s,{type:'mission-edit'},day(21));assert.equal(storedMission(s).status,'draft');
 s=reduce(s,{type:'mission-save',text:'少し遅れそうです。',...target},day(21));assert.equal(storedMission(s).text,'少し遅れそうです。');
 assert.ok(valid(s));
 // Discarding is explicit, then the retaken lesson starts a new mission.
 s=reduce(s,{type:'mission-discard'},day(21));assert.equal(storedMission(s),null);
 assert.equal(currentMission(s,hasMissionTask).lessonOn,'2026-10-21');
});

test('growth counts completed lessons from the active catalog, including videos and expert talks in both directions',async()=>{
 const {completedLessons}=await import('../src/records.js');
 const {expertKey,freshExpert}=await import('../src/expert-state.js');
 const {videoLessons}=await import('../src/video-lesson-state.js');
 for(const direction of ['ko-ja','ja-ko']){
  const s0=base(direction,7);
  const plain=videoLessons.find(l=>l.direction===direction&&!l.mode&&(l.revision??1)===1);
  const revised=videoLessons.find(l=>l.direction===direction&&l.mode==='detective'&&(l.revision??1)>1);
  const done=(version,mode)=>({version,started:true,completed:true,index:0,phase:'done',...(mode==='detective'?{selected:null,checked:false,retry:false}:{})});
  const s={...s0,videoLessons:{[plain.id]:done(1),[revised.id]:done(1,revised.mode)},experts:{[expertKey(s0,0)]:{...freshExpert(),started:true,completed:true,phase:'done'}}};
  const keys=completedLessons(s).map(l=>l.key);
  assert.ok(keys.includes(`${direction}:video:${plain.id}`),`${direction} video`);
  assert.ok(keys.includes(`${direction}:expert:0`),`${direction} expert`);
  assert.ok(!keys.includes(`${direction}:video:${revised.id}`),`${direction} obsolete revision is not counted`);
  assert.ok(keys.every(k=>k.startsWith(direction+':')));
 }
});
