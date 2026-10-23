import test from 'node:test';
import assert from 'node:assert/strict';
import {createLessonCompletion,renderLessonComplete} from '../src/lesson-completion.js';
import {freshState} from '../src/engine.js';
const step=(id,done=false)=>({lesson_id:id,done});
function fixture(){
 const counts={played:0,stopped:0,focused:0,centered:0};
 const heading={focus(){counts.focused++;}},screen={querySelector:()=>heading};
 const root={ownerDocument:{hidden:false},querySelector:selector=>selector==='main.practice-complete'?screen:{classList:{add(){counts.centered++;}}}};
 const controller=createLessonCompletion({playSound:settings=>{if(settings.sound!==false)counts.played++;return()=>{counts.stopped++;};}});
 return {root,counts,controller};
}
test('completion is transition-only, once per attempt, and survives same-screen rerenders',()=>{
 const {root,counts,controller:c}=fixture(),before=step('ko-ja:expert:1'),after=step(before.lesson_id,true);
 c.mount(root,after,{sound:true});assert.equal(counts.played,0);
 c.transition(before,after);c.mount(root,after,{sound:true});c.mount(root,after,{sound:true});
 c.transition(after,after);c.mount(root,after,{sound:true});assert.equal(counts.played,1);assert.equal(counts.stopped,0);
 c.cancel();assert.equal(counts.stopped,1);c.mount(root,after,{sound:true});assert.equal(counts.played,1);
 c.transition(before,after);c.mount(root,after,{sound:true});assert.equal(counts.played,2);
});
test('review interception and a different lesson cannot play a completion cue',()=>{
 const {root,counts,controller:c}=fixture();
 c.transition(step('a'),step('a'));c.mount(root,step('a'),{sound:true});
 c.transition(step('a'),step('b',true));c.mount(root,step('b',true),{sound:true});
 assert.equal(counts.played,0);
 c.transition(step('a'),step('a',true));c.mount({...root,querySelector:()=>null},step('a',true),{sound:true});
 c.mount(root,step('a',true),{sound:true});assert.equal(counts.played,0);
});
test('muted and hidden completions stay silent after re-rendering or enabling sound',()=>{
 const {root,counts,controller:c}=fixture(),before=step('a'),after=step('a',true);
 c.transition(before,after);c.mount(root,after,{sound:false});c.mount(root,after,{sound:true});assert.equal(counts.played,0);
 c.cancel();root.ownerDocument.hidden=true;c.transition(before,after);c.mount(root,after,{sound:true});root.ownerDocument.hidden=false;c.mount(root,after,{sound:true});assert.equal(counts.played,0);
 c.transition(before,after);c.mount(root,after,{sound:true});c.mount(root,after,{sound:false});assert.equal(counts.played,1);assert.equal(counts.stopped,2);
});
test('common completion keeps both UI languages, paw, progress and next action',()=>{
 for(const direction of ['ko-ja','ja-ko']){const html=renderLessonComplete({...freshState(),courseDirection:direction},x=>x,true);assert.match(html,/practice-complete/);assert.match(html,/class="button-pair"><button[^>]+data-action="home"/);assert.doesNotMatch(renderLessonComplete({...freshState(),courseDirection:direction},x=>x,false),/class="button-pair"/);assert.match(html,/data-action="completed-next"/);assert.match(html,/aria-valuenow="100"/);assert.match(html,direction==='ja-ko'?/学習が完了しました/:/학습을 완료하셨습니다/);}
});
