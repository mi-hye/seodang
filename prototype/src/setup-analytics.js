import {analytics} from './analytics.js';

// Loaded only on the level screen; a draft choice never starts collection.
export function mountSetupAnalytics(root,isJapanese){
 let initial=analytics.consent,checked=initial!==false,touched=false;
 root.className='setup-analytics';
 function update(){
  const jp=isJapanese();root.lang=jp?'ja':'ko';
  root.innerHTML=`<label class="analytics-choice"><input type="checkbox" name="analyticsSharing" aria-describedby="analytics-description" ${checked?'checked':''}><span>${jp?'学習統計の共有に同意する（任意）':'학습 통계 공유 동의 (선택)'}</span></label><p id="analytics-description">${jp?'学習統計は、アプリをより使いやすくするために利用します。同意しなくてもすべての授業を利用でき、設定でいつでも停止できます。':'학습 통계는 앱을 더 편리하게 개선하는 데 사용해요. 동의하지 않아도 모든 수업을 이용할 수 있고 설정에서 언제든 끌 수 있어요.'}</p>`;
  root.querySelector('input').addEventListener('change',event=>{checked=event.target.checked;touched=true;});
 }
 update();
 return {update,save(){
  // Respect a consent change made in another tab while setup was open.
  analytics.reload();
  if((!touched&&initial!==null)||analytics.consent!==initial)return;
  if(analytics.consent!==checked)analytics.setConsent(checked);
 }};
}
