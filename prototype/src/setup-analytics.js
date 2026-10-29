import {analytics} from './analytics.js';

// Loaded only on the level screen; a draft choice never starts collection.
export function mountSetupAnalytics(root,isJapanese){
 let initial=analytics.consent,checked=initial===true,touched=false;
 root.className='setup-analytics';
 function update(){
  const jp=isJapanese();root.lang=jp?'ja':'ko';
  root.innerHTML=`<label class="analytics-choice"><input type="checkbox" name="analyticsSharing" aria-describedby="analytics-description" ${checked?'checked':''}><span>${jp?'学習統計を共有する（任意）':'학습 통계 공유 (선택)'}</span></label><p id="analytics-description">${jp?'学習の利用記録を米国のPostHogへ送り、授業の改善に役立てます。共有しなくてもすべての授業を利用でき、設定でいつでも停止できます。':'학습 이용 기록을 미국 PostHog로 보내 수업 개선에 활용해요. 공유하지 않아도 모든 수업을 이용할 수 있고 설정에서 언제든 끌 수 있어요.'}</p><a href="analytics-privacy.html" target="_blank" rel="noopener noreferrer">${jp?'送信する情報・米国への転送について':'수집 항목·미국 전송 자세히 보기'}</a>`;
  root.querySelector('input').addEventListener('change',event=>{checked=event.target.checked;touched=true;});
 }
 update();
 return {update,save(){
  // Respect a consent change made in another tab while setup was open.
  analytics.reload();
  if(!touched||analytics.consent!==initial)return;
  if(analytics.consent!==checked)analytics.setConsent(checked);
 }};
}
