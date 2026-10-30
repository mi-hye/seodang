import {koreanContent} from './korean-content.js';
import {koreanLessons,koreanGroup,koreanProgress} from './korean-state.js';
import {button,esc,icon,phraseText} from './ui.js';
const consonants='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ',vowels='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ',finals=' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
export const isKoreanConsonant=text=>text.length===1&&consonants.includes(text);
export function composeKorean(parts){const first=consonants.indexOf(parts[0]),vowel=vowels.indexOf(parts[1]),last=parts.length===2?0:finals.indexOf(parts[2]);return first<0||vowel<0||last<0?'？':String.fromCharCode(0xac00+(first*21+vowel)*28+last);}
export function koreanParts(text){const n=text.charCodeAt(0)-0xac00;if(text.length!==1||n<0||n>=11172)return [];return [consonants[Math.floor(n/588)],vowels[Math.floor(n%588/28)],...(n%28?[finals[n%28]]:[])];}
export function koreanExample(item){const parts=item.parts||(isKoreanConsonant(item.text)?[item.text,'ㅏ']:vowels.includes(item.text)?['ㅇ',item.text]:koreanParts(item.text));return {parts,text:composeKorean(parts)};}
export function koreanExampleAudio(s){const item=koreanContent[s.korean.active][koreanProgress(s,s.korean.active).index];if(item.finalSoundPractice&&item.audio)return item.audio;const text=koreanExample(item).text;if(item.audio&&item.audio.text===text)return item.audio;for(const [id,items] of Object.entries(koreanContent)){const index=items.findIndex(item=>item.text===text&&(!item.spoken||item.spoken===text));if(index>=0)return items[index].audio||{id:`korean.${id}.${index}`,text,locale:'ko-KR',status:'ready',audioFile:`assets/audio/korean/korean.${id}.${index}.wav`};}return null;}
const coaches={
 '1-1':{0:['ハングルは、子音と母音を組み合わせて一文字にします。縦の母音は右、横の母音は下に置きます。','ㅇ + ㅏ = 아'],3:['ㅜは唇を丸めて、ㅡは丸めずに発音します。ㅣは「イ」の音です。'],6:['子音の名前と、文字の中での音は別です。ㅏをつけて、가・나・다・라の順に聞こう。','ㄱ + ㅏ = 가'],10:['마・바・사・아の順に聞こう。母音の前のㅇは音を出さず、아はㅏの音になります。','ㅁ + ㅏ = 마'],14:['자・차・카を聞こう。차と카は息を強く出します。','ㅊ + ㅏ = 차'],17:['타・파・하を聞こう。子音の違いに耳をすませよう。','ㅌ + ㅏ = 타']},
 '1-3':{0:['ㅏ・ㅓ・ㅗ・ㅜに短い線を一本足すと、ㅑ・ㅕ・ㅛ・ㅠになります。音を聞いて比べよう。','ㅇ + ㅑ = 야']},
 '1-5':{0:['同じ子音を二つ重ねた文字です。息を強く出す音とは違います。音を聞き比べよう。','ㄲ + ㅏ = 까']},
 '1-7':{0:['ㅐとㅔ、ㅒとㅖは、会話では音の違いが小さいこともあります。形も一緒に覚えよう。'],4:['二つの母音を組み合わせた形です。まとまりで読んでみよう。','ㅗ + ㅏ = ㅘ'],8:['ㅚ・ㅟ・ㅢも母音の組み合わせです。ㅢは単語の中で読み方が変わることもあります。']},
 '1-9':{0:['文字の下に置く子音をパッチムと呼びます。最後に余分な母音を足さずに読みます。','ㅅ + ㅏ + ㄴ = 산'],3:['문・물は舌の位置、밥は唇の閉じ方に注意して聞こう。','ㅂ + ㅏ + ㅂ = 밥'],6:['舌の奥や舌先で息を止める音も聞こう。最後に母音を足さないようにしよう。'],8:['二つの子音を書くパッチムです。この単語で、どちらの音が残るか聞こう。'],11:['書く形と聞こえる音を比べよう。読み方は単語や続く音によって変わるよ。']},
};
export function koreanLetterChoices(id,index){
 const lesson=koreanLessons.find(l=>l.id===id),item=koreanContent[id][index],answer=item.answer||item.text;
 if(item.finalSoundPractice){const options=[...item.others,'ㄱㄴㄷㄹㅁㅂㅇ'.split('').find(x=>x!==answer&&!item.others.includes(x))];options.splice(index%4,0,answer);return options;}
 const pool=lesson.practice?Object.values(koreanContent).flat().flatMap(i=>i.parts||[]):koreanContent[id].map(i=>i.text);
 const sameType=x=>!lesson.practice||vowels.includes(answer)?(!lesson.practice||vowels.includes(x)):consonants.includes(x);
 const options=[...new Set([...item.others,...pool].filter(x=>x!==answer&&sameType(x)))].slice(0,3);options.splice(index%4,0,answer);return options;
}
const sentence=text=>phraseText(text,text.match(/[^。！？]+[。！？]?/g)||[text]);
const speaker=(action='korean-audio',label='音を聞く')=>button(icon('sound'),action,'icon-button',`aria-label="${label}"`);
function equation(parts,result){return `<div class="korean-letter-equation" lang="ko">${parts.map(esc).join('<span aria-hidden="true">+</span>')}<span aria-hidden="true">=</span><strong>${esc(result)}</strong></div>`;}
export function renderKoreanLetters(s,top){
 const id=s.korean.active,lesson=koreanLessons.find(l=>l.id===id),p=koreanProgress(s,id),item=koreanContent[id][p.index],group=koreanGroup(id,p.index),example=koreanExample(item),consonant=isKoreanConsonant(item.text);
 const shell=body=>`${top(lesson.title)}<main class="page korean-page korean-zero korean-phase-${p.phase}${p.phase==='quiz'&&p.retry?' korean-answer-retry':''}">${body}</main>`;
 if(p.phase==='intro'){
  const [copy,example]=coaches[id][group.start],items=koreanContent[id].slice(group.start,group.end);
  return shell(`<div class="korean-zero-intro"><aside class="korean-coach"><img src="assets/mascot/seodang-map-sitting.png" alt="ソダン犬" width="52" height="52"><p>${sentence(copy)}</p></aside>${example?`<p class="korean-intro-example" lang="ko">${esc(example)}</p>`:''}<div class="korean-letter-motion letters-${items.length}">${items.map((item,i)=>`<span lang="ko" style="--letter-delay:${i*.55}s">${esc(item.text)}</span>`).join('')}</div>${button('説明を見る','korean-next')}</div>`);
 }
 if(p.phase==='learn'&&item.finalSoundPractice){
  return shell(`<h1 class="korean-zero-heading">形と音を比べよう</h1><div class="korean-zero-learn"><div class="audio-text-row korean-zero-glyph"><span lang="ko">${esc(item.text)}</span>${speaker()}</div><p class="korean-letter-reading">${esc(item.meaning)} · 発音 <span lang="ko">[${esc(item.reading)}]</span></p><div class="korean-batchim-sounds"><div><span>書く形</span><strong lang="ko">${esc(item.glyph)}</strong></div><span aria-hidden="true">→</span><div><span>聞こえる音</span><strong lang="ko">${esc(item.finalSound)}</strong></div></div><p class="korean-cue">${sentence(item.cue+(item.connectionNote||''))}</p>${button('発音のコツ','pronunciation','text-button korean-pronunciation-link',`data-id="${esc(item.text)}" data-position="final" aria-haspopup="dialog"`)}</div><div class="button-pair">${button('戻る','korean-previous','secondary')}${button(lesson.practice?'音を選ぶ':'次へ','korean-next')}</div>`);
 }
 if(p.phase==='learn'&&lesson.practice){
  return shell(`<h1 class="korean-zero-heading">聞いて、声に出してみよう</h1><div class="korean-zero-learn korean-practice-listen"><div class="audio-text-row korean-zero-glyph"><span lang="ko">${esc(item.text)}</span>${speaker()}</div></div><div class="button-pair">${button('戻る','korean-previous','secondary',p.index===0?'disabled':'')}${button('書いてみる','korean-next')}</div>`);
 }
 if(p.phase==='learn'){
  return shell(`<h1 class="korean-zero-heading">文字のしくみ</h1><div class="korean-zero-learn"><div class="audio-text-row korean-zero-glyph"><span lang="ko">${esc(item.text)}</span>${speaker('korean-audio',consonant?'文字の名前を聞く':'音を聞く')}</div><p class="korean-letter-reading">${consonant?`名前：<span lang="ko">${esc(item.spoken)}</span>`:esc(item.meaning||'')}</p><div class="audio-text-row korean-example-row">${equation(example.parts,example.text)}${speaker('korean-example-audio','組み合わせた音を聞く')}</div>${item.cue?`<p class="korean-cue">${sentence(item.cue)}</p>`:''}${item.text==='ㅇ'?'':button('発音のコツ','pronunciation','text-button korean-pronunciation-link',`data-id="${esc(item.text)}" data-position="${id==='1-9'?'final':'initial'}" aria-haspopup="dialog"`)}</div><div class="button-pair">${button('戻る','korean-previous','secondary')}${button('次へ','korean-next')}</div>`);
 }
 if(p.phase==='write')return `${top(lesson.title)}<main class="page korean-page practice-page practice-writing practice-katakana korean-phase-write" lang="ja"><div class="practice-heading"><h1>書いてみよう</h1></div><div class="practice-writing-reference practice-writing-reference-glyph"><span lang="ko">${esc(item.text)}</span>${speaker('korean-audio',consonant?'文字の名前を聞く':'音を聞く')}</div><div class="practice-board practice-board-glyph"><span class="practice-guide" lang="ko">${esc(item.text)}</span><canvas data-korean-writing="${id}-${p.index}" aria-label="${esc(item.text)}を書く練習欄"></canvas></div><p class="practice-feedback" role="status"></p><div class="button-pair">${button('消す','korean-clear','secondary')}${button('次へ','korean-next','primary','disabled data-writing-next')}</div></main>`;
 const options=koreanLetterChoices(id,p.index),selected=p.selected===null?null:options[p.selected];
 const parts=lesson.practice&&!item.finalSoundPractice?item.parts.map((part,i)=>i===item.blank?(selected||'＿'):part):[];
 const ambiguous=!lesson.practice&&'ㅐㅔㅒㅖㅚㅙㅞ'.includes(item.text);
 return shell(`<div class="audio-text-row korean-zero-question"><h1>${item.finalSoundPractice?'パッチムはどの音？':consonant?'文字の名前を聞いて選ぼう':lesson.practice?'聞いて、文字を入れよう':'音を聞いて選ぼう'}</h1>${speaker()}</div>${item.finalSoundPractice?`<div class="korean-batchim-word"><strong lang="ko">${esc(item.text)}</strong><p>パッチム <span lang="ko">${esc(item.glyph)}</span></p></div>`:lesson.practice?`<div class="korean-assembly" aria-live="polite">${equation(parts,selected?composeKorean(parts):'？')}</div>`:''}${item.cue&&lesson.practice&&!item.finalSoundPractice||ambiguous?`<p class="korean-cue korean-quiz-cue">${sentence(ambiguous?`${item.spoken}の母音を選ぼう。`:item.cue)}</p>`:''}<div class="korean-choices korean-zero-choices">${options.map((o,i)=>button(`${esc(o)}${p.retry&&p.selected===i?`<span class="korean-wrong-mark" aria-hidden="true">${icon('close')}</span>`:''}`,'korean-select',`korean-choice${p.selected===i?' selected':''}${p.retry&&p.selected===i?' incorrect':''}`,`data-id="${i}" lang="ko" aria-pressed="${p.selected===i}"${p.retry&&p.selected===i?' aria-describedby="korean-answer-feedback"':''}`)).join('')}</div><p id="korean-answer-feedback" class="korean-feedback" role="status" aria-atomic="true">${p.retry?'<strong>音が違うよ。</strong><span>もう一度聞いて選ぼう。</span>':''}</p><div class="button-pair">${button('戻る','korean-previous','secondary')}${button('確認','korean-check','primary',p.selected===null?'disabled':'')}</div>`);
}

// Modern Hangul has 27 written final-consonant forms, not 27 distinct final sounds.
export const koreanFinalForms=Array.from('ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ');
export function renderKoreanLettersComplete(top){
 const rows=Array.from({length:4},(_,row)=>`<tr>${koreanFinalForms.slice(row*7,row*7+7).map(glyph=>`<td lang="ko">${esc(glyph)}</td>`).join('')}${row===3?'<td aria-hidden="true"></td>':''}</tr>`).join('');
 return `${top('文字の学習完了')}<div class="lesson-progress" role="progressbar" aria-label="学習の進み具合" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span style="width:100%"></span></div><main class="page korean-zero-finish" lang="ja"><h1 tabindex="-1">次は、発音を練習しよう</h1><p>${phraseText('', ['実は、こんなにあります。'])}</p><table class="korean-final-table"><caption>パッチムの形 · 27種類</caption><tbody>${rows}</tbody></table><p class="korean-final-tip">${phraseText('', ['一つずつ暗記しなくて大丈夫。','単語の中で、','音と一緒に覚えていこう。'])}</p><p class="korean-final-note">${phraseText('', ['形の一覧です。','読み方は前後の音で','変わることがあります。'])}</p><div class="button-pair">${button('学習ホーム','home','secondary')}${button('発音を練習する','completed-next')}</div></main>`;
}
