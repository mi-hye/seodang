import {webkit} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {practiceCases} from './practice-fixtures.mjs';
import {koreanLessons,freshKoreanProgress} from '../src/korean-state.js';
const cases=practiceCases().filter(([kind])=>kind!=='play');
const koreanBase=cases.find(([kind])=>kind==='korean')[1];
for(const lesson of koreanLessons.slice(1))cases.push(['korean',{...koreanBase,onboardingLevel:lesson.level,korean:{version:2,active:lesson.id,lessons:{[lesson.id]:{...freshKoreanProgress(),started:true}}}}]);
const browser=await webkit.launch();
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}});
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file==='test')return r.fulfill({contentType:'text/html',body:`<html><head>${['style','header','kana','basics','labels','sentences','dialogue','reading','korean','practice','onboarding-guide'].map(name=>`<link rel="stylesheet" href="/src/${name}.css">`).join('')}</head><body><div id="root"></div></body></html>`});try{return r.fulfill({body:readFileSync(file),contentType:(/\.m?js$/.test(file))?'text/javascript':file.endsWith('.css')?'text/css':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.goto('https://seodang.test/test');
 const result=await page.evaluate(async cases=>{
  const renderers={};for(const [kind,file,name] of [['kana','kana','renderKana'],['basic','basics','renderBasic'],['labels','labels','renderLabels'],['listening','labels','renderListening'],['sentence','sentences','renderSentences'],['dialogue','dialogue','renderDialogue'],['reading','reading','renderReading'],['korean','korean','renderKorean']])renderers[kind]=(await import(`/src/${file}.js`))[name];
  const {prepareContent,practiceKey,practiceUnits}=await import('/src/practice-content.js');const {lessonScreens}=await import('/scripts/lesson-screen-fixtures.mjs');const {renderPractice}=await import('/src/practice.js');const root=document.querySelector('#root');let screens=0,rows=0;
  function check(label){screens++;for(const row of root.querySelectorAll('.audio-text-row,.practice-heading,.practice-writing-reference,.sentence-heading,.labels-word,.kana-reading-row')){const button=row.querySelector(':scope>button');if(!button)continue;const text=row.firstElementChild,t=text.getBoundingClientRect(),b=button.getBoundingClientRect();if(b.left<t.right-1||Math.abs((t.top+t.height/2)-(b.top+b.height/2))>2)throw Error(`${label}: speaker not to right of text ${JSON.stringify({text:t.toJSON(),button:b.toJSON(),margin:getComputedStyle(text).margin,buttonMargin:getComputedStyle(button).margin})}`);if(b.right>innerWidth+1)throw Error(`${label}: speaker overflow`);rows++;}if(document.documentElement.scrollWidth>innerWidth)throw Error(`${label}: page overflow ${JSON.stringify([...root.querySelectorAll("*")].filter(x=>x.getBoundingClientRect().right>innerWidth+1).map(x=>[x.tagName,x.className,x.getBoundingClientRect().width]).slice(0,8))}`);}
  for(const [kind,original] of cases){await prepareContent(kind);if(kind==='reading')await (await import('/src/reading.js')).prepareReading(original.onboardingLevel);const s=structuredClone(original);s.settings={...s.settings,textScale:1.2};document.documentElement.lang=s.courseDirection==='ja-ko'?'ja':'ko';document.documentElement.style.setProperty('--text-scale','1.2');
   for(const p of lessonScreens(s,kind)){const progress=kind==='kana'?s.kana.lessons[s.kana.active]:kind==='basic'?s.basics.lessons[s.basics.active]:kind==='korean'?s.korean.lessons[s.korean.active]:kind==='reading'?s.readings[s.onboardingLevel]:s[kind];Object.assign(progress,p);root.innerHTML=renderers[kind](s,()=> '');check(`${kind} ${s.korean?.active} ${p.phase} ${p.index}`);}
   for(const mode of [0,2]){s.practices={[practiceKey(s,kind)]:{round:0,mode,index:0,count:practiceUnits(s,kind).length}};root.innerHTML=renderPractice(s,kind,()=> '');check(`${kind} practice ${mode}`);}
  }
  return {screens,rows};
 },cases);
 assert.ok(result.rows>100);console.log(width,result);await page.screenshot({path:`/tmp/seodang-audio-right-${width}.png`});await page.close();
}}finally{await browser.close();}
