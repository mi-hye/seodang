import {esc,button,quotedText} from './ui.js';
import {t} from './i18n.js';
import {scheduledReviews} from './study-state.js';
export {studyCatalog} from './study-catalog.js';
const japanese={
 '수업을 마친 뒤 3일이 지나면 다시 학습해요.':'レッスンを終えて3日たったら、もう一度学習しましょう。',
 '지금 복습할 수업이 없어요.':'今、復習するレッスンはありません。',
 '수업을 완료하면 복습 일정이 생겨요.':'レッスンを終えると復習予定が表示されます。',
 '다음 복습':'次の復習','다시 학습하기':'もう一度学習する','최근 학습':'前回の学習',
 '이전 수업은 완료 날짜가 없어 바로 복습할 수 있어요.':'以前のレッスンには完了日の記録がないため、すぐに復習できます。'
};
export function renderStudy(s,lessons,top){
 const text=key=>s.courseDirection==='ja-ko'?(japanese[key]||t(key)):key;
 const reviews=scheduledReviews(s,lessons),due=reviews.filter(l=>l.due),next=reviews.find(l=>!l.due);
 const body=due.length?due.map(l=>`<article class="study-card"><h2>${esc(l.position)} · ${quotedText(t(l.title))}</h2>${l.completedOn?`<p class="study-source">${text('최근 학습')} · ${esc(l.completedOn)}</p>`:''}${button(text('다시 학습하기'),'study-lesson','primary',`data-id="${esc(l.key)}"`)}</article>`).join(''):`<div class="study-empty"><h1>${text('지금 복습할 수업이 없어요.')}</h1><p>${next?`${text('다음 복습')} · ${esc(next.dueOn)} · ${esc(next.position)}`:text('수업을 완료하면 복습 일정이 생겨요.')}</p>${button(t('학습 기록'),'my')}</div>`;
 return `${top(t('오늘의 복습'))}<main class="page study-page"><p>${text('수업을 마친 뒤 3일이 지나면 다시 학습해요.')}</p>${body}${due.some(l=>!l.completedOn)?`<details><summary>${s.courseDirection==='ja-ko'?'ご案内':'안내'}</summary><p>${text('이전 수업은 완료 날짜가 없어 바로 복습할 수 있어요.')}</p></details>`:''}</main>`;
}
