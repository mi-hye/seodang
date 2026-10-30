import {levelsFor} from '../src/curriculum.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {courseLevels} from '../src/curriculum.js';
import {renderLearningMap,mapNextLesson} from '../src/learning-map.js';
import {MAP_PAGE_SIZE,mapPageWindow} from '../src/learning-map-page.js';
import {mapCatalog,mapPanels,activeMapPage,renderLearningMapPages} from './map-pagination-fixtures.mjs';
import {videoLessons,freshVideo} from '../src/video-lesson-state.js';
import {songLessons} from '../src/song-state.js';

const stateFor=(direction='ko-ja',level=2)=>({...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:level});
const choices=html=>[...html.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"(?: data-id="([^"]+)")?/g)].map(([,kind,id])=>({kind,id}));
const numbers=html=>[...html.matchAll(/<span class="map-number">(\d+)<\/span>/g)].map(match=>Number(match[1]));
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
 const all=levelsFor(direction).flatMap(level=>mapCatalog(stateFor(direction,level)));
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
 assert.deepEqual(numbers(activeMapPage(automatic)),Array.from({length:direction==='ja-ko'?10:6},(_,i)=>11+i));
 assert.match(activeMapPage(automatic),new RegExp(`data-action="video" data-id="${last.id}"[^>]*aria-current="step"`));
 assert.doesNotMatch(activeMapPage(firstPage),/aria-current="step"/);
 for(const html of [automatic,firstPage,lastPage]){
  assert.match(html,new RegExp(`<span>1/${direction==='ja-ko'?23:16}</span>`));
  assert.match(html,new RegExp(`class="map-progress"[^>]*><span style="width:${direction==='ja-ko'?4:6}%"`));
  assert.match(html,/data-action="map-locate"/);
 }
});

test('local preview song slots remain complete and uniquely numbered across both pages',()=>{
 const released=songLessons.map(l=>l.released);
 try{
  for(const song of songLessons)song.released=true;
  for(const direction of ['ko-ja','ja-ko']){
   const state=stateFor(direction),catalog=mapCatalog(state),pages=renderLearningMapPages(state),all=pages.flatMap(choices);
   const total=direction==='ja-ko'?27:20;assert.equal(catalog.length,total);assert.deepEqual(pages.map(html=>choices(html).length),direction==='ja-ko'?[10,10,7]:[10,10]);
   assert.deepEqual(pages.flatMap(numbers),Array.from({length:total},(_,i)=>i+1));
   assert.deepEqual(all.flatMap((l,i)=>l.kind==='song'?[i+1]:[]),direction==='ja-ko'?[7,13,22,27]:[5,10,15,20]);
   assert.deepEqual(all.flatMap((l,i)=>l.kind==='video'?[i+1]:[]),direction==='ja-ko'?[5,8,12,16,25]:[3,6,9,12,18]);
   assert.equal(new Set(all.map(l=>`${l.kind}:${l.id}`)).size,total);
  }
 }finally{songLessons.forEach((song,i)=>song.released=released[i]);}
});
