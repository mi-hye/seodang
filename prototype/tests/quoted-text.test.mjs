import test from 'node:test';import assert from 'node:assert/strict';
import {quotedText} from '../src/ui.js';import {lessonExplanation} from '../src/lesson-explanation.js';
test('quoted display keeps spaces and brackets intact and escapes all input',()=>{
 assert.equal(quotedText('「한 장 더」は「もう一枚」です。'),'<span class="quoted-text">「한 장 더」</span>は<span class="quoted-text">「もう一枚」</span>です。');
 assert.equal(quotedText('「<img>」 & "test"'),'<span class="quoted-text">「&lt;img&gt;」</span> &amp; &quot;test&quot;');
 assert.equal(quotedText('「未完了'), '「未完了');assert.equal(quotedText('「一\n二」'),'「一\n二」');
 assert.match(lessonExplanation('「한 장 더」',true),/word-memory-body" lang="ja"/);
});
