import test from 'node:test';import assert from 'node:assert/strict';
import {quizSets,quizRoute,quizShareText,publicQuizURL,quizInvitationURL} from '../src/share-quiz-content.js';
test('unknown query data never becomes displayed content or a shared URL parameter',()=>{
 const route=quizRoute('?direction=unknown&q=<script>&answer=secret');assert.equal(route.direction,'ko-ja');assert.equal(route.quiz.id,'soft-request');
 const url=publicQuizURL('https://example.com/quiz.html?answer=private#private','ja-ko','soft-request');assert.equal(url,'https://example.com/quiz.html?direction=ja-ko&q=soft-request');
});
test('app-local and local-preview URLs are never shared',()=>{for(const url of ['capacitor://localhost/quiz.html','http://localhost:4173/quiz.html','https://localhost/quiz.html','https://com.mihye.seodang/quiz.html','https://127.0.0.1/quiz.html'])assert.equal(publicQuizURL(url,'ko-ja','soft-request'),null);});
test('quiz invitation omits answer and explanation and is bilingual',()=>{for(const direction of Object.keys(quizSets))for(const q of quizSets[direction]){const text=quizShareText(direction,q);assert.ok(text.includes(q.line));assert.ok(!text.includes(q.explanation));assert.equal(q.options.length,3);assert.ok(q.options[q.answer]);}});

test('native app invitations use the deployed public question URL',()=>{assert.equal(quizInvitationURL('capacitor://localhost/quiz.html?private=secret','ja-ko','gentle-decline'),'https://mi-hye.github.io/seodang/quiz.html?direction=ja-ko&q=gentle-decline');});
