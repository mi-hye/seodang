import {esc,icon} from './ui.js';
import {mountOnboardingCharacter} from './onboarding-character.js';

export const guideMascot='assets/mascot/seodang-cartoon-atlas-v1.png';

// The welcome story is shared by every difficulty. Only the reader's language changes.
export function guidePages(_level,courseDirection='ko-ja'){
 const jp=courseDirection==='ja-ko';
 return jp?[
  {type:'welcome',title:'やあ！ぼくはソダン犬だよ！',text:''},
  {type:'culture',title:'書堂って、どんなところ？',text:'書堂（ソダン）は、昔の韓国で子どもたちが読み書きを学んだ場所なんだ。',note:'そんな書堂にまつわる、韓国のことわざがあるよ。'},
  {type:'story',title:'書堂の犬も三年で詩を詠む',text:'書堂で毎日、本を読む声を聞いていると、犬でも詩を詠めるようになる、という意味だよ。',note:'そばで見たり聞いたりするうちに、自然と覚えるというたとえなんだ。ぼくと一緒に少しずつ学ぼう！'},
  {type:'learn',title:'こんなふうに学ぼう！',steps:[
   ['sound','聞いて、読んでみよう','音と文字を一緒に覚えよう。'],
   ['check','問題を解いてみよう','覚えたことを確かめよう。'],
   ['book','もう一度挑戦しよう','迷ったところは、復習すれば大丈夫。']
  ]},
  {type:'ready',title:'間違えても大丈夫！',text:'わからないことは、また一緒に覚えよう。\nぼくもそばにいるよ。',note:'学習ホームで最初のレッスンを選んでね。'}
 ]:[
  {type:'welcome',title:'안녕? 난 서당개야!',text:''},
  {type:'story',title:'서당 개 삼 년이면 풍월을 읊는다',text:'매일 글 읽는 소리를 듣다 보면 강아지도 시를 읊게 된다는 말이야.',note:'우리도 자주 만나면서 조금씩 익혀보자.'},
  {type:'learn',title:'공부는 이렇게 하면 돼!',steps:[
   ['sound','먼저 듣고 읽어봐','소리와 글자를 함께 익혀봐.'],
   ['check','직접 풀어봐','배운 내용을 문제로 확인해봐.'],
   ['book','다시 도전해봐','헷갈린 건 복습하면서 익히면 돼.']
  ]},
  {type:'ready',title:'틀려도 괜찮아!',text:'모르는 건 다시 만나면 돼.\n내가 옆에서 함께할게.',note:'학습 홈에서 첫 수업을 골라봐.'}
 ];
}

export function mountGuide(root,level,{onChange=()=>{},initialIndex=0,reducedMotion=false,courseDirection='ko-ja'}={}){
 const jp=courseDirection==='ja-ko',doc=root.ownerDocument,pages=guidePages(level,courseDirection);
 let disposeCharacter,sceneMounted=false;
 let disposed=false,index=Number.isInteger(initialIndex)?Math.max(0,Math.min(pages.length-1,initialIndex)):0;
 const visibility=()=>root.classList.toggle('guide-paused',Boolean(doc.hidden));
 const draw=()=>{
  if(disposed)return;
  const page=pages[index];
  const pose=page.type==='welcome'?'standing':page.type==='ready'?'happy':'sitting';
  const mascot=`<div class="guide-runner"><div class="guide-mascot mascot-sprite" role="img" aria-label="${jp?'ソダン犬':'서당개'}" style="background-image:url('${guideMascot}')"></div></div>`;
  const content=`<div class="guide-copy"><h2 tabindex="-1">${esc(page.title)}</h2>${page.text?`<p class="guide-description">${esc(page.text)}</p>`:''}${page.note?`<p class="guide-note">${esc(page.note)}</p>`:''}</div>
   ${page.steps?`<ol class="guide-flow">${page.steps.map(([name,title,text])=>`<li><span class="guide-flow-icon" aria-hidden="true">${icon(name)}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></li>`).join('')}</ol>`:''}`;
  const dots=pages.map((_,i)=>`<span${i===index?' aria-current="step"':''}></span>`).join('');
  // A previous mount may leave markup behind after its Rive canvas was disposed.
  // Reuse a scene only while this guide instance still owns its renderer.
  const section=sceneMounted?root.querySelector?.('.dog-guide'):null;
  if(section){
   // Keep the same canvas, decoded image and Rive instance across every guide page.
   section.dataset.guideType=page.type;section.dataset.guidePage=index;
   root.querySelector('.guide-content').innerHTML=content;
   const progress=root.querySelector('.guide-dots');progress.innerHTML=dots;progress.setAttribute('aria-label',`${index+1} / ${pages.length}`);
  }else{
   root.innerHTML=`<section class="dog-guide guide-walkthrough${reducedMotion?' guide-still':''}" data-guide-type="${page.type}" data-guide-page="${index}" lang="${jp?'ja':'ko'}" aria-label="${jp?'ソダン犬の学習ガイド':'서당개 학습 안내'}">
    <button type="button" class="guide-scene guide-replay" aria-label="${jp?'もう一度あいさつを見る':'인사 다시 보기'}">${mascot}</button>
    <div class="guide-content">${content}</div>
    <div class="guide-dots" aria-label="${index+1} / ${pages.length}">${dots}</div>
   </section>`;
   const host=root.querySelector?.('.guide-scene');
   if(host)disposeCharacter=mountOnboardingCharacter(host,{state:'greeting',pose,reducedMotion});
   sceneMounted=true;
  }
  disposeCharacter?.setPose?.(pose);
  onChange({index,total:pages.length,last:index===pages.length-1});
 };
 const replay=event=>{if(disposed||!event.target.closest('.guide-replay'))return;disposeCharacter?.replay?.();};
 root.addEventListener('click',replay);
 doc.addEventListener('visibilitychange',visibility);visibility();draw();
 const dispose=()=>{if(disposed)return;disposed=true;disposeCharacter?.();root.removeEventListener('click',replay);doc.removeEventListener('visibilitychange',visibility);root.classList.toggle('guide-paused',true);};
 dispose.next=()=>{if(disposed||index===pages.length-1)return false;index++;draw();return true;};
 dispose.previous=()=>{if(disposed||index===0)return false;index--;draw();return true;};
 return dispose;
}
