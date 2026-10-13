import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioPlayer, audioManifest } from '../src/media.js';
import { audioButton, icon } from '../src/ui.js';
const entry = {...audioManifest['case01.blue-bag.ja'],status:'device-tts',audioFile:null};
test('device speech receives Japanese text, honors mute and stops before speaking', async () => {
  const calls = [];
  const player = new AudioPlayer(undefined, {
    stop() { calls.push('stop'); },
    speak(item) { calls.push([item.text, item.locale]); },
  });
  await player.play(entry, false, assert.fail);
  assert.deepEqual(calls, ['stop']);
  await player.play(entry, true, assert.fail);
  assert.deepEqual(calls.slice(-2), ['stop', ['あおい かばん', 'ja-JP']]);
  await player.stop(); assert.equal(calls.at(-1), 'stop');
  assert.match(audioButton(entry.id, true), /data-action="audio"/);
  assert.match(audioButton(entry.id, false), /disabled/);
  assert.match(icon('settings'), /3.5/);
});
test('rapid requests only start the latest utterance and errors are recoverable', async () => {
  let spoken = [], errors = [];
  const player = new AudioPlayer(undefined, { stop() {}, speak(e) { spoken.push(e.text); } });
  await Promise.all([player.play(entry, true, assert.fail), player.play({ ...entry, text: 'まどの そば' }, true, assert.fail)]);
  assert.deepEqual(spoken, ['まどの そば']);
  const failing = new AudioPlayer(undefined, { stop() {}, speak() { throw Error('No voice'); } });
  await failing.play(entry, true, e => errors.push(e));
  assert.equal(errors.length, 1);
});
