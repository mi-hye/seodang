import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {courseFourCatalog} from '../src/course-four-catalog.js';
import {courseFourContent} from '../src/course-four-content.js';

const directions = ['ko-ja', 'ja-ko'];
const visibleNumbers = Array.from({length: 10}, (_, index) => index + 8);
const ids = visibleNumbers.map(number => `course4-${number}`);
const uiLetters = {'ko-ja': /[가-힣]/, 'ja-ko': /[ぁ-んァ-ヶ一-龠]/};
const targetLetters = {'ko-ja': /[ぁ-んァ-ヶ一-龠]/, 'ja-ko': /[가-힣]/};

test('level four adds paired lessons 8–17 after the two existing video slots', () => {
  assert.deepEqual(courseFourCatalog.map(entry => entry.id), ids);
  for (const [index, entry] of courseFourCatalog.entries()) {
    assert.equal(entry.level, 5);
    assert.equal(entry.count, 3);
    assert.equal(entry.extended, true);
    assert.equal(entry.titles.length, 2);
    for (const direction of directions) assert.equal(entry.number[direction] + 2, visibleNumbers[index]);
    assert.deepEqual([...entry.answers].sort(), [0, 1, 2]);
  }
  assert.equal(new Set(courseFourCatalog.flatMap(entry => entry.titles)).size, 20);
});

for (const direction of directions) {
  test(`level four ${direction} has complete teaching, assembly, and transfer content`, () => {
    assert.deepEqual(Object.keys(courseFourContent[direction]), ids);
    const allAnswers = [];
    const transferPositions = [0, 0, 0];
    for (const entry of courseFourCatalog) {
      const lesson = courseFourContent[direction][entry.id];
      assert.equal(lesson.mode, 'course-expansion');
      assert.ok(['dialogue', 'repair', 'reading'].includes(lesson.activity));
      assert.match(lesson.scene, uiLetters[direction]);
      assert.match(lesson.partner, uiLetters[direction]);
      assert.equal(lesson.items.length, entry.count);
      if (lesson.image) {
        assert.ok(lesson.image.startsWith('assets/'));
        assert.ok(existsSync(fileURLToPath(new URL(`../${lesson.image}`, import.meta.url))), lesson.image);
      }
      for (const [index, item] of lesson.items.entries()) {
        const label = `${direction}:${entry.id}:${index}`;
        assert.match(item.text, targetLetters[direction], label);
        assert.ok(!item.text.includes('|'), label);
        assert.equal(item.phrases.join(''), item.text, label);
        if (direction === 'ko-ja') assert.ok(item.phrases.length > 1, `${label}: Japanese phrase boundaries`);
        for (const field of ['meaning', 'answerMeaning', 'prompt', 'learnNote', 'hint']) {
          assert.match(item[field], uiLetters[direction], `${label}:${field}`);
        }
        assert.match(item.answer, targetLetters[direction], label);
        assert.equal(item.answerParts.join(''), item.answer, `${label}: exact assembly`);
        assert.ok(item.answerParts.length >= 3 && item.answerParts.length <= 5, label);
        assert.ok(item.answerParts.every(part => part.trim().length > 0), label);
        assert.equal(item.others.length, 2, label);
        const quizOptions = [item.answer, ...item.others];
        assert.equal(new Set(quizOptions).size, 3, `${label}: unique lesson options`);
        assert.ok(quizOptions.every(option => targetLetters[direction].test(option)), label);
        assert.ok(item.words.length >= 2, label);
        for (const word of item.words) {
          assert.equal(word.length, 2, label);
          assert.match(word[0], targetLetters[direction], label);
          assert.match(word[1], uiLetters[direction], label);
        }
        assert.match(item.transfer.prompt, uiLetters[direction], label);
        assert.match(item.transfer.explanation, uiLetters[direction], label);
        assert.equal(item.transfer.options.length, 3, label);
        assert.equal(new Set(item.transfer.options).size, 3, `${label}: unique transfer options`);
        assert.ok(item.transfer.options.every(option => targetLetters[direction].test(option)), label);
        assert.ok([0, 1, 2].includes(item.transfer.answer), label);
        assert.notEqual(item.transfer.options[item.transfer.answer], item.answer, `${label}: new usage context`);
        transferPositions[item.transfer.answer]++;
        allAnswers.push(item.answer);
      }
    }
    assert.equal(new Set(allAnswers).size, 30, 'each turn teaches its own response');
    assert.deepEqual(transferPositions, [10, 10, 10], 'transfer answers are distributed across all positions');
    assert.deepEqual(new Set(Object.values(courseFourContent[direction]).map(lesson => lesson.activity)), new Set(['reading', 'dialogue', 'repair']));
  });
}


test('level four accepts natural alternate clause order without losing any pieces', () => {
 for (const direction of directions) {
  for (const [id, index] of [['course4-8',0],['course4-11',0],['course4-11',1],['course4-11',2],['course4-12',0],['course4-12',1],['course4-15',2],['course4-16',1],['course4-17',1]]) {
   const item = courseFourContent[direction][id].items[index];
   const canonical = item.answerParts.map((_, position) => position);
   assert.ok(item.acceptedOrders.length >= 2, `${direction}:${id}:${index}`);
   assert.ok(item.acceptedOrders.some(order => JSON.stringify(order) === JSON.stringify(canonical)));
   for (const order of item.acceptedOrders) assert.deepEqual([...order].sort((a,b) => a-b), canonical);
  }
 }
 const item = courseFourContent['ja-ko']['course4-12'].items[1];
 assert.ok(item.acceptedOrders.some(order => order.map(index => item.answerParts[index]).join('') === '처음부터 문제가 있었다면 포장을 뜯었어도 교환할 수 있어요.'));
});

test('level four keeps varied answer schedules independent from transfer choices', () => {
 assert.ok(new Set(courseFourCatalog.map(entry => entry.answers.join(''))).size >= 5);
 for (const direction of directions) {
  const templates = courseFourCatalog.map(entry => courseFourContent[direction][entry.id].items.map(item => item.transfer.answer).join(''));
  assert.ok(new Set(templates).size >= 5);
  assert.notDeepEqual(templates, courseFourCatalog.map(entry => entry.answers.join('')));
 }
});
