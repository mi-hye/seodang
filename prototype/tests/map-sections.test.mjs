import test from 'node:test';import assert from 'node:assert/strict';
import {mapLessonSections,mapSectionWindow} from '../src/learning-map-page.js';
import {mapCourseLessons,mapNextLesson} from '../src/learning-map.js';
import {renderLessonComplete} from '../src/lesson-completion.js';
import {freshState} from '../src/engine.js';
import {completeMapLesson} from './completed-lesson-fixtures.mjs';
test('ten regular lessons keep trailing comparisons before the next section',()=>{
 const lessons=Array.from({length:21},(_,i)=>({id:i,complete:false}));lessons.splice(10,0,{id:'specialA',supplementary:true},{id:'specialB',supplementary:true});
 const before=structuredClone(lessons),sections=mapLessonSections(lessons);
 assert.deepEqual(sections.map(c=>c.regularCount),[10,10,1]);assert.deepEqual(sections.map(c=>c.lessons.map(l=>l.id)),[[0,1,2,3,4,5,6,7,8,9,'specialA','specialB'],[10,11,12,13,14,15,16,17,18,19],[20]]);
 assert.equal(mapSectionWindow(lessons,11).currentPage,0);assert.equal(mapSectionWindow(lessons,12).currentPage,1);assert.deepEqual(lessons,before);
 assert.equal(mapSectionWindow([],0).pageCount,1);assert.equal(mapSectionWindow(lessons,20,99).page,2);
});
for(const direction of ['ko-ja','ja-ko'])test(`${direction} completing a reviewed lesson still opens its immediate successor`,()=>{
 const s={...freshState(),courseDirection:direction,onboardingLevel:4};const lessons=mapCourseLessons(s);
 lessons.forEach(l=>completeMapLesson(s,l));
 for(const i of [0,8,9]){const next=mapNextLesson(s,lessons[i].action,lessons[i].id);assert.equal(next.id,lessons[i+1].id);assert.equal(next.action,lessons[i+1].action);}
 const html=renderLessonComplete(s,x=>x,true);assert.doesNotMatch(html,/챕터|チャプター|次の章へ/);assert.match(html,direction==='ja-ko'?/次のレッスン/:/다음 수업/);
});
