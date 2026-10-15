import {chartStyle} from './letter-chart-style.js';
import {button,icon,esc} from './ui.js';
import {katakanaContent} from './katakana-content.js';
const rows=[
 ['あいうえお','아 이 우 에 오'],['かきくけこ','카 키 쿠 케 코'],['さしすせそ','사 시 스 세 소'],['たちつてと','타 치 츠 테 토'],['なにぬねの','나 니 누 네 노'],['はひふへほ','하 히 후 헤 호'],['まみむめも','마 미 무 메 모'],['や　ゆ　よ','야 - 유 - 요'],['らりるれろ','라 리 루 레 로'],['わ　　　を','와 - - - 오'],['ん　　　　','응 - - - -']
];
const voiced=[['がぎぐげご','가 기 구 게 고'],['ざじずぜぞ','자 지 즈 제 조'],['だぢづでど','다 지 즈 데 도'],['ばびぶべぼ','바 비 부 베 보'],['ぱぴぷぺぽ','파 피 푸 페 포']];
const contracted=[['きゃ きゅ きょ','캬 큐 쿄'],['しゃ しゅ しょ','샤 슈 쇼'],['ちゃ ちゅ ちょ','차 추 초'],['にゃ にゅ にょ','냐 뉴 뇨'],['ひゃ ひゅ ひょ','햐 휴 효'],['みゃ みゅ みょ','먀 뮤 묘'],['りゃ りゅ りょ','랴 류 료'],['ぎゃ ぎゅ ぎょ','갸 규 교'],['じゃ じゅ じょ','자 주 조'],['びゃ びゅ びょ','뱌 뷰 뵤'],['ぴゃ ぴゅ ぴょ','퍄 퓨 표']];
const toKatakana=text=>Array.from(text,c=>c>='ぁ'&&c<='ゖ'?String.fromCharCode(c.charCodeAt(0)+0x60):c).join('');
export function renderPanel(kind,state,id){
 const kata=id==='katakana',title='글자';
 const cell=(glyph,reading)=>glyph==='　'?'<td aria-hidden="true"></td>':`<td><span lang="ja">${esc(kata?toKatakana(glyph):glyph)}</span><small>${esc(reading)}</small></td>`;
 const table=(label,data,joined=false)=>`<table class="kana-reference"><caption>${label}</caption><tbody>${data.map(([letters,readings])=>`<tr>${(joined?letters.split(' '):Array.from(letters)).map((c,i)=>cell(c,readings.split(' ')[i])).join('')}</tr>`).join('')}</tbody></table>`;
 const special=kata?`<table class="kana-reference"><caption>특수 가타카나</caption><tbody>${[23,24,25,26].flatMap(id=>{const entries=katakanaContent[id];return Array.from({length:Math.ceil(entries.length/3)},(_,r)=>`<tr>${entries.slice(r*3,r*3+3).map(([g,p])=>cell(g,p)).join('')}${'<td aria-hidden="true"></td>'.repeat(Math.max(0,3-entries.slice(r*3,r*3+3).length))}</tr>`);}).join('')}</tbody></table>`:'';
 return `${chartStyle}<div class="panel-head kana-chart-head"><h2 id="panel-title">${title}</h2><div class="kana-chart-tabs button-pair" data-selected="${kata?'katakana':'hiragana'}" role="tablist" aria-label="글자 종류">${['hiragana','katakana'].map((tab,i)=>`<button id="chart-tab-${tab}" role="tab" aria-selected="${kata===Boolean(i)}" aria-controls="chart-content" tabindex="${kata===Boolean(i)?0:-1}" data-action="kana-chart-switch" data-id="${tab}">${i?'가타카나':'히라가나'}</button>`).join('')}</div>${button(icon('close'),'close','icon-button','aria-label="닫기"')}</div><div class="panel-body" id="chart-content" role="tabpanel" aria-labelledby="chart-tab-${kata?'katakana':'hiragana'}" tabindex="0">${table('기본 글자',rows)}${table('탁음·반탁음',voiced)}${table('요음',contracted,true)}${special}</div>`;
}

export function switchChart(panel,state,id){
 if(!['hiragana','katakana'].includes(id))return;
 const template=document.createElement('template');template.innerHTML=renderPanel('kana-chart',state,id);
 panel.querySelector('#chart-content').replaceWith(template.content.querySelector('#chart-content'));
 panel.querySelector('[role=tablist]').dataset.selected=id;
 for(const tab of panel.querySelectorAll('[role=tab]')){const selected=tab.dataset.id===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
 panel.scrollTop=0;panel.querySelector('[role=tab][aria-selected=true]').focus({preventScroll:true});
}
