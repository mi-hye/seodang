import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {courseLevels} from '../src/curriculum.js';
import {renderLearningMap,mapPageForLesson,mapNextLesson} from '../src/learning-map.js';
import {MAP_PAGE_SIZE,MAP_PAGES_STORAGE_KEY,mapPageKey,mapPageWindow,loadMapPages,saveMapPages} from '../src/learning-map-page.js';
import {mapCatalog,mapPanels,activeMapPage,renderLearningMapPages} from './map-pagination-fixtures.mjs';
import {videoLessons,freshVideo} from '../src/video-lesson-state.js';
import {songLessons} from '../src/song-state.js';
import {STORAGE_KEY,load,valid} from '../src/storage.js';

const stateFor=(direction='ko-ja',level=2)=>({...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:level});
const choices=html=>[...html.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"(?: data-id="([^"]+)")?/g)].map(([,kind,id])=>({kind,id}));
const numbers=html=>[...html.matchAll(/<span class="map-number">(\d+)<\/span>/g)].map(match=>Number(match[1]));
const memory=initial=>{const entries=new Map(Object.entries(initial||{}));return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};};
test('ten-lesson windows handle empty lists, exact boundaries and incomplete final pages',()=>{
 assert.equal(MAP_PAGE_SIZE,10);
 for(const [total,current,requested,expected]of [
  [0,-1,undefined,{page:0,pageCount:1,start:0,end:0,currentPage:0}],
  [1,0,undefined,{page:0,pageCount:1,start:0,end:1,currentPage:0}],
  [10,9,undefined,{page:0,pageCount:1,start:0,end:10,currentPage:0}],
  [11,10,undefined,{page:1,pageCount:2,start:10,end:11,currentPage:1}],
  [20,19,undefined,{page:1,pageCount:2,start:10,end:20,currentPage:1}],
  [21,20,undefined,{page:2,pageCount:3,start:20,end:21,currentPage:2}],
  [30,28,0,{page:0,pageCount:3,start:0,end:10,currentPage:2}],
  [30,-1,2,{page:2,pageCount:3,start:20,end:30,currentPage:0}],
  [14,0,999,{page:1,pageCount:2,start:10,end:14,currentPage:0}],
  [14,999,undefined,{page:1,pageCount:2,start:10,end:14,currentPage:1}],
 ])assert.deepEqual(mapPageWindow(total,current,requested),expected);
 for(const requested of [-1,1.5,'1',null,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(mapPageWindow(30,22,requested).page,2);
 for(const total of [-1,1.5,NaN,Infinity,'30'])assert.deepEqual(mapPageWindow(total,22,2),{page:0,pageCount:1,start:0,end:0,currentPage:0});
});

test('page memories are independent per language and canonical level',()=>{
 const keys=[];
 for(const direction of ['ko-ja','ja-ko'])for(const level of courseLevels)keys.push(mapPageKey(stateFor(direction,level)));
 assert.equal(new Set(keys).size,10);
 assert.equal(mapPageKey(stateFor('ko-ja',6)),'ko-ja:5');
 for(const level of [1,3])assert.equal(mapPageKey(stateFor('ja-ko',level)),'ja-ko:2');
 assert.equal(mapPageKey(freshState()),'ko-ja:0');
 assert.equal(mapPageKey({...freshState(),onboarded:true}),'ko-ja:2');
});

test('page preferences persist separately without changing lessons, history or review dates',()=>{
 let state=stateFor();state.studyTools={'ko-ja':{lessons:{'ko-ja:sentence:3':{completedOn:'2026-10-22'}}}};
 const original=structuredClone(state),raw=JSON.stringify(state),storage=memory({[STORAGE_KEY]:raw});
 const pages={'ko-ja:0':2,'ko-ja:2':1,'ja-ko:2':0};
 assert.equal(saveMapPages(storage,pages),true);assert.equal(storage.getItem(STORAGE_KEY),raw);
 assert.deepEqual(loadMapPages(storage),pages);assert.deepEqual(state,original);assert.ok(valid(load(storage).state));
 state=reduce(state,{type:'course',value:'ja-ko'});state=reduce(state,{type:'level',value:2});
 assert.equal(loadMapPages(storage)[mapPageKey(state)],0);
 state=reduce(state,{type:'course',value:'ko-ja'});assert.equal(loadMapPages(storage)[mapPageKey(state)],1);
 assert.deepEqual(state.studyTools,original.studyTools);
});

test('malformed page preferences and storage failures cannot block lesson progress',()=>{
 for(const raw of ['bad JSON','null','[]','1','"page"'])assert.deepEqual(loadMapPages(memory({[MAP_PAGES_STORAGE_KEY]:raw})),{});
 const pages={'ko-ja:0':2,'ja-ko:7':0,'ja-ko:5':99,'ko-ja:1':1,'ko-ja:6':1,'xx:2':1,'ko-ja:2':-1,'ja-ko:2':1.5,'ko-ja:4':'1','ko-ja:7':Number.MAX_SAFE_INTEGER+1};
 const storage=memory();assert.equal(saveMapPages(storage,pages),true);assert.deepEqual(loadMapPages(storage),{'ko-ja:0':2,'ja-ko:7':0,'ja-ko:5':99});
 for(const unavailable of [undefined,null,{getItem(){throw Error('blocked');},setItem(){throw Error('full');}}]){assert.deepEqual(loadMapPages(unavailable),{});assert.equal(saveMapPages(unavailable,pages),false);}
 assert.equal(mapPageWindow(7,-1,loadMapPages(storage)['ja-ko:5']).page,0,'saved pages clamp if the catalogue shrinks');
});

for(const direction of ['ko-ja','ja-ko'])test(`${direction}: every stable lesson key resolves to its page in each level`,()=>{
 const otherDirection=direction==='ko-ja'?'ja-ko':'ko-ja';
 for(const level of courseLevels){
  const state=stateFor(direction,level),before=structuredClone(state),catalog=mapCatalog(state);
  for(const [index,lesson]of catalog.entries()){
   assert.equal(mapPageForLesson(state,lesson.key),Math.floor(index/MAP_PAGE_SIZE),lesson.key);
   assert.equal(mapPageForLesson(state,`${otherDirection}:${lesson.kind}:${lesson.id}`),undefined,'other course keys cannot select a page');
  }
  for(const key of [undefined,null,'',`${direction}:scenario:missing`,`${direction}:unknown:0`])assert.equal(mapPageForLesson(state,key),undefined);
  assert.deepEqual(state,before);
 }
});

test('the dialogue without a button ID resolves only through its stable zero ID',()=>{
 const state=stateFor('ko-ja',4);
 assert.equal(mapPageForLesson(state,'ko-ja:dialogue:0'),0);
 for(const key of ['ko-ja:dialogue:','ko-ja:dialogue:undefined','ko-ja:dialogue:1','ja-ko:dialogue:0'])assert.equal(mapPageForLesson(state,key),undefined);
 assert.equal(mapPageForLesson(stateFor('ko-ja',2),'ko-ja:dialogue:0'),undefined,'a lesson from another level cannot select this map');
});

for(const direction of ['ko-ja','ja-ko'])for(const level of courseLevels)test(`${direction} level ${level}: pages preserve every lesson and its absolute number`,()=>{
 const state=stateFor(direction,level),before=structuredClone(state),catalog=mapCatalog(state),pages=renderLearningMapPages(state);
 assert.equal(pages.length,Math.ceil(catalog.length/10));
 const all=[];
 for(const [page,html]of pages.entries()){
  const expected=catalog.slice(page*10,page*10+10);
  const shown=choices(html);assert.equal(shown.length,expected.length);assert.ok(shown.length<=10);
  assert.deepEqual(shown,expected.map(l=>({kind:l.kind,id:l.kind==='dialogue'?undefined:String(l.id)})));
  assert.deepEqual(numbers(html),expected.map((_,i)=>page*10+i+1));
  assert.equal(/map-coming-soon/.test(html),level!==0&&page===pages.length-1,'only the final non-alphabet page offers coming soon');
  assert.match(html,new RegExp(`data-page-index="${page}" data-page-count="${pages.length}"`));
  all.push(...shown);
 }
 assert.equal(new Set(all.map(l=>`${l.kind}:${l.id}`)).size,catalog.length);
 assert.deepEqual(state,before);
});

for(const direction of ['ko-ja','ja-ko'])test(`${direction}: only the requested section is rendered without range navigation`,()=>{
 const state=stateFor(direction),count=Math.ceil(mapCatalog(state).length/10);
 for(let page=0;page<count;page++){
  const html=renderLearningMap(state,{page}),panels=mapPanels(html);
  assert.equal(panels.length,1);
  assert.match(panels[0],new RegExp(`data-map-page="${page}"`));
  assert.ok(choices(panels[0]).length<=10);
  assert.doesNotMatch(html,/map-section-heading|map-carousel|map-dots|aria-expanded|data-action="map-page"/);
 }
});

for(const direction of ['ko-ja','ja-ko'])test(`${direction}: next lesson matches all map positions and crosses level boundaries`,()=>{
 const all=courseLevels.flatMap(level=>mapCatalog(stateFor(direction,level)));
 all.forEach((lesson,index)=>{
  const state=stateFor(direction,lesson.level),next=mapNextLesson(state,lesson.kind,lesson.id),expected=all[index+1];
  if(!expected){assert.equal(next,null);return;}
  assert.equal(next.action,expected.kind,lesson.key);assert.equal(String(next.id??0),String(expected.id),lesson.key);assert.equal(next.level,expected.level,lesson.key);
 });
});

for(const direction of ['ko-ja','ja-ko'])test(`${direction}: current lesson determines the initial page while an explicit page preserves global completion`,()=>{
 const state=stateFor(direction),videos=videoLessons.filter(l=>l.direction===direction&&l.level===2),first=videos.find(l=>l.number===3),last=videos.find(l=>l.number===12);
 state.videoActive=last.id;state.videoLessons={
  [first.id]:{...freshVideo(first.revision,first.mode),started:true,completed:true,phase:'done'},
  [last.id]:{...freshVideo(last.revision,last.mode),started:true}
 };
 const automatic=renderLearningMap(state),firstPage=renderLearningMap(state,{page:0}),lastPage=renderLearningMap(state,{page:1});
 assert.deepEqual(numbers(activeMapPage(automatic)),[11,12,13,14]);
 assert.match(activeMapPage(automatic),new RegExp(`data-action="video" data-id="${last.id}"[^>]*aria-current="step"`));
 assert.doesNotMatch(activeMapPage(firstPage),/aria-current="step"/);
 for(const html of [automatic,firstPage,lastPage]){
  assert.match(html,/<span>1\/14<\/span>/);
  assert.match(html,/class="map-progress"[^>]*><span style="width:7%"/);
  assert.match(html,/data-action="map-locate"/);
 }
});

test('local preview song slots remain complete and uniquely numbered across both pages',()=>{
 const released=songLessons.map(l=>l.released);
 try{
  for(const song of songLessons)song.released=true;
  for(const direction of ['ko-ja','ja-ko']){
   const state=stateFor(direction),catalog=mapCatalog(state),pages=renderLearningMapPages(state),all=pages.flatMap(choices);
   assert.equal(catalog.length,17);assert.deepEqual(pages.map(html=>choices(html).length),[10,7]);
   assert.deepEqual(pages.flatMap(numbers),Array.from({length:17},(_,i)=>i+1));
   assert.deepEqual(all.flatMap((l,i)=>l.kind==='song'?[i+1]:[]),[5,10,15]);
   assert.deepEqual(all.flatMap((l,i)=>l.kind==='video'?[i+1]:[]),[3,6,9,12]);
   assert.equal(new Set(all.map(l=>`${l.kind}:${l.id}`)).size,17);
   for(const [index,lesson]of catalog.entries())assert.equal(mapPageForLesson(state,lesson.key),Math.floor(index/MAP_PAGE_SIZE),lesson.key);
  }
 }finally{songLessons.forEach((song,i)=>song.released=released[i]);}
});
