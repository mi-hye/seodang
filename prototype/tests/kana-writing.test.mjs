import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWriting,relativePoint,writingMarkup } from '../src/kana-writing.js';
function fixture(id){
 const events=new Map(),buttons={undo:{},clear:{}},captures=new Set();let click;
 const ctx={clearRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},setTransform(){}};
 const canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({left:20,top:30,width:200,height:200}),addEventListener:(t,f)=>events.set(t,f),removeEventListener:t=>events.delete(t),setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
 const box={dataset:{writingLetter:id},querySelector:s=>s==='canvas'?canvas:s.includes('undo')?buttons.undo:buttons.clear,addEventListener:(t,f)=>click=f,removeEventListener:()=>click=null};
 return {root:{querySelector:()=>box},canvas,buttons,events,captures,click(action){click({target:{closest:()=>({dataset:{writing:action}})}});},send(type,extra={}){events.get(type)({type,pointerId:1,isPrimary:true,pointerType:'touch',clientX:30,clientY:40,preventDefault(){},...extra});}};
}
test('writing supports undo/clear, rejects a second finger, releases cancellation and retains per-letter drafts',t=>{
 const Original=globalThis.ResizeObserver;let disconnected=0;
 globalThis.ResizeObserver=class{observe(){}disconnect(){disconnected++;}};
 t.after(()=>globalThis.ResizeObserver=Original);
 const first=fixture('writing-test-a'),dispose=mountWriting(first.root);
 assert.equal(first.buttons.undo.disabled,true);
 first.send('pointerdown');first.send('pointermove',{clientX:90,clientY:120});
 first.send('pointerdown',{pointerId:2,isPrimary:false});
 first.send('pointercancel');assert.equal(first.captures.size,0);
 first.click('undo');assert.equal(first.buttons.clear.disabled,true);
 first.send('pointerdown');first.send('pointerup');dispose();
 assert.equal(first.events.size,0);
 const second=fixture('writing-test-a'),stop=mountWriting(second.root);
 assert.equal(second.buttons.undo.disabled,false);
 second.click('clear');assert.equal(second.buttons.undo.disabled,true);stop();
 assert.equal(disconnected,2);
 assert.deepEqual(relativePoint({clientX:500,clientY:-10},{left:20,top:30,width:200,height:200}),{x:1,y:0});
 assert.match(writingMarkup({id:'a',text:'あ'}),/あ 글자 쓰기 연습장/);
});
