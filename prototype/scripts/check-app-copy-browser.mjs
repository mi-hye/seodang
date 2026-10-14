import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {freshKana} from '../src/kana-state.js';
import {freshSentence} from '../src/sentence-state.js';
import {freshLabels} from '../src/labels-state.js';
import {freshDialogue} from '../src/dialogue-state.js';
const base=()=>({...freshState(),onboarded:true,onboardingLevel:1,settings:{sound:false,motion:'off',textScale:1.2}});
const kana=freshKana();kana.lessons[0]={...kana.lessons[0],started:true,phase:'reading'};
const cases=[
 ['kana',{...base(),onboardingLevel:0,kana},'듣고 따라 읽어요'],
 ['labels',{...base(),labels:freshLabels()},'그림에 이름표를 붙여요'],
 ['play',{...base(),onboardingLevel:2,episode:{...base().episode,started:true,step:'solved',solved:true}},'창문 옆 파란 가방이에요'],
 ['sentence',{...base(),onboardingLevel:3,sentence:freshSentence()},'가방을 설명하는 세 문장'],
 ['dialogue',{...base(),onboardingLevel:4,dialogue:{...freshDialogue(),started:true,phase:'learn'}},'질문과 답을 들어요'],
];
const browser=await webkit.launch();try{for(const [kind,state,text] of cases){
 const page=await browser.newPage({viewport:{width:320,height:700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f==='src/build-config.js')return r.fulfill({body:'export const developmentMode=true;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),state);
 await page.goto('https://seodang.test/playable.html');await page.locator(`.map-choice[data-action="${kind}"]`).first().click();
 await expect(page.locator(`.view-${kind},.lesson-resume`)).toBeVisible();if(await page.locator('.lesson-resume').count())await page.locator('[data-choice=resume]').click();
 await expect(page.locator('main')).toContainText(text);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.doesNotMatch(await page.locator('main').innerText(),/여러 가방 중 어떤 것이|찾아 주셔서 정말 감사합니다|이름표가 섞였어요|글자를 쓰고 읽고, 카드로 확인/);
 await page.screenshot({path:`/tmp/seodang-copy-${kind}.png`});assert.deepEqual(errors,[]);await page.close();
}console.log('App copy: five learning screens, exact instructions, removed duplicate explanations, narrow large text passed');}finally{await browser.close();}
