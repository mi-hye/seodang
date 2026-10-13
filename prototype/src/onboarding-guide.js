import { esc } from './ui.js';

// Generated six-frame mascot atlas; dialogue advances manually, independently of motion.
export const guideMascot = 'assets/mascot/seodang-cartoon-atlas-v1.png';
export function guidePages(level) {
  const welcome={title:'사건을 따라가며 함께 배워요',text:'작은 사건을 해결하면서 필요한 일본어를 조금씩 익혀요.'};
  if(level===1)return [{title:'히라가나를 순서대로 배워요',text:'46글자를 세 학습으로 나눠 연습해요. 아·이·우·에·오부터 시작해요.'},
    {title:'듣고, 보고, 따라 써봐요',text:'글자 소리와 획순을 보여줄게요. 다 보고 손가락으로 따라 써봐요.'},
    {title:'읽고, 카드의 짝을 맞춰요',text:'쓴 글자를 소리 내어 읽고, 양쪽의 글자와 발음을 선으로 이어봐요. 헷갈리면 다시 연습해도 괜찮아요.'},
  ];
  if(level===2)return [welcome,
    {title:'그림과 소리로 표현을 익혀요',text:'색과 위치 표현을 배워요. 스피커를 누르면 다시 들을 수 있어요.'},
    {title:'메모를 읽고 답을 찾아요',text:'메모에 적힌 색과 위치를 읽고, 같은 가방을 골라봐요. 틀려도 다시 고를 수 있어요.'},
  ];
  if(level===3)return [welcome,
    {title:'듣고, 문장을 만들어봐요',text:'문장을 듣고 뜻을 익혀요. 조각을 순서대로 골라 문장을 완성해봐요.'},
    {title:'문장 속 단서로 해결해요',text:'배운 문장의 단서를 모아 답을 골라봐요. 헷갈리면 다시 들어도 괜찮아요.'},
  ];
  if(level===4)return [{title:'카페에서 주문해요',text:'직원의 질문을 듣고 원하는 음료와 포장 여부를 말해요.'},{title:'대화를 익히고 답을 골라요',text:'세 가지 질문과 답을 배운 뒤 직접 주문해 봐요. 스피커를 누르면 다시 들을 수 있어요.'}];
  if(level===5)return [{title:'글을 읽고 핵심을 찾아요',text:'안내문과 메시지에서 정보를 찾고, 글쓴이의 생각과 이유를 알아봐요. 세 지문과 여섯 문제를 풀어요.'}];
  if(level===6)return [{title:'日本語で読んで、考えよう',text:'お知らせやメッセージを読んで、条件や理由を確かめましょう。三つの文章と六つの問題に挑戦します。'}];
  if(level===7)return [{title:'行間を聴く',text:'本文を見ずに音声を聞き、含意・反語・論理の違いを捉えましょう。三つの音声と六つの問題に挑戦します。'}];
  return [{title:'이 난이도는 준비 중이에요',text:'지금은 1~7단계까지 배울 수 있어요.'},{title:'준비된 학습부터 함께해요',text:'이전으로 돌아가 난이도를 골라 주세요.'}];
}
export function mountGuide(root, level, {onChange = () => {}, reducedMotion = false} = {}) {
  const pages=guidePages(level);
  const doc=root.ownerDocument;
  const visibility=()=>root.classList?.toggle("guide-paused",Boolean(doc?.hidden));
  doc?.addEventListener("visibilitychange",visibility);
  visibility();
  let index=0,disposed=false;
  const draw=()=>{
    if(disposed)return;
    const page=pages[index];
    root.innerHTML=`<section class="dog-guide" aria-label="서당개 학습 안내"><div class="guide-mascot mascot-sprite${reducedMotion ? ' mascot-still' : ''}" role="img" aria-label="눈을 깜빡이고 손을 흔드는 서당개" style="background-image:url('${guideMascot}')"></div><div class="guide-dialogue" aria-live="polite" aria-atomic="true"><h2>${esc(page.title)}</h2><p>${esc(page.text)}</p>${page.footer?`<p class="guide-home-note">${esc(page.footer)}</p>`:''}</div><div class="guide-count" aria-label="안내 ${index+1} / ${pages.length}">${index+1} / ${pages.length}</div></section>`;
    onChange({index,total:pages.length,last:index===pages.length-1});
  };
  const dispose=()=>{disposed=true;doc?.removeEventListener("visibilitychange",visibility);root.classList?.toggle("guide-paused",true);};
  dispose.next=()=>{if(disposed||index===pages.length-1)return false;index++;draw();return true;};
  dispose.previous=()=>{if(disposed||index===0)return false;index--;draw();return true;};
  draw();
  return dispose;
}
