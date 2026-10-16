import {button,icon,esc} from './ui.js';
import {chartStyle} from './letter-chart-style.js';
import {koreanContent} from './korean-content.js';
const letters=new Map(Object.values(koreanContent).flat().map(item=>[item.text,item]));
const groups={vowels:[['基本母音','ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'],['複合母音','ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ']],consonants:[['基本子音','ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'],['濃音','ㄲㄸㅃㅆㅉ']]};
export function renderPanel(kind,state,id){
 const selected=id==='consonants'?'consonants':'vowels';
 const table=([label,glyphs])=>{const cells=Array.from(glyphs,glyph=>glyph==='ㅇ'?`<td><span lang="ko">ㅇ</span><small lang="ja">${esc(letters.get(glyph).meaning)}</small></td>`:`<td><button type="button" class="korean-chart-letter" data-action="pronunciation" data-id="${esc(glyph)}" aria-label="${esc(glyph)}の発音のコツ" aria-haspopup="dialog"><span lang="ko">${esc(glyph)}</span><small lang="ja">${esc(letters.get(glyph).meaning.split('（')[0])}</small></button></td>`);return `<table class="kana-reference"><caption>${label}</caption><tbody>${Array.from({length:Math.ceil(cells.length/4)},(_,i)=>`<tr>${cells.slice(i*4,i*4+4).join('')}${'<td aria-hidden="true"></td>'.repeat(Math.max(0,4-cells.slice(i*4,i*4+4).length))}</tr>`).join('')}</tbody></table>`;};
 return `${chartStyle}<style>.korean-chart-letter{display:block;width:100%;min-height:54px;margin:0;padding:2px;background:transparent;color:var(--ink);border:0;border-radius:6px}.korean-chart-letter>span{display:block;font-size:calc(24px * var(--text-scale));line-height:1.4}.kana-chart-tabs[data-selected=consonants]:after{transform:translateX(calc(100% + 16px))}.korean-chart .kana-reference small{overflow-wrap:anywhere;line-height:1.5}.korean-chart-note{font-size:calc(13px * var(--text-scale));line-height:1.6;margin:0 0 16px}</style><div class="panel-head kana-chart-head" lang="ja"><h2 id="panel-title">ハングル表</h2><div class="kana-chart-tabs button-pair" data-selected="${selected}" role="tablist" aria-label="文字の種類">${['vowels','consonants'].map((tab,i)=>`<button id="chart-tab-${tab}" role="tab" aria-selected="${tab===selected}" aria-controls="chart-content" tabindex="${tab===selected?0:-1}" data-action="kana-chart-switch" data-id="${tab}">${i?'子音':'母音'}</button>`).join('')}</div>${button(icon('close'),'close','icon-button','aria-label="閉じる"')}</div><div class="panel-body korean-chart" id="chart-content" role="tabpanel" aria-labelledby="chart-tab-${selected}" tabindex="0" lang="ja"><p class="korean-chart-note">${selected==='consonants'?'カタカナは子音の名前です。':'カタカナは発音の目安です。'}</p>${groups[selected].map(table).join('')}</div>`;
}
export function switchChart(panel,state,id){
 if(!Object.hasOwn(groups,id))return;
 const template=document.createElement('template');template.innerHTML=renderPanel('kana-chart',state,id);
 panel.querySelector('#chart-content').replaceWith(template.content.querySelector('#chart-content'));
 panel.querySelector('[role=tablist]').dataset.selected=id;
 for(const tab of panel.querySelectorAll('[role=tab]')){const selected=tab.dataset.id===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
 panel.scrollTop=0;panel.querySelector('[role=tab][aria-selected=true]').focus({preventScroll:true});
}
