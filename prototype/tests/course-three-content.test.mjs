import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { courseThreeCatalog } from '../src/course-three-catalog.js';
import { courseThreeContent } from '../src/course-three-content.js';

const directions = ['ko-ja', 'ja-ko'];
const ids = Array.from({ length: 10 }, (_, i) => `course3-${i + 8}`);

test('level three additions preserve existing slots and fill both languages through 17', () => {
 assert.deepEqual(courseThreeCatalog.map(x => x.id), ids);
 assert.equal(new Set(courseThreeCatalog.map(x => x.id)).size, 10);
 for (const direction of directions) {
  assert.deepEqual(Object.keys(courseThreeContent[direction]), ids);
  assert.deepEqual(courseThreeCatalog.map(x => x.number[direction] + 2), Array.from({ length: 10 }, (_, i) => i + 8));
 }
 for (const meta of courseThreeCatalog) {
  assert.equal(meta.level, 4);
  assert.equal(meta.count, 3);
  assert.equal(meta.extended, true);
  assert.equal(meta.titles.length, 2);
  assert.deepEqual([...meta.answers].sort(), [0, 1, 2]);
 }
});

for (const direction of directions) test(`all level three ${direction} dialogues teach complete source lines before reuse`, () => {
 const taught = new Set();
 const transferPositions = new Set();
 const activities = new Set();
 for (const meta of courseThreeCatalog) {
  const lesson = courseThreeContent[direction][meta.id];
  assert.equal(lesson.mode, 'course-expansion');
  assert.equal(lesson.items.length, meta.count);
  assert.ok(lesson.partner.trim());
  assert.ok(lesson.scene.trim());
  if (lesson.image) assert.ok(existsSync(fileURLToPath(new URL(`../${lesson.image}`, import.meta.url))), lesson.image);
  assert.ok(['dialogue', 'repair', 'reading'].includes(lesson.activity));
  activities.add(lesson.activity);
  for (const item of lesson.items) {
   const label = `${direction} ${meta.id}: ${item.answer}`;
   for (const field of ['text', 'meaning', 'answer', 'answerMeaning', 'prompt', 'learnNote', 'hint']) {
    assert.equal(typeof item[field], 'string', `${label} ${field}`);
    assert.ok(item[field].trim(), `${label} ${field}`);
    assert.ok(!item[field].includes('|'), `${label} contains raw boundary marker`);
   }
   assert.equal(item.phrases.join(''), item.text, label);
   assert.equal(item.answerParts.join(''), item.answer, label);
   assert.ok(item.answerParts.length >= 2 && item.answerParts.length <= 5, label);
   assert.equal(new Set(item.answerParts).size, item.answerParts.length, `${label} duplicate pieces`);
   assert.equal(item.others.length, 2, label);
   assert.equal(new Set([item.answer, ...item.others]).size, 3, `${label} ambiguous duplicate options`);
   assert.ok(!taught.has(item.answer), `${label} repeats another lesson's exact answer`);
   taught.add(item.answer);
   assert.ok(item.words.length > 0, label);
   for (const word of item.words) assert.ok(word.length === 2 && word.every(x => typeof x === 'string' && x.trim()), label);
   const review = item.transfer;
   assert.ok(review.prompt.trim() && review.explanation.trim(), label);
   assert.equal(review.options.length, 3, label);
   assert.equal(new Set(review.options).size, 3, label);
   assert.ok(Number.isInteger(review.answer) && review.answer >= 0 && review.answer < 3, label);
   assert.ok(review.options.every(x => typeof x === 'string' && x.trim()), label);
   transferPositions.add(review.answer);
   if (direction === 'ko-ja') {
    assert.ok(!/[가-힣]/u.test(item.text + item.answer + item.others.join('') + review.options.join('')), label);
    assert.ok(/[가-힣]/u.test(item.meaning + item.prompt + item.learnNote), label);
   } else {
    assert.ok(!/[ぁ-ゖァ-ヺ]/u.test(item.text + item.answer + item.others.join('') + review.options.join('')), label);
    assert.ok(/[ぁ-ゖァ-ヺ]/u.test(item.meaning + item.prompt + item.learnNote), label);
    assert.ok(!item.answer.includes('  '), label);
   }
   assert.equal(item.audioFile, undefined, `${label} must not invent recording paths`);
  }
 }
 assert.deepEqual([...activities].sort(), ['dialogue', 'repair']);
 assert.deepEqual([...transferPositions].sort(), [0, 1, 2]);
 assert.equal(taught.size, 30);
});

test('directions, deadlines and corrections keep one intended answer across languages', () => {
 const jp = courseThreeContent['ko-ja'];
 const ko = courseThreeContent['ja-ko'];
 assert.equal(jp['course3-8'].items[2].answer, '右に曲がったら、左側にあるんですね。');
 assert.equal(ko['course3-8'].items[2].answer, '오른쪽으로 돈 다음에 왼쪽을 보면 되는 거죠?');
 assert.equal(jp['course3-11'].items[1].answer, '魚ではなく、鶏肉の定食を頼みました。');
 assert.equal(ko['course3-11'].items[1].answer, '생선이 아니라 닭고기 정식을 주문했어요.');
 assert.match(jp['course3-16'].items[1].text, /最終入場は四時半/);
 assert.match(jp['course3-16'].items[1].answer, /^四時半までに/);
 assert.match(ko['course3-16'].items[1].text, /마지막 입장은 네 시 반/);
 assert.match(ko['course3-16'].items[1].answer, /^네 시 반까지/);
 for (const content of [jp, ko]) {
  const rule = content['course3-16'].items[0];
  assert.match(rule.transfer.options[rule.transfer.answer], /通話をしなければ|통화를 안 하면/);
 }
 assert.match(ko['course3-17'].items[0].learnNote, /〜이\/가 좋겠어요/);
});


test('level three scenes and source language match the reviewed dialogue', () => {
 for (const direction of directions) {
  const content = courseThreeContent[direction];
  assert.equal(content['course3-13'].image, 'assets/lesson-scenes/shirt-exchange-v1.jpg', 'shirt exchanges use the matching clothing-store image');
  assert.equal(content['course3-16'].activity, 'dialogue');
  assert.match(content['course3-16'].partner, /직원|係員/);
  assert.match(content['course3-9'].scene, /카페|カフェ/);
 }
 assert.equal(courseThreeContent['ja-ko']['course3-10'].items[1].text, '저도 이번 주말에 그 책이 필요해서요.');
 assert.equal(courseThreeContent['ko-ja']['course3-9'].items[1].answer, 'あと10分くらいで着くと思います。');
 assert.deepEqual(courseThreeContent['ja-ko']['course3-16'].items[2].answerParts, ['입장권이 있으면 ', '다시 들어올 수 ', '있는 거죠?']);
});

test('level three accepts natural alternate word order and distributes quiz answers independently', () => {
 const templates = new Set(courseThreeCatalog.map(entry => entry.answers.join('')));
 assert.ok(templates.size >= 5);
 for (const direction of directions) {
  const distribution = [0, 0, 0];
  const transferTemplates = new Set();
  for (const lesson of Object.values(courseThreeContent[direction])) {
   transferTemplates.add(lesson.items.map(item => item.transfer.answer).join(''));
   for (const item of lesson.items) {
    distribution[item.transfer.answer]++;
    if (!item.acceptedOrders) continue;
    const canonical = item.answerParts.map((_, index) => index);
    assert.ok(item.acceptedOrders.some(order => JSON.stringify(order) === JSON.stringify(canonical)));
    for (const order of item.acceptedOrders) assert.deepEqual([...order].sort((a,b) => a-b), canonical);
   }
  }
  assert.deepEqual(distribution, [10, 10, 10]);
  assert.ok(transferTemplates.size >= 5);
 }
 const item = courseThreeContent['ko-ja']['course3-12'].items[1];
 assert.ok(item.acceptedOrders.some(order => order.map(index => item.answerParts[index]).join('') === '持っていくものは何かありますか。'));
 const korean = courseThreeContent['ja-ko']['course3-12'].items[1];
 assert.ok(korean.acceptedOrders.some(order => order.map(index => korean.answerParts[index]).join('') === '가져갈 게 따로 있나요?'));
});
