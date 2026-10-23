import test from 'node:test';
import assert from 'node:assert/strict';
import { courseDisplayParts } from '../src/course-expansion-display.js';
import { courseThreeContent } from '../src/course-three-content.js';
import { courseFourContent } from '../src/course-four-content.js';
import { courseFiveContent } from '../src/course-five-content.js';

const courses = [courseThreeContent, courseFourContent, courseFiveContent];
// These cannot be shortened at a natural word/form boundary; 8–9 characters
// are preferable to splitting a conjugation or isolating a quote delimiter.
const intactForms = new Set([
  'いただけますか。', '切りましょうか。', '出かけませんか。',
  '受け取ってから、', '「楽しかった」と', '言い切れません。',
  '集まりましょう。', '手伝いましょうか。', 'かもしれませんね。',
  '減らしましょう。', '決まりましたが、',
]);

test('course display parts preserve all source, answers, assembly tokens, and accepted orders', () => {
  const before = JSON.stringify(courses);
  for (const content of courses) {
    for (const lessons of Object.values(content)) {
      for (const lesson of Object.values(lessons)) {
        for (const item of lesson.items) {
          assert.equal(courseDisplayParts(item.phrases).join(''), item.text);
          assert.equal(courseDisplayParts(item.answerParts).join(''), item.answer);
        }
      }
    }
  }
  assert.equal(JSON.stringify(courses), before);
});

test('long Japanese lesson units have short explicit boundaries or an intact-form exception', () => {
  let shortened = 0;
  for (const content of courses) {
    for (const lesson of Object.values(content['ko-ja'])) {
      for (const item of lesson.items) {
        for (const source of [...item.phrases, ...item.answerParts]) {
          const displayed = courseDisplayParts([source]);
          if (source.length < 8) assert.deepEqual(displayed, [source]);
          else if (!intactForms.has(source)) {
            assert.ok(displayed.length > 1, `missing display boundaries: ${source}`);
            shortened++;
          }
          for (const part of displayed) {
            assert.ok(part.length <= 7 || intactForms.has(part), `overlong display unit: ${part}`);
            assert.ok(!/^[、。！？」』）】]/u.test(part), `isolated closing punctuation: ${part}`);
            assert.ok(!/^[「『（【]$/u.test(part), `isolated opening punctuation: ${part}`);
          }
        }
      }
    }
  }
  assert.ok(shortened >= 100);
});

test('the narrow-screen regression and quoted sentences retain complete meaningful units', () => {
  assert.deepEqual(courseDisplayParts(['本を借りるなら、']), ['本を', '借りるなら、']);
  assert.deepEqual(courseDisplayParts(['この道ではなく、']), ['この道', 'ではなく、']);
  assert.deepEqual(courseDisplayParts(['「窓側が静かだった」と']), ['「窓側が', '静かだった」と']);
  assert.deepEqual(courseDisplayParts(['「自由にしていい」と']), ['「自由に', 'していい」と']);
  assert.deepEqual(courseDisplayParts(['かもしれませんね。']), ['かも', 'しれませんね。']);
});

test('unknown text passes through and frozen caller arrays stay untouched', () => {
  const input = Object.freeze(['本を借りるなら、', '일본어를 배워요.', 'constructor', 'toString']);
  assert.deepEqual(courseDisplayParts(input), ['本を', '借りるなら、', '일본어를 배워요.', 'constructor', 'toString']);
  assert.deepEqual(input, ['本を借りるなら、', '일본어를 배워요.', 'constructor', 'toString']);
});
