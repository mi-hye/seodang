import test from 'node:test';
import assert from 'node:assert/strict';
import {guidePages,guideMascot,mountGuide} from '../src/onboarding-guide.js';
import {existsSync} from 'node:fs';
test('every difficulty shares the welcome, proverb and learning flow',()=>{
 assert.ok(existsSync(guideMascot));
 for(const direction of ['ko-ja','ja-ko']){
  const common=guidePages(0,direction);
  assert.deepEqual(common.map(page=>page.type),direction==='ja-ko'?['welcome','culture','story','learn','ready']:['welcome','story','learn','ready']);
  assert.equal(common.find(page=>page.type==='learn').steps.length,3);
  for(let level=0;level<=7;level++)assert.deepEqual(guidePages(level,direction),common);
 }
 assert.match(guidePages(0)[1].title,/서당 개 삼 년이면 풍월을 읊는다/);
 assert.match(guidePages(7,'ja-ko')[1].title,/書堂/);
});

function guideRoot(){
 const listeners=new Map();
 return {innerHTML:'',classList:{toggle(){}},
  ownerDocument:{hidden:false,addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}},
  addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);},listeners};
}
test('guide resumes the current page, moves backwards and stops after disposal',()=>{
 const root=guideRoot(),changes=[];
 const guide=mountGuide(root,0,{initialIndex:3,onChange:page=>changes.push(page)});
 assert.equal(changes.at(-1).last,true);
 assert.equal(guide.next(),false);
 assert.equal(guide.previous(),true);
 assert.equal(changes.at(-1).index,2);
 assert.match(root.innerHTML,/<h2 tabindex="-1">/);
 assert.equal(guide.previous(),true);
 assert.equal(guide.previous(),true);
 assert.equal(guide.previous(),false);
 assert.equal(guide.next(),true);
 guide();
 assert.equal(guide.next(),false);
 assert.equal(guide.previous(),false);
 assert.equal(root.listeners.size,0);
});
test('invalid restored guide positions stay within the walkthrough',()=>{
 for(const [initialIndex,expected] of [[-1,0],[99,3],[NaN,0],[1.5,0]]){
  let current;
  const dispose=mountGuide(guideRoot(),0,{initialIndex,onChange:page=>current=page.index});
  assert.equal(current,expected);dispose();
 }
});

test('next and previous update content without rebuilding the character scene',()=>{
 const root=guideRoot();let html='',writes=0,section;
 const content={innerHTML:''},dots={innerHTML:'',setAttribute(){}};
 Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{html=value;writes++;section={dataset:{}};}});
 root.querySelector=selector=>selector==='.dog-guide'?section:selector==='.guide-content'?content:selector==='.guide-dots'?dots:null;
 const guide=mountGuide(root,0);
 assert.equal(writes,1);
 for(let i=0;i<3;i++)assert.equal(guide.next(),true);
 assert.equal(section.dataset.guideType,'ready');
 assert.match(content.innerHTML,/틀려도 괜찮아/);
 for(let i=0;i<3;i++)assert.equal(guide.previous(),true);
 assert.equal(section.dataset.guideType,'welcome');
 assert.equal(writes,1,'the original scene/canvas must not be discarded on navigation');
 guide();
 // Returning from level selection or BFCache must replace the disposed scene.
 const returnedGuide=mountGuide(root,0,{initialIndex:2});
 assert.equal(writes,2,'a fresh mount must rebuild stale scene markup');
 assert.match(root.innerHTML,/data-guide-type="learn"/);
 assert.equal(returnedGuide.previous(),true);
 assert.equal(writes,2,'navigation within the new mount still preserves its scene');
 guide();
 assert.ok(root.listeners.has('click'),'repeated disposal must not remove the new mount listeners');
 returnedGuide();
});

 test('Japanese introduces seodang before explaining the Korean proverb',()=>{
 const pages=guidePages(0,'ja-ko');
 assert.equal(pages[1].type,'culture');
 assert.match(pages[1].text,/書堂（ソダン）.*昔の韓国.*読み書き/);
 assert.match(pages[1].note,/韓国のことわざ/);
 assert.equal(pages[2].type,'story');
 assert.match(pages[2].text,/という意味/);
 });
