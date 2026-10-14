import {matchingMarkup} from './kana-matching.js';
export {mountMatching} from './kana-matching.js';
import { kanaMemoryTips } from './kana-tips.js';
import { kanaMemoryArt } from './kana-memory-art.js';
import { writingMarkup } from './kana-writing.js';
export { mountWriting } from './kana-writing.js';
import { kanaLessons, normalizeKana, kanaRound } from './kana-state.js';
import { kanaLetterAudio } from './kana-audio.js';
import { button, icon, esc } from './ui.js';
export function kanaAudio(state) {
 const k=normalizeKana(state.kana),p=k.lessons[k.active];
 return ['intro','quiz','summary'].includes(p.phase)?null:kanaLetterAudio(kanaLessons[k.active].letters[p.index]);
}
export function renderKana(state,top){
 const k=normalizeKana(state.kana),p=k.lessons[k.active],lesson=kanaLessons[k.active],letter=lesson.letters[p.index],round=kanaRound(lesson,p.index);
 const last=p.index===round.end-1;
 const listen=button(icon('sound'),'kana-audio','icon-button kana-listen',`aria-label="${state.settings.sound?'다시 듣기':'소리 켜고 듣기'}"`);
 const glyphs=`<div class="kana-name-progress" lang="ja" aria-label="이번에 연습하는 글자">${round.letters.map(l=>`<span class="${l.id===letter.id?'current':''}">${l.text}</span>`).join('')}</div>`;
 let body;
 if(p.phase==='intro'){
  const preview=`<h1 class="sr-only">${round.letters.map(l=>l.text).join(' · ')}</h1><div class="kana-vowel-motion">${round.letters.map((l,i)=>`<div class="kana-vowel-card"><span class="kana-vowel-glyph" lang="ja" style="--letter-delay:${i*.55}s">${l.text}</span><span class="kana-vowel-reading">${l.reading}</span></div>`).join('')}</div>`;
  body=`<div class="kana-intro-content">${preview}<p class="kana-story">5글자씩 읽고 써봐요</p>${button('쓰기 연습 시작','kana-next')}</div>`;
 }else if(p.phase==='learn'){
  const tip=kanaMemoryTips[letter.id]||(letter.id==='wo'?'を는 문장에서 ‘오’로 읽어요.':letter.id==='n'?'ん은 뒤따르는 소리에 따라 받침 ㄴ·ㅁ·ㅇ처럼 들려요.':letter.id==='fu'?'ふ는 입술에 힘을 빼고 가볍게 소리를 내요.':'');
  const art=kanaMemoryArt[letter.id];
  body=`<h1 class="kana-learn-heading">쓰기 연습 <span>${p.index-round.start+1}/${round.letters.length}</span></h1>${glyphs}${writingMarkup(letter)}<div class="kana-reading-row"><p class="kana-reading">${letter.reading}</p>${listen}</div>${tip?`<figure class="kana-memory-card">${art?`<img src="${esc(art.src)}" alt="${esc(art.alt)}" width="100" height="100" decoding="async">`:''}<figcaption class="kana-tip kana-memory-tip">${esc(tip)}</figcaption></figure>`:''}<div class="kana-letter-nav button-pair">${button('이전','kana-previous','secondary',p.index===round.start?'disabled':'')}${button(last?'읽기 연습':'다음 글자','kana-next')}</div>`;
 }else if(p.phase==='reading'){
  body=`<h1>듣고 따라 읽어요</h1>${glyphs}<div class="kana-letter" lang="ja">${letter.text}</div><div class="kana-reading-row"><p class="kana-reading">${letter.reading}</p>${listen}</div><div class="kana-letter-nav button-pair">${button('이전','kana-previous','secondary',p.index===round.start?'disabled':'')}${button(last?'카드 짝 맞추기':'다음 글자','kana-next')}</div>`;
 }else if(p.phase==='quiz'){
  body=`<h1>글자와 발음을 이어요</h1>${matchingMarkup(round.letters,p.matches)}<span class="sr-only" role="status">${esc(p.feedback)}</span>${p.answered?button(round.end===lesson.letters.length?'다음':'다음','kana-next'):''}`;
 }else if(p.phase==='summary'){
  body=`<span class="kana-case-check" aria-hidden="true">${icon('check')}</span><h1>${k.active+1}/${kanaLessons.length} 학습을 마쳤어요</h1><p class="kana-story">${lesson.rangeLabel}</p><div class="kana-summary" lang="ja">${lesson.letters.map(l=>`<span>${l.text}</span>`).join('')}</div><div class="case-complete-actions button-pair">${button('다시 연습하기','kana-restart','secondary')}${k.active<kanaLessons.length-1?button('다음 학습으로','kana-continue','primary',`data-id="${k.active+1}"`):button('글자 조합 배우기','basic','primary','data-id="7"')}</div>`;
 }
 return `${top(lesson.caseTitle)}<main class="page kana-page${p.phase==='learn'?' kana-learn':p.phase==='intro'?' kana-intro':''}">${body||''}</main>`;
}
