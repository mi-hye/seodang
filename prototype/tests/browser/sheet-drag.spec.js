import {test,expect} from '@playwright/test';
test('sheet drag dismisses only downward pulls at the top and restores scroll',async({page})=>{
 await page.route('**/sheet-drag-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
 await page.goto('/sheet-drag-fixture');
 await page.evaluate(async()=>{
  const {showSheet}=await import('/src/sheet.js');
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  document.body.innerHTML='<div style="height:2000px"></div><dialog id="drag-test" style="height:400px;overflow:auto"><h2>설정</h2><input><div style="height:1000px">내용</div></dialog>';
  window.scrollTo(0,200);window.openTestSheet=()=>showSheet(document.querySelector('#drag-test'));window.openTestSheet();
 });
 const sheet=page.locator('#drag-test');
 const drag=async({dx=0,dy=160,cancel=false,target='h2'}={})=>sheet.evaluate((dialog,{dx,dy,cancel,target})=>{
  const node=dialog.querySelector(target),fire=(type,x,y)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:type==='touchend'||type==='touchcancel'?[]:[{clientX:x,clientY:y}]});node.dispatchEvent(event);};
  fire('touchstart',100,100);fire('touchmove',100+dx,100+dy);fire(cancel?'touchcancel':'touchend',100+dx,100+dy);
 },{dx,dy,cancel,target});
 await drag({dy:30});await expect(sheet).toBeVisible();
 await drag({dx:200,dy:160});await expect(sheet).toBeVisible();
 await drag({cancel:true});await expect(sheet).toBeVisible();
 await drag({target:'input'});await expect(sheet).toBeVisible();
 await sheet.evaluate(d=>d.scrollTop=100);await drag();await expect(sheet).toBeVisible();
 await sheet.evaluate(d=>d.scrollTop=0);await drag();await expect(sheet).not.toBeVisible();
 expect(await page.evaluate(()=>document.body.style.position)).not.toBe('fixed');
 await page.evaluate(()=>window.openTestSheet());await drag();await expect(sheet).not.toBeVisible();
});
