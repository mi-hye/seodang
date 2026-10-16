import {hiraganaExtraContent,hiraganaExtraAudio,hiraganaExtraCoaches} from './hiragana-extra.js';
import {katakanaContent,katakanaCoaches,katakanaGroupCoaches} from './katakana-content.js';
import {renderPractice,practiceKey} from './practice.js';
import {wordMemory} from './word-memory.js';
import {basicLessons,basicProgress,basicLevel,basicSinglePass,basicHasIntro,basicGroup} from './basics-state.js';
import {button,esc,icon} from './ui.js';
// Text, meaning/reading, distractors, concise teaching cue.
export const basicContent={
 6:[['いぬ','개',['ねこ','うま']],['いえ','집',['うえ','いけ']],['やま','산',['やみ','あめ']],['うみ','바다',['ゆめ','うま']],['そら','하늘',['とら','さら']],['すし','초밥',['すき','いし']]],
 7:[['が','가',['か','き'],'か에 ゛를 붙이면 が'],['ぎ','기',['き','く'],'き에 ゛를 붙이면 ぎ'],['ざ','자',['さ','そ'],'さ에 ゛를 붙이면 ざ'],['ず','즈',['す','せ'],'す에 ゛를 붙이면 ず'],['だ','다',['た','と'],'た에 ゛를 붙이면 だ'],['ば','바',['は','ほ'],'は에 ゛를 붙이면 ば']],
 8:[['ぱ','파',['は','ば'],'は에 ゜를 붙이면 ぱ'],['ぴ','피',['ひ','び'],'ひ에 ゜를 붙이면 ぴ'],['ぷ','푸',['ふ','ぶ'],'ふ에 ゜를 붙이면 ぷ'],['ぺ','페',['へ','べ'],'へ에 ゜를 붙이면 ぺ'],['ぽ','포',['ほ','ぼ'],'ほ에 ゜를 붙이면 ぽ']],
 9:[['きって','우표',['きて','きつて'],'작은 っ에서 한 박자 멈춰요.'],['きっぷ','표',['きぷ','きつぷ'],'작은 っ에서 한 박자 멈춰요.'],['はっぱ','나뭇잎',['はぱ','はつぱ'],'작은 っ에서 한 박자 멈춰요.'],['かっぱ','갓파',['かぱ','かつぱ'],'작은 っ에서 한 박자 멈춰요.']],
 10:[['きゃ','캬',['きや','きゆ'],'작은 ゃ를 앞 글자와 한 박자로 읽어요.'],['きゅ','큐',['きゆ','きよ'],'작은 ゅ를 앞 글자와 한 박자로 읽어요.'],['きょ','쿄',['きよ','きや'],'작은 ょ를 앞 글자와 한 박자로 읽어요.'],['しゃ','샤',['しや','しゆ'],'작은 ゃ를 앞 글자와 한 박자로 읽어요.'],['しゅ','슈',['しゆ','しよ'],'작은 ゅ를 앞 글자와 한 박자로 읽어요.'],['しょ','쇼',['しよ','しや'],'작은 ょ를 앞 글자와 한 박자로 읽어요.']]
};
const wordPictures={'きって':0,'ねっこ':1,'きっぷ':2,'はっぱ':3,'しっぽ':4,'かっぱ':5,'きゃく':6,'きゅうり':7,'きょう':8,'しゃしん':9,'しゅくだい':10,'しょくぱん':11};
function wordPicture(text,meaning){const index=wordPictures[text];if(index===undefined)return '';return `<div class="basic-word-picture" role="img" aria-label="${esc(meaning)}" style="--picture-x:${index%4*100/3}%;--picture-y:${Math.floor(index/4)*50}%"></div>`;}
// Keep stable positions for old saves while inserting vocabulary after its sounds.
Object.assign(basicContent,katakanaContent,hiraganaExtraContent);
const previousContent=structuredClone(basicContent);
const vocabulary={
 7:{},
 8:{},
 9:{0:[['ねっこ','뿌리',['ねこ','ねつこ'],'작은 っ에서 한 박자 멈춰요.']],2:[['しっぽ','꼬리',['しぽ','しつぽ'],'작은 っ에서 한 박자 멈춰요.']]},
 10:{0:[['きゃく','손님',['きやく','きゅく'],'きゃ를 한 박자로 읽어요.']],1:[['きゅうり','오이',['きゆうり','きょうり'],'きゅ 다음의 う는 소리를 한 박자 늘려요.']],2:[['きょう','오늘',['きよう','きゅう'],'きょ 다음의 う는 오 소리를 한 박자 늘려요.']],3:[['しゃしん','사진',['しやしん','しゅしん'],'しゃ를 한 박자로 읽어요.']],4:[['しゅくだい','숙제',['しゆくだい','しょくだい'],'しゅ를 한 박자로 읽어요.']],5:[['しょくぱん','식빵',['しよくぱん','しゃくぱん'],'しょ를 한 박자로 읽어요.']]}
};
for(const id of [7,8,9,10])basicContent[id]=previousContent[id].flatMap((item,index)=>[item,...(vocabulary[id][index]||[])]);
export function basicAudio(s){const extra=hiraganaExtraAudio[`${s.basics.active}.${basicProgress(s,s.basics.active).index}`];if(extra)return extra;const id=s.basics.active,p=basicProgress(s,id),audioIndex=id===7?[0,1,3,4,6,7][p.index]:id===8?[0,1,3,5,6][p.index]:p.index;const prefix=id>=11?'katakana':'basic',folder=id>=11?'katakana':'basics';return {id:`${prefix}.${id}.${audioIndex}`,text:basicContent[id][p.index][0],locale:'ja-JP',audioFile:`assets/audio/${folder}/${prefix}.${id}.${audioIndex}.wav`,status:'ready',productionMethod:'Qwen3-TTS (MLX Audio)',voiceId:'Ono_Anna'};}
// Reuse the writing canvas without creating a saved repetition session.
export function basicWritingState(s){const id=s.basics.active,p=basicProgress(s,id);return {...s,practices:{...s.practices,[practiceKey(s,'basic')]:{version:1,round:0,mode:2,index:p.index,count:basicContent[id].length}}};}
export function renderBasic(s,top){
 const active=s.basics.active;
 if(basicProgress(s,active).phase==='intro'){
  const group=basicGroup(active,basicProgress(s,active).index);
  const letters=active>=11?basicContent[active].slice(group.start,group.end):active===9?[['っ','작은 つ']]:previousContent[active];
  const groupCoach=hiraganaExtraCoaches[active]?.[group.start]??katakanaGroupCoaches[active]?.[group.start];
  const explanation=active>=11?esc(groupCoach??(group.start===0?katakanaCoaches[active]:'')??''):active===9?'작은 <b lang="ja">っ</b>에서는 한 박자 멈춰요.<br>단어로 읽어봐요.':active===10?'작은 <b lang="ja">ゃ・ゅ・ょ</b>를 앞 글자와<br>한 박자로 읽어요.':`글자 오른쪽 위에 <b lang="ja">${active===8?'゜':'゛'}</b>를 붙이면<br>소리가 바뀌어요. 이걸 <b>${active===8?'반탁음':'탁음'}</b>이라고 해요.`;
  const coach=`<aside class="basic-coach"><img src="assets/mascot/seodang-map-sitting.png" alt="서당개" width="64" height="64"><p>${explanation}</p></aside>`;
  return `${top(basicLessons.find(l=>l.id===active).title)}<main class="page basic-page basic-letter-intro${active>=11?' basic-katakana-intro':''}"><div class="basic-letter-intro-content">${explanation?coach:''}<div class="basic-letter-motion${letters.length===5?' basic-letter-five':letters.length===1?' basic-letter-single':''}${active===10||active>=11&&letters.some(([glyph])=>glyph.length>1)?' basic-letter-combined':''}${letters.length===4?' basic-letter-four':''}${letters.length===2?' basic-letter-pair':''}${active===22?' basic-letter-words':''}">${letters.map(([glyph,reading],i)=>`<div class="basic-letter-card"><span class="basic-letter-glyph" lang="ja" style="--letter-delay:${i*.55}s">${glyph}</span><span class="basic-letter-reading">${reading}</span></div>`).join('')}</div>${button('학습 시작','basic-next')}</div></main>`;
 }

 if(basicProgress(s,s.basics.active).phase==='write')return renderPractice(basicWritingState(s),'basic',top);
 const id=s.basics.active,l=basicLessons.find(l=>l.id===id),p=basicProgress(s,id),[text,meaning,other,cue]=basicContent[id][p.index],choices=basicSinglePass(id)?basicContent[id].map(([glyph])=>glyph).filter(glyph=>glyph!==text).slice(0,3):[...other];choices.splice(p.index%(basicSinglePass(id)?4:3),0,text);
 const audio=button(icon('sound'),'basic-audio','icon-button','aria-label="듣기"');
 const learn=p.phase==='learn';
 const extraSource={ぐ:['く','쿠'],げ:['け','케'],ご:['こ','코'],じ:['し','시'],ぜ:['せ','세'],ぞ:['そ','소'],ぢ:['ち','치'],づ:['つ','츠'],で:['て','테'],ど:['と','토'],び:['ひ','히'],ぶ:['ふ','후'],べ:['へ','헤'],ぼ:['ほ','호']};
 const source=[27,28].includes(id)?extraSource[text]:id===7?({が:['か','카'],ぎ:['き','키'],ざ:['さ','사'],ず:['す','스'],だ:['た','타'],ば:['は','하']}[text]):id===8?({ぱ:['は','하'],ぴ:['ひ','히'],ぷ:['ふ','후'],ぺ:['へ','헤'],ぽ:['ほ','호']}[text]):null;
 const dakuten=learn&&Boolean(source);
 return `${top(`${basicLevel(id)}-${id===6?3:id-1} · ${l.title}`)}<main class="page basic-page${dakuten?' basic-dakuten-intro':learn&&id>=9?' basic-word-lesson':''}">${learn?`<div class="basic-learn">${[9,10].includes(id)?wordPicture(text,meaning):''}${dakuten?`<div class="basic-sound-change" aria-label="${esc(source[1])}에서 ${esc(meaning)}로"><span lang="ja">${source[0]}<small>${source[1]}</small></span><span aria-hidden="true">→</span><div><div class="basic-word" lang="ja">${esc(text)}</div><small>${esc(meaning)}</small></div></div><div class="basic-example-audio">${audio}</div>`:`<div class="audio-text-row"><div class="basic-word" lang="ja">${esc(text)}</div>${audio}</div><p>${esc(meaning)}</p>`}${cue&&!dakuten?`<p class="basic-cue">${esc(cue)}</p>`:''}${wordMemory(text)}</div>`:`<div class="basic-question audio-text-row"><h1>${esc(meaning)}</h1>${audio}</div><div class="basic-choices${basicSinglePass(id)?' basic-choices-dakuten':''}">${choices.map((c,i)=>button(esc(c),'basic-select',`basic-choice${p.selected===i?' selected':''}`,`data-id="${i}" lang="ja" aria-pressed="${p.selected===i}"`)).join('')}</div><p class="basic-feedback" role="status">${p.retry?'다시 골라 주세요.':''}</p>`}<div class="button-pair">${button('이전','basic-previous','secondary',learn&&p.index===0&&!basicHasIntro(id)?'disabled':'')}${button(learn?'다음':'확인',learn?'basic-next':'basic-check','primary',!learn&&p.selected===null?'disabled':'')}</div></main>`;
}
