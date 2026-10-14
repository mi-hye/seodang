import { load } from './storage.js';
import { expressions } from './content.js';
let record;
try { record = load(window.localStorage); }
catch { record = { state: null, error: '기록을 읽지 못했어요. 기존 기록은 변경하지 않았습니다.' }; }
const state = record.state;
if (state) {
  const status = document.querySelector('#case-status');
  const link = document.querySelector('#case-link');
  if (state.episode.step === 'summary') {
    status.textContent = '해결한 사건';
    link.innerHTML = '표현 다시 보기 <span aria-hidden="true">→</span>';
    link.href = 'playable.html#review';
  } else if (state.episode.started) {
    status.textContent = '진행 중인 사건';
    link.innerHTML = '이어서 하기 <span aria-hidden="true">→</span>';
  }
  document.querySelector('#expression-count').textContent = state.encountered.length;
  const list = document.querySelector('#expressions');
  for (const id of state.encountered) {
    const item = expressions.find(e => e.id === id);
    if (!item) continue;
    const li = document.createElement('li');
    li.textContent = item.text;
    const translation = document.createElement('span');
    translation.textContent = item.meaning;
    li.append(translation); list.append(li);
  }
  if (list.children.length) {
    list.hidden = false;
    document.querySelector('#learning-copy').textContent = '사건에서 만난 표현을 다시 읽어보세요.';
  }
}
if (record.error) {
  const message = document.querySelector('#storage-message');
  message.textContent = record.error; message.hidden = false;
}
