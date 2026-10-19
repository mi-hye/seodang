import {caseLesson} from './case-lesson.js';
import {dialogueWords} from './dialogue-content.js';
import {dialogueTurns,dialogueAudio} from './dialogue-content.js';
import {dialogueProgress} from './dialogue-state.js';
import {button,icon,esc,phraseText} from './ui.js';
// Boundaries follow complete requests and noun/particle groups, not individual glyphs.
const dialoguePhrases = [
 'ご注文は|お決まりですか。',
 'ホットと|アイス、|どちらに|なさいますか。',
 '店内で|お召し上がり|ですか。',
 'コーヒーを|ひとつください。', '紅茶を|ひとつください。', '水を|ひとつください。',
 'ホットで|お願いします。', 'アイスで|お願いします。', '常温で|お願いします。',
 '持ち帰りで|お願いします。', '店内で|お願いします。', 'もうひとつ|お願いします。',
].map(text=>text.split('|'));
const dialogueText=text=>phraseText(text,dialoguePhrases.find(parts=>parts.join('')===text));
export {dialogueAudio};
export const currentDialogueAudio=s=>{const p=dialogueProgress(s);return ['learn','practice'].includes(p.phase)?dialogueAudio[`${dialogueTurns[p.index].id}-question`]:null;};
const listen=(id)=>button(icon('sound'),'dialogue-audio','icon-button',`data-id="${id}" aria-label="다시 듣기"`);
export function renderDialogue(state,top){
 const p=dialogueProgress(state),t=dialogueTurns[p.index];let body='';
 if(p.phase==='learn')return `${top('카페에서 주문하기')}${caseLesson({index:p.index,count:dialogueTurns.length,image:'assets/cafe-dusk-v2.jpg',content:`<div class="audio-text-row"><p lang="ja">${dialogueText(t.question)}</p>${listen(t.id+'-question')}</div><div class="audio-text-row"><p lang="ja">${dialogueText(t.reply)}</p>${listen(t.id+'-reply')}</div>`,meaning:t.questionMeaning+'\n'+t.replyMeaning,words:dialogueWords[p.index],lang:'ja',explanation:t.help,extra:button('한자 뜻과 쓰기','lesson-kanji','secondary',`data-id="dialogue:${p.index}"`),actions:button('이전','dialogue-previous','secondary')+button(p.index===2?'주문하기':'다음','dialogue-next')})}`;
 if(p.phase==='intro')body=`<img class="case-lesson-image" src="assets/cafe-dusk-v2.jpg" alt="카페 사진"><h1>따뜻한 커피를 포장해요</h1><p>카페에 들렀어요. 따뜻한 커피 한 잔을 포장하려면 직원에게 어떻게 말할까요?</p>${button('필요한 문장 배우기','dialogue-next')}`;
 if(p.phase==='practice')return `${top('카페에서 주문하기')}${caseLesson({index:p.index,count:dialogueTurns.length,image:'assets/cafe-dusk-v2.jpg',content:`<h1>따뜻한 커피 한 잔을 포장해요</h1><div class="audio-text-row"><p lang="ja">${dialogueText(t.question)}</p>${listen(t.id+'-question')}</div>`,lang:'ja',extra:`<div class="scenario-choices case-lesson-choices">${t.order.map(i=>button(dialogueText(t.choices[i]),'dialogue-select',`secondary${p.selected===i?' selected':''}`,`data-id="${i}" lang="ja" aria-pressed="${p.selected===i}"`)).join('')}</div>${p.feedback?`<p class="dialogue-feedback" role="status">${esc(p.feedback)}</p>`:''}`,actions:button('이전','dialogue-previous','secondary')+button('확인','dialogue-check','primary',p.selected===null?'disabled':'')})}`;
 return `${top('카페에서 주문하기')}<main class="page dialogue-page case-lesson">${body}</main>`;
}
