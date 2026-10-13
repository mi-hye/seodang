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
 if(p.phase==='intro')body=`<img class="dialogue-scene" src="assets/cafe-dusk-v2.jpg" alt="카페 사진"><h1>카페에서 주문해요</h1><p>질문을 듣고 원하는 음료와<br>포장 여부를 말해 봐요.</p>${button('대화 익히기','dialogue-next')}`;
 if(p.phase==='learn')body=`<h1>질문에 답해 봐요</h1><div class="dialogue-bubble staff"><div class="dialogue-speaker">직원 ${listen(t.id+'-question')}</div><p lang="ja">${dialogueText(t.question)}</p><p class="dialogue-meaning">${t.questionMeaning}</p></div><div class="dialogue-bubble customer"><div class="dialogue-speaker">나 ${listen(t.id+'-reply')}</div><p lang="ja">${dialogueText(t.reply)}</p><p class="dialogue-meaning">${t.replyMeaning}</p></div><p class="dialogue-help">${t.help}</p><div class="dialogue-actions button-pair">${button('이전','dialogue-previous','secondary')}${button(p.index===2?'주문해 보기':'다음','dialogue-next')}</div>`;
 if(p.phase==='practice')body=`<h1>따뜻한 커피 한 잔을<br>포장해요</h1><div class="dialogue-bubble staff"><div class="dialogue-speaker">직원 ${listen(t.id+'-question')}</div><p lang="ja">${dialogueText(t.question)}</p></div><div class="dialogue-options">${t.order.map(i=>button(dialogueText(t.choices[i]),'dialogue-select',`dialogue-option${p.selected===i?' selected':''}`,`data-id="${i}" lang="ja" aria-pressed="${p.selected===i}"`)).join('')}</div>${p.feedback?`<p class="dialogue-feedback" role="status">${esc(p.feedback)}</p>`:''}<div class="dialogue-actions button-pair">${button('이전','dialogue-previous','secondary')}${button('확인','dialogue-check','primary',p.selected===null?'disabled':'')}</div>`;
 return `${top('카페에서 주문하기')}<main class="page dialogue-page">${body}</main>`;
}
