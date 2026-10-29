import {analytics} from './analytics.js';
import {japaneseLessonUI} from './curriculum.js';
import {showSheet,closeSheet} from './sheet.js';
let styles;
async function copyDeletionInfo(text){
 try{await navigator.clipboard.writeText(text);return;}catch{}
 // Native WebViews may not expose the asynchronous clipboard API.
 const focus=document.activeElement;
 const field=document.createElement('textarea');field.value=text;field.readOnly=true;
 field.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';document.querySelector('.analytics-consent').append(field);
 try{field.select();field.setSelectionRange(0,text.length);if(!document.execCommand('copy'))throw Error('Copy unavailable');}finally{field.remove();if(focus?.isConnected)focus.focus({preventScroll:true});}
}
export async function askAnalyticsConsent(state){
 styles ||= new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/analytics-consent.css';link.onload=resolve;link.onerror=resolve;document.head.append(link);});
 await styles;
 const jp=japaneseLessonUI(state),dialog=document.createElement('dialog');
 dialog.lang=jp?'ja':'ko';
 dialog.className='settings-panel analytics-consent';dialog.setAttribute('aria-labelledby','analytics-title');
 dialog.innerHTML=`<h2 id="analytics-title" tabindex="-1">${jp?'よりよい書堂づくりに参加しませんか？':'서당을 더 좋게 만드는 데 참여할까요?'}</h2><p>${jp?'アプリ起動、授業の開始・進行・完了・退出、問題の位置、正誤、画面を操作した時間、音声再生の結果をPostHog（米国）へ送信し、授業の改善に役立てます。ランダムなインストール・セッション・授業試行の識別子、学習言語・難易度、アプリのバージョンとOSの種類も送信します。Androidではインストール元のチャネル・キャンペーンとインストール日も送り、どこから利用されたかを調べます。名前、解答、録音、画面は送りません。':'앱 실행, 수업 시작·진행·완료·나가기, 문항 위치, 정답·오답 여부, 화면을 보며 조작한 시간, 음성 재생 결과를 PostHog(미국)로 보내 어떤 수업을 개선할지 알아봐요. 임의로 만든 설치·세션·수업 시도 식별자, 학습 언어·난이도, 앱 버전과 운영체제 종류도 함께 보내요. Android에서는 설치 유입 채널·캠페인과 설치일도 보내 어디서 서당을 알게 됐는지 살펴봐요. 이름, 답안, 녹음, 화면은 보내지 않아요.'}</p><p>${jp?'参加しなくても、すべての授業を利用できます。設定でいつでも停止できます。送信済みの記録は自動では削除されません。':'참여하지 않아도 모든 수업을 이용할 수 있어요. 설정에서 언제든 끌 수 있어요. 이미 전송한 기록은 자동으로 삭제되지 않아요.'}</p><p><a href="analytics-privacy.html" target="_blank" rel="noopener noreferrer">${jp?'詳しく見る':'자세히 보기'}</a></p><p role="status"></p><div class="button-pair"><button type="button" class="secondary" data-consent="false">${jp?'参加しない':'참여 안 함'}</button><button type="button" class="primary" data-consent="true">${jp?'参加する':'참여하기'}</button></div>`;
 if(analytics.installationId){
  const copy=document.createElement('button');copy.type='button';copy.className='secondary';copy.dataset.copyAnalyticsId='';copy.textContent=jp?'削除依頼用の情報をコピー':'삭제 요청 정보 복사';
  copy.addEventListener('click',async()=>{try{await copyDeletionInfo(analytics.installationId);dialog.querySelector('[role=status]').textContent=jp?'コピーしました。':'복사했어요.';}catch{dialog.querySelector('[role=status]').textContent=jp?'コピーできませんでした。もう一度お試しください。':'복사하지 못했어요. 다시 시도해 주세요.';}});
  dialog.querySelector('[role=status]').before(copy);
 }
 document.body.append(dialog);
 return new Promise(resolve=>{
  dialog.addEventListener('click',e=>{const choice=e.target.closest('[data-consent]');if(!choice)return;
   if(!analytics.setConsent(choice.dataset.consent==='true')){dialog.querySelector('[role=status]').textContent=jp?'設定を保存できませんでした。もう一度お試しください。':'설정을 저장하지 못했어요. 다시 시도해 주세요.';return;}
   closeSheet(dialog);
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeSheet(dialog);});
  dialog.addEventListener('close',()=>{dialog.remove();resolve(analytics.consent);},{once:true});
  showSheet(dialog);dialog.querySelector('h2').focus();
 });
}
