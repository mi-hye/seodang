import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGuide,guidePages,guideMascot} from '../src/onboarding-guide.js';
import {existsSync} from 'node:fs';
test('mascot dialogue advances only on next, goes back, and stops after disposal',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const root={innerHTML:''},changes=[];
 const guide=mountGuide(root,1,{onChange:state=>changes.push(state)});
 assert.match(root.innerHTML,/히라가나를 순서대로/);assert.ok(existsSync(guideMascot));
 const first=root.innerHTML;t.mock.timers.tick(60000);assert.equal(root.innerHTML,first);
 assert.equal(guide.previous(),false);assert.equal(guide.next(),true);assert.match(root.innerHTML,/듣고, 보고/);
 assert.equal(guide.previous(),true);assert.equal(root.innerHTML,first);
 guide.next();assert.match(root.innerHTML,/손가락으로 따라/);guide.next();assert.match(root.innerHTML,/카드의 짝을/);assert.equal(changes.at(-1).last,true);assert.equal(guide.next(),false);
 guide();assert.equal(guide.previous(),false);assert.equal(guide.next(),false);
 assert.doesNotMatch(root.innerHTML,/<video|guide-player|재생|건너뛰기/);
});
test('each level explains its actual mechanics and first case without promising unavailable levels',()=>{
 assert.match(guidePages(2)[2].text,/메모에 적힌 색과 위치/);
 assert.match(guidePages(3)[1].text,/순서대로/);assert.match(guidePages(3)[2].text,/단서/);
 for(const level of [1,2,3])assert.equal(guidePages(level).length,3);
 assert.match(guidePages(4)[0].title,/주문/);assert.match(guidePages(5)[0].title,/핵심/);assert.doesNotMatch(JSON.stringify(guidePages(6)),/[가-힣]/);
 for(const level of [1,2,3])assert.doesNotMatch(JSON.stringify(guidePages(level)),/풍월|설정|학습 지도|버튼을 직접|아오이|가방을 찾아/);
});
