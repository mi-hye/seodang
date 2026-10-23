import {test,expect} from '@playwright/test';
import {prepareCourseExpansion,expandedCourseContent,courseVoice} from '../../src/course-expansion-content.js';
import {scenarioAudio} from '../../src/scenario-content.js';

const samples=[{direction:'ko-ja',id:'17'},{direction:'ja-ko',id:'course1-11'},...['ko-ja','ja-ko'].flatMap(direction=>['course3-8','course4-10','course5-12'].map(id=>({direction,id})))];
for(const {direction,id}of samples)test(`bundled course AAC plays with remote network blocked ${direction} ${id}`,async({page})=>{
 if(id!=='17')await prepareCourseExpansion(id);
 const entry=id==='17'?scenarioAudio(direction,id,1):courseVoice(direction,id,'0.answer',expandedCourseContent(direction,id).items[0].answer);
 let catalogRequests=0;
 await page.route('**/assets/audio/catalog.json',route=>{catalogRequests++;return route.abort();});
 await page.route(/^https:\/\//,route=>route.abort());
 // Isolate the real media module from the app's first-run onboarding redirect.
 // Audio and JS are still served by the actual local app server, without mocks.
 await page.route('**/__course-audio-test.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Course audio test</title></head><body></body></html>'}));
 await page.goto('/__course-audio-test.html');
 await page.evaluate(async entry=>{
  const {AudioPlayer}=await import('/src/media.js');
  window.realCourseResult={playing:false,ended:false,errors:[]};
  const player=new AudioPlayer();
  player.onStateChange=state=>{if(state==='playing')window.realCourseResult.playing=true;};
  const button=document.createElement('button');button.id='real-course-audio';button.textContent='Test course recording';button.style.cssText='position:fixed;top:0;left:0;z-index:99999';
  button.onclick=async()=>{
   await player.play(entry,true,message=>window.realCourseResult.errors.push(message));
   window.realCourseResult.duration=player.current?.duration;
   window.realCourseResult.position=player.current?.currentTime;
   window.realCourseResult.source=player.current?.src;
   window.realCourseResult.ended=true;
  };
  document.body.append(button);
 },entry);
 await page.locator('#real-course-audio').click();
 await expect.poll(()=>page.evaluate(()=>window.realCourseResult.ended),{timeout:20000}).toBe(true);
 const result=await page.evaluate(()=>window.realCourseResult);
 expect(result.errors).toEqual([]);expect(result.playing).toBe(true);
 expect(result.duration).toBeGreaterThan(.2);expect(result.position).toBeGreaterThanOrEqual(result.duration-.15);
 expect(result.source).toContain(entry.audioFile);expect(catalogRequests).toBe(0);
});
