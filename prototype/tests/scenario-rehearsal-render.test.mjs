import test from 'node:test';
import assert from 'node:assert/strict';
import {renderScenarioRehearsal} from '../src/scenario-rehearsal.js';
import {renderPractice,practiceState} from '../src/practice.js';
import {prepareContent} from '../src/practice-content.js';
import {scenarioRehearsal} from '../src/scenario-rehearsal-content.js';
import {scenarioContent} from '../src/scenario-content.js';
import {renderScenario} from '../src/scenario.js';
import {freshScenario} from '../src/scenario-state.js';
import {reviewFixture} from './level-two-review-fixtures.mjs';
import {esc} from '../src/ui.js';

const keys=['ko-ja','ja-ko'].flatMap(direction=>['14','15','16','17'].map(id=>`${direction}:scenario:${id}`));
const plain=html=>html.replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|#39);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[entity]);
const top=title=>`<header>${esc(title)}</header>`;
const practice=(action,index=0)=>({version:1,caseVersion:2,round:0,mode:0,index,count:3,action});
await prepareContent('scenario');

for(const key of keys)test(`rehearsal rendering routes three turns without exposing their answer or future dialogue: ${key}`,()=>{
 const {s,action}=reviewFixture(key),tasks=scenarioRehearsal(key),lang=s.courseDirection==='ko-ja'?'ja':'ko',ui=lang==='ja'?'ko':'ja';
 const original=structuredClone(s);
 for(const [index,t]of tasks.entries()){
  const p=practice(action,index),state={...s,practices:{[key]:p}},html=renderPractice(state,'scenario',top);
  assert.equal(html,renderScenarioRehearsal(state,t,p,top));
  assert.match(html,new RegExp(`<main class="page practice-page scenario-rehearsal" lang="${ui}">`));
  assert.doesNotMatch(html,/introduction-review|review-word-grid|data-review-choice|data-review-undo/);
  const result=html.match(/<section class="review-result" hidden>([\s\S]*?)<\/section>/);
  assert.ok(result,'the current answer and follow-up belong in the hidden result');
  const unanswered=html.replace(result[0],'');
  assert.doesNotMatch(unanswered,/data-rehearsal-audio="(?:answer|reply)"/);
  assert.equal(plain(html.match(/<p[^>]*data-rehearsal-prompt[^>]*>([\s\S]*?)<\/p>/)[1]),t.item.text);
  const resultLines=[...result[1].matchAll(new RegExp(`<p lang="${lang}"[^>]*>([\\s\\S]*?)<\\/p>`,'g'))].map(match=>plain(match[1]));
  assert.deepEqual(resultLines,[t.item.answer,...(t.item.reply?[t.item.reply]:[])]);
  const meanings=[...result[1].matchAll(/<p class="dialogue-meaning"[^>]*>([\s\S]*?)<\/p>/g)].map(match=>plain(match[1]));
  assert.deepEqual(meanings,[t.item.answerMeaning,...(t.item.reply?[t.item.replyMeaning]:[])]);
  assert.equal(plain(result[1].match(/<p class="rehearsal-explanation">([\s\S]*?)<\/p>/)[1]),t.item.hint);
  const history=html.match(/<details class="rehearsal-history" data-rehearsal-history>([\s\S]*?)<\/details>/);
  assert.equal(Boolean(history),index>0);
  const pastAudio=[...(history?.[1]||'').matchAll(/data-rehearsal-audio="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(pastAudio,t.previous.flatMap(turn=>[`${turn.index}:prompt`,`${turn.index}:answer`,...(turn.item.reply?[`${turn.index}:reply`]:[])]));
  if(history){
   const pastLines=[...history[1].matchAll(new RegExp(`<p lang="${lang}"[^>]*>([\\s\\S]*?)<\\/p>`,'g'))].map(match=>plain(match[1]));
   assert.deepEqual(pastLines,t.previous.flatMap(turn=>[turn.item.text,turn.item.answer,...(turn.item.reply?[turn.item.reply]:[])]));
  }
  const choices=[...html.matchAll(/data-review-token="(\d+)"/g)].map(match=>Number(match[1]));
  assert.deepEqual(choices,t.tokenOrder);
  assert.match(html,/<div class="token-builder-answer [^"]*" role="group" data-review-answer aria-label="[^"]+" aria-live="polite"><\/div>/);
  assert.match(html,/<button type="button" class="primary" data-review-confirm disabled>/);
  if(t.sceneContent.weather){
   assert.match(html,/<details data-rehearsal-transcript>/);
   assert.doesNotMatch(html,/<details[^>]*data-rehearsal-transcript[^>]*\bopen\b/);
   assert.match(html.match(/<details data-rehearsal-transcript>([\s\S]*?)<\/details>/)[1],/data-rehearsal-prompt/);
  }else assert.doesNotMatch(html,/data-rehearsal-transcript/);
 }
 assert.deepEqual(s,original,'rendering cannot change saved progress');
});

for(const key of keys)test(`contextual learning preserves both sides of each exchange: ${key}`,()=>{
 const {s,id}=reviewFixture(key),source=scenarioContent[s.courseDirection][id],lang=s.courseDirection==='ko-ja'?'ja':'ko';
 for(const [index,item]of source.items.entries()){
  const state={...s,scenarios:{[key]:{...freshScenario(id),started:true,index,phase:'learn'}}},before=structuredClone(state);
  const html=renderScenario(state,top);
  assert.equal(plain(html.match(/<p data-model-prompt[^>]*>([\s\S]*?)<\/p>/)[1]),item.text);
  assert.equal(plain(html.match(/<p data-model-answer[^>]*>([\s\S]*?)<\/p>/)[1]),item.answer);
  assert.deepEqual([...html.matchAll(/<p class="(?:dialogue-meaning|case-lesson-meaning)">([\s\S]*?)<\/p>/g)].map(match=>plain(match[1])),[item.meaning,item.answerMeaning]);
  assert.match(html,new RegExp(`data-model-prompt lang="${lang}"`));
  assert.match(html,new RegExp(`data-model-answer lang="${lang}"`));
  assert.deepEqual([...html.matchAll(/data-action="scenario-audio"[^>]*data-id="([^"]+)"/g)].map(match=>match[1]),['prompt','answer']);
  assert.doesNotMatch(html,/data-action="scenario-select"|data-action="scenario-check"|data-choice-audio|data-id="reply"/);
  assert.deepEqual(state,before);
 }
});

test('legacy twelve-step review renders the new first turn while preserving the source record',()=>{
 for(const key of keys){
  const {s,action}=reviewFixture(key),old={...s,practices:{[key]:{...practice(action),caseVersion:1,count:12,index:11}}},before=structuredClone(old);
  const p=practiceState(old,'scenario');assert.equal(p.count,3);assert.equal(p.caseVersion,2);assert.equal(p.index,0);
  const html=renderPractice(old,'scenario',top);
  assert.equal(html,renderScenarioRehearsal(old,scenarioRehearsal(key)[0],p,top));
  assert.doesNotMatch(html,/data-rehearsal-history/);
  assert.deepEqual(old,before);
 }
});

test('earlier scenario reviews retain the picture-word renderer',()=>{
 for(const direction of ['ko-ja','ja-ko'])for(const id of ['2','13']){
  const key=`${direction}:scenario:${id}`,{s,action}=reviewFixture(key);
  const html=renderPractice({...s,practices:{[key]:{...practice(action),caseVersion:1,count:12}}},'scenario',top);
  assert.match(html,/introduction-review/);assert.match(html,/review-word-grid/);
  assert.doesNotMatch(html,/scenario-rehearsal|data-rehearsal-audio/);
 }
});
