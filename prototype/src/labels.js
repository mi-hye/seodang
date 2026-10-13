import {listeningProgress,listeningOrder} from './listening-state.js';
import {labelWords,labelsProgress,labelTiles} from './labels-state.js';
import {button,esc,icon} from './ui.js';
export {mountMatching} from './kana-matching.js';
const picture=w=>`<img src="assets/labels/${w.id}-photo-v1.jpg" alt="${w.meaning}" width="640" height="640">`;
export function labelsAudio(state){
 const p=labelsProgress(state);if(!['read','build'].includes(p.phase))return null;
 const w=labelWords[p.index];return {id:`labels.${w.id}`,text:w.text,locale:'ja-JP',status:'ready',audioFile:`assets/audio/labels/${w.id}.wav`};
}
function matching(p){
 const col=(words,side)=>`<div class="kana-match-column">${words.map(w=>{const done=p.matches.includes(w.id);return `<button class="kana-match-node${done?' matched':''}" data-match-side="${side}" data-match-id="${w.id}" style="--match-color:var(--pair-${labelWords.indexOf(w)})" aria-label="${side==='glyph'?w.meaning+' 그림':w.text+' 이름표'}${done?', 연결 완료':''}" ${done?'disabled':''}>${side==='glyph'?picture(w):`<span lang="ja">${w.text}</span>`}${done?icon('check'):''}</button>`;}).join('')}</div>`;
 return `<div class="kana-match-board labels-board" data-matching aria-label="그림과 이름표 연결하기"><svg class="kana-match-lines" aria-hidden="true"><g data-match-lines></g><path data-match-preview hidden /></svg>${col(labelWords,'glyph')}${col([labelWords[2],labelWords[0],labelWords[3],labelWords[1]],'reading')}</div>`;
}
export function renderLabels(state,top){
 const p=labelsProgress(state),w=labelWords[p.index],listen=button(icon('sound'),'labels-audio','icon-button',`aria-label="${state.settings.sound?'다시 듣기':'소리 켜고 듣기'}"`);let body='';
 if(p.phase==='intro')body=`<div class="labels-preview">${labelWords.map(picture).join('')}</div><h1>그림에 이름표를 붙여요</h1><p>이름표가 섞였어요.<br>배운 글자를 이어 단어를 읽어 봐요.</p>${button('단어 읽기','labels-next')}`;
 if(p.phase==='read')body=`<h1>단어를 읽어 봐요</h1><div class="labels-picture">${picture(w)}</div><div class="labels-word"><strong lang="ja">${w.text}</strong>${listen}</div><p>${w.meaning} · ${w.reading}</p>${button('글자로 만들어 보기','labels-next')}`;
 if(p.phase==='build')body=`<h1>글자를 이어 만들어요</h1><div class="labels-picture">${picture(w)}</div><div class="labels-word"><span>${w.meaning}</span>${listen}</div><div class="label-slots" aria-label="만든 단어" lang="ja">${[0,1].map(i=>p.tiles[i]==null?'<span></span>':button(labelTiles(w)[p.tiles[i]],'labels-remove','label-filled',`data-id="${p.tiles[i]}" aria-label="${labelTiles(w)[p.tiles[i]]} 빼기"`)).join('')}</div><div class="label-tiles">${labelTiles(w).map((t,i)=>button(t,'labels-tile','secondary',`data-id="${i}" lang="ja" aria-pressed="${p.tiles.includes(i)}" ${!p.tiles.includes(i)&&p.tiles.filter(x=>x!=null).length===2?'disabled':''}`)).join('')}</div>${p.feedback?`<p role="status" class="labels-feedback">${esc(p.feedback)}</p>`:''}<div class="labels-actions">${button('확인','labels-check','primary',p.tiles.filter(x=>x!=null).length===2?'':'disabled')}</div>`;
 if(p.phase==='match')body=`<h1>그림과 이름표를 이어요</h1>${matching(p)}<span class="sr-only" role="status">${esc(p.feedback)}</span>`;
 return `${top('그림에 이름표 붙이기')}<main class="page kana-page labels-page labels-${p.phase}">${body}</main>`;
}

export function listeningAudio(state){
 const p=listeningProgress(state),w=labelWords.find(w=>w.id===listeningOrder[p.index]);
 return w?{id:`listening.${w.id}`,text:w.text,locale:'ja-JP',status:'ready',audioFile:`assets/audio/labels/${w.id}.wav`}:null;
}
export function renderListening(state,top){
 const p=listeningProgress(state),order=[labelWords[3],labelWords[0],labelWords[2],labelWords[1]];
 return `${top('듣고 사진 고르기')}<main class="page kana-page labels-page"><h1>듣고 사진을 골라요</h1>${button(`${icon('sound')} 듣기`,'listening-audio','secondary listening-audio',`aria-label="${state.settings.sound?'단어 다시 듣기':'소리 켜고 듣기'}"`)}<div class="listening-photos">${order.map(w=>button(picture(w),'listening-answer','listening-photo',`data-id="${w.id}" aria-label="${w.meaning} 사진"`)).join('')}</div><p class="labels-feedback" role="status">${esc(p.feedback)}</p></main>`;
}
