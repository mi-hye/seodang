import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {validGrowth} from '../src/growth-state.js';
import {missionForCommunity,storedMission,validMissions,reduceMission} from '../src/mission-state.js';
import {recordStudyCompletion,validStudy} from '../src/study-state.js';

const day=d=>new Date(`2026-10-${d}T12:00:00`);
const base=(direction='ko-ja',level=2)=>({...freshState(),onboarded:true,onboardingLevel:level,courseDirection:direction});
const roundTrip=s=>{const r=load({getItem:()=>JSON.stringify(s)});assert.equal(r.blocked,false);return r.state;};
const savedMission=(direction,status='ready')=>({lessonKey:`${direction}:scenario:9`,lessonOn:'2026-10-20',text:direction==='ko-ja'?'少し遅れそうです。':'조금 늦을 것 같아요.',status,updatedOn:'2026-10-20'});
const legacyGrowth=()=>({version:1,entries:{
 'ko-ja:2':{answers:Array.from({length:12},(_,i)=>({text:`答え${i}`,on:'2026-10-20',completed:i})),draft:{text:'次の答え',on:'2026-10-21'}},
 'ko-ja:4':{answers:[],draft:{text:'',on:'2026-10-21'}},
 'ja-ko:2':{answers:[{text:'안녕하세요.',on:'2026-10-20',completed:1}]},
 'ja-ko:8':{answers:[{text:'문을 열어요.',on:'2026-10-20',completed:2}],draft:{text:'물을',on:'2026-10-21'}},
}});

test('legacy growth answers and drafts round-trip without losing direction, level, or pronunciation-course data',()=>{
 for(const [direction,level] of [['ko-ja',2],['ja-ko',8]]){
  const s={...base(direction,level),growth:legacyGrowth()};
  assert.ok(valid(s));
  const restored=roundTrip(s);
  assert.deepEqual(restored.growth,s.growth);
  assert.equal(restored.history,undefined);
 }
 assert.equal(validGrowth(undefined),true);
 assert.equal(roundTrip(base()).growth,undefined);
});

test('legacy missions round-trip in every stored status without creating new missions',()=>{
 for(const status of ['draft','ready','shared']){
  const s={...base(),missions:{version:1,items:{'ko-ja':savedMission('ko-ja',status),'ja-ko':savedMission('ja-ko',status)}}};
  assert.ok(valid(s));
  assert.deepEqual(roundTrip(s).missions,s.missions);
 }
 const emptyDraft={...base(),missions:{version:1,items:{'ko-ja':{...savedMission('ko-ja','draft'),text:''}}}};
 assert.deepEqual(roundTrip(emptyDraft).missions,emptyDraft.missions);
 assert.equal(validMissions(undefined),true);
 assert.equal(roundTrip(base()).missions,undefined);
});

test('malformed legacy growth and mission records remain rejected',()=>{
 assert.equal(validGrowth({version:1,entries:{'ko-ja:3':{answers:[]}}}),false);
 assert.equal(validGrowth({version:1,entries:{'ko-ja:8':{answers:[]}}}),false,'pronunciation course belongs only to Korean learners');
 assert.equal(validGrowth({version:1,entries:{'ko-ja:2':{answers:[{text:'',on:'2026-10-21',completed:0}]}}}),false);
 assert.equal(validGrowth({version:1,entries:{'ko-ja:2':{answers:[{text:'a',on:'2026-02-31',completed:0}]}}}),false);
 const tooMany=legacyGrowth();tooMany.entries['ko-ja:2'].answers.push({text:'13',on:'2026-10-21',completed:13});assert.equal(validGrowth(tooMany),false);
 assert.equal(validMissions({version:1,items:{'ko-ja':{...savedMission('ja-ko'),text:''}}}),false);
 assert.equal(validMissions({version:1,items:{'ko-ja':{...savedMission('ko-ja'),text:''}}}),false);
 assert.equal(validStudy({'ko-ja':{lessons:{'ko-ja:scenario:2':{completedOn:'2026-10-21',at:-1}}}}),false);
});

test('completion records preserve timestamps and update same-day retakes',()=>{
 const snap=(id,done)=>({lesson_id:`ko-ja:scenario:${id}`,course_direction:'ko-ja',done});
 const first=new Date('2026-10-21T09:00:00'),second=new Date('2026-10-21T10:00:00'),retaken=new Date('2026-10-21T11:00:00');
 let s=recordStudyCompletion(base(),snap(2,false),snap(2,true),first);
 s=recordStudyCompletion(s,snap(3,false),snap(3,true),second);
 assert.deepEqual(s.studyTools['ko-ja'].lessons['ko-ja:scenario:2'],{completedOn:'2026-10-21',at:first.getTime()});
 assert.deepEqual(s.studyTools['ko-ja'].lessons['ko-ja:scenario:3'],{completedOn:'2026-10-21',at:second.getTime()});
 s=recordStudyCompletion(s,snap(2,false),snap(2,true),retaken);
 assert.deepEqual(s.studyTools['ko-ja'].lessons['ko-ja:scenario:2'],{completedOn:'2026-10-21',at:retaken.getTime()});
 assert.equal(s.studyTools['ko-ja'].lessons['ko-ja:scenario:3'].at,second.getTime());
 assert.ok(validStudy(s.studyTools));
 assert.deepEqual(roundTrip(s).studyTools,s.studyTools);
 // Old completion records without timestamps remain compatible.
 const old={'ko-ja':{lessons:{'ko-ja:scenario:9':{completedOn:'2026-10-20'}}}};
 assert.ok(validStudy(old));assert.deepEqual(roundTrip({...base(),studyTools:old}).studyTools,old);
});

test('ready missions still reach community in either language and sharing preserves other saved data',()=>{
 for(const direction of ['ko-ja','ja-ko']){
  const other=direction==='ko-ja'?'ja-ko':'ko-ja';
  const s={...base(direction),growth:legacyGrowth(),missions:{version:1,items:{'ko-ja':savedMission('ko-ja'),'ja-ko':savedMission('ja-ko')}},
   studyTools:{'ko-ja':{lessons:{'ko-ja:scenario:9':{completedOn:'2026-10-21',at:day(21).getTime()}}}},
   history:{version:1,startedOn:'2026-10-20',completed:[],days:{'2026-10-20':{letters:1,expressions:2,sentences:3,cases:0}}},
  };
  const before=structuredClone(s);
  assert.deepEqual(missionForCommunity(s),{text:storedMission(s).text,language:direction==='ja-ko'?'ko':'ja'});
  const next=reduce(s,{type:'mission-shared'},day(22));
  const expected={...before,missions:{version:1,items:{...before.missions.items,[direction]:{...before.missions.items[direction],status:'shared',updatedOn:'2026-10-22'}}}};
  assert.deepEqual(next,expected);
  assert.deepEqual(s,before,'sharing does not mutate the previous state');
  assert.equal(missionForCommunity(next),null);
  assert.deepEqual(storedMission(next,other),before.missions.items[other]);
  assert.equal(missionForCommunity({...next,courseDirection:other}).text,before.missions.items[other].text);
  assert.ok(valid(next));
  const restored=roundTrip(next);
  assert.deepEqual(restored.missions,next.missions);assert.deepEqual(restored.growth,next.growth);
  assert.deepEqual(restored.history,next.history);assert.deepEqual(restored.studyTools,next.studyTools);
  assert.equal(reduce(next,{type:'mission-shared'},day(23)),next,'sharing is idempotent');
 }
});

test('missing, draft, and shared missions are not offered to community or changed by sharing',()=>{
 const states=[base(),...['draft','shared'].map(status=>({...base(),missions:{version:1,items:{'ko-ja':savedMission('ko-ja',status)}}}))];
 for(const s of states){assert.equal(missionForCommunity(s),null);assert.equal(reduce(s,{type:'mission-shared'},day(22)),s);}
 const ready={...base(),missions:{version:1,items:{'ko-ja':savedMission('ko-ja')}}};
 assert.equal(reduceMission(ready,{type:'unrelated'},day(22)),ready);
});

test('records count completed lessons from the active catalog, including videos and expert talks in both directions',async()=>{
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
