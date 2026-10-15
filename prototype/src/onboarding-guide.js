import {esc,icon,phraseText} from './ui.js';
import {prepareContent,practiceUnits} from './practice-content.js';

const guideIcon=name=>['write','mic'].includes(name)?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${name==='write'?'m15 3 6 6-12 12H3v-6Zm-9 9 6 6M13 5l6 6':'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8'}"/></svg>`:icon(name);
export const guideMascot='assets/mascot/seodang-cartoon-atlas-v1.png';
const prompts={
 ko:['소리를 듣고 글자를 따라 써요.','단어와 뜻을 연결해요.','문장을 듣고 가방의 주인을 찾아요.','말을 골라 문장을 만들어요.','질문을 듣고 대답을 골라요.','글에서 필요한 정보를 찾아요.','조건과 이유를 읽고 판단해요.','논설의 주장과 근거를 따져 읽어요.'],
 ja:['音を聞いて文字をなぞります。','単語と意味を結びます。','短い文で自分のことを伝えます。','言葉を並べて文を作ります。','質問を聞いて返事を選びます。','文章から必要な情報を探します。','条件や理由を読んで考えます。','論説の主張と根拠を吟味します。']
};
const flows={
 ko:[['소리 듣기','글자 쓰기','발음 연결'],['단어 읽기','뜻 연결','듣고 고르기'],['표현 듣기','뜻 익히기','상황에 쓰기'],['문장 듣기','말 이어 붙이기','문장 완성'],['질문 듣기','대답 고르기','말해 보기'],['글 읽기','정보 찾기','답 고르기'],['글 읽기','조건과 이유','답 고르기'],['지문 없이 듣기','숨은 뜻 찾기','답 고르기']],
 ja:[['音を聞く','文字を書く','組み立てる'],['単語を読む','意味と結ぶ','聞いて選ぶ'],['表現を聞く','意味を知る','使ってみる'],['文を聞く','言葉を並べる','文を作る'],['質問を聞く','返事を選ぶ','声に出す'],['文章を読む','情報を探す','答えを選ぶ'],['文章を読む','条件と理由','答えを選ぶ'],['本文なしで聞く','本音を探す','答えを選ぶ']]
};
export function guidePages(level,courseDirection='ko-ja'){
 const jp=courseDirection==='ja-ko'?level<7:level>=6,locale=jp?'ja':'ko',type=['trace','word','arrange','arrange','dialogue','read','reason','reason'][level];
 return [
  {title:jp?'ソダンは、こう進めます':'서당은 이렇게 진행돼요',text:'',type,flow:level===0?flows[locale][level]:jp?['場面を知る','文と単語を学ぶ','解決する']:['사건 만나기','문장과 단어 배우기','해결하기'],letterAdvice:level===0&&courseDirection==='ko-ja'?{intro:'히라가나부터 특수 가타카나까지 준비했어요.',emphasis:'모든 글자를 꼭 전부 배울 필요는 없어요!',recommendation:'처음이라면 1~9번 수업부터 추천해요.',followUp:'나머지 글자는 단어를 배우면서 조금씩 익혀도 돼요.'}:null},
  {title:prompts[locale][level],text:'',type},
  {title:level===0&&courseDirection==='ja-ko'?'組み合わせれば読める':level===0&&!jp?'히라가나부터 가타카나까지':jp?'場面が変わっても使える':'상황이 바뀌어도 써봐요',text:level===0&&courseDirection==='ja-ko'?'子音と母音を覚えて、文字を組み立てよう。':jp?'途中で閉じても、続きから始められます。':'중간에 나가도 이어서 할 수 있어요.',type}
 ];
}
export async function prepareGuide(level,courseDirection){
 const korean=courseDirection==='ja-ko',id=level===0?'1-1':[1,2,3].includes(level)?'3-1':`${level}-1`;
 const kind=korean?'korean':level===0?'kana':level===1?'labels':({2:'sentence',3:'sentence',4:'dialogue'}[level]||'reading');
 await prepareContent(kind);
 const units=practiceUnits({courseDirection,onboardingLevel:level,kana:{active:0},korean:{active:id}},kind).slice(0,2);
 const demo={type:guidePages(level,courseDirection)[0].type,text:units[0].text,choices:[units[1].meaning,units[0].meaning],audio:units[0].audio.audioFile};
 if(level===1&&!korean)demo.image='assets/labels/kasa-photo-v1.jpg';
 if(level===2&&!korean)demo.image='assets/word-blue-bag-v1.png';
 if([2,3].includes(level)){demo.parts=units[0].text.split(/\s+/);demo.text=units[0].meaning;}
 if(korean){
  const {koreanContent}=await import('./korean-content.js');const item=koreanContent[id][0];
  if(level===4){demo.text=item.cue;demo.choices=[item.others[0],item.text];}
  if(level>=5){demo.text=item.text;demo.question=item.question;demo.choices=[item.others[0],item.answer];demo.audio=`assets/audio/korean/korean.${id}.0.wav`;}
 }else if(level===4){
  const {dialogueTurns,dialogueAudio}=await import('./dialogue-content.js');const turn=dialogueTurns[0];demo.text=turn.question;demo.choices=[turn.choices[1],turn.reply];demo.audio=dialogueAudio[`${turn.id}-question`].audioFile;
 }else if(level===5||level===6){
  const {readingCourses}=await import('./reading-content.js');const {readingAnswers}=await import('./reading-state.js');const passage=readingCourses[level].passages[0],q=passage.questions[0],answer=readingAnswers[level][0];
  demo.text=passage.paragraphs.join('\n');demo.question=q.prompt;demo.choices=[q.choices[(answer+1)%q.choices.length],q.choices[answer]];demo.audio=null;
 }else if(level===7){
  const {advancedCourse,advancedAudio}=await import('./reading-advanced.js');const q=advancedCourse.passages[0].questions[0];demo.text=advancedCourse.passages[0].paragraphs.join('\n');demo.question=q.prompt;demo.choices=[q.choices[0],q.choices[2]];demo.audio=advancedAudio[0].audioFile;
 }
 units.demo=demo;return units;
}
const display=text=>phraseText(text.replaceAll('|',''),text.includes('|')?text.split('|'):text.split(/(\s+)/));
export function mountGuide(root,level,{onChange=()=>{},reducedMotion=false,courseDirection='ko-ja',units=[]}={}){
 const jp=courseDirection==='ja-ko'?level<7:level>=6,doc=root.ownerDocument,pages=guidePages(level,courseDirection),demo=units.demo;
 const audio=demo.audio?new Audio(demo.audio):null;let disposed=false,index=0;
 const stop=()=>{audio?.pause();if(audio)audio.currentTime=0;};
 const visibility=()=>{root.classList.toggle('guide-paused',Boolean(doc.hidden));if(doc.hidden)stop();};
 const icons=level===0?['sound','write','cards']:level>=5?['book','help','check']:['sound',level===3?'cards':'book','check'];
 const withAudio=markup=>audio?`<div class="audio-text-row">${markup}<button type="button" class="guide-listen" aria-label="${jp?'音声を聞く':'소리 듣기'}">${icon('sound')}</button></div>`:markup;
 const example=()=>{

  if(level===0)return withAudio(`<div class="guide-glyph" lang="${courseDirection==='ja-ko'?'ko':'ja'}">${esc(demo.text)}<span>${esc(units[0].meaning)}</span></div>`);
  if([2,3].includes(level))return `${withAudio(`<p class="guide-example">${display(demo.text)}</p>`)}<div class="guide-preview-parts">${demo.parts.map(part=>`<span>${display(part)}</span>`).join('')}</div>`;
  const snippet=level>=5?demo.text.split('\n')[0]:demo.text;
  return `${demo.image?`<img class="guide-photo" src="${demo.image}" alt="${esc(units[0].meaning)}">`:''}${withAudio(`<div class="guide-example${level>=5?' guide-passage':''}">${display(snippet)}</div>`)}${level<5?`<div class="guide-preview-answer">${display(demo.choices[1])}</div>`:''}`;
 };
 const draw=()=>{
  if(disposed)return;stop();const page=pages[index];
  const visual=index===0&&page.letterAdvice?`<div class="guide-letter-advice"><p>${esc(page.letterAdvice.intro)}</p><p><strong>${esc(page.letterAdvice.emphasis)}</strong></p><p>${esc(page.letterAdvice.recommendation)}</p><p>${esc(page.letterAdvice.followUp)}</p></div>`:index===0?`<ol class="guide-flow">${page.flow.map((label,i)=>`<li><span class="guide-flow-icon">${guideIcon(icons[i])}</span><span>${esc(label)}</span></li>`).join('')}</ol>`:index===1?`<div class="guide-demo guide-preview">${example()}<span class="guide-feedback" role="status"></span></div>`:level===0&&courseDirection==='ja-ko'?'<div class="guide-hangul-example" lang="ko"><span>ㄱ + ㅏ = <b>가</b></span><span>ㄱ + ㅗ = <b>고</b></span></div>':`<div class="guide-cycle">${(level===0?(jp?['聞く','書く']:['듣기','쓰기']):(jp?['聞く','選ぶ']:['듣기','고르기'])).map((label,i)=>`<div>${guideIcon(['sound',level===0?'write':'check'][i])}<span>${label}</span></div>`).join('')}<span class="guide-cycle-count">×3</span></div>`;
  root.innerHTML=`<section class="dog-guide guide-walkthrough" data-guide-type="${page.type}" data-guide-page="${index}" aria-label="${jp?'ソダン犬の学習ガイド':'서당개 학습 안내'}"><div class="guide-coach"><div class="guide-mascot mascot-sprite${reducedMotion?' mascot-still':''}" role="img" aria-label="${jp?'ソダン犬':'서당개'}" style="background-image:url('${guideMascot}')"></div><h2>${esc(page.title)}</h2></div>${visual}${page.text?`<p class="guide-note">${esc(page.text)}</p>`:''}<div class="guide-dots" aria-label="${index+1} / ${pages.length}">${pages.map((_,i)=>`<span${i===index?' aria-current="step"':''}></span>`).join('')}</div></section>`;
  onChange({index,total:pages.length,last:index===pages.length-1});
 };
 const click=async event=>{if(!event.target.closest('.guide-listen'))return;stop();try{await audio?.play();}catch{if(!disposed&&index===1)root.querySelector('.guide-feedback').textContent=jp?'もう一度押してください。':'한 번 더 눌러 주세요.';}};
 root.addEventListener('click',click);doc.addEventListener('visibilitychange',visibility);visibility();draw();
 const dispose=()=>{disposed=true;stop();root.removeEventListener('click',click);doc.removeEventListener('visibilitychange',visibility);root.classList.toggle('guide-paused',true);};
 dispose.next=()=>{if(disposed||index===pages.length-1)return false;index++;draw();return true;};
 dispose.previous=()=>{if(disposed||index===0)return false;index--;draw();return true;};
 return dispose;
}
