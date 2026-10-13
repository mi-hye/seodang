import {localDateKey,completedCases} from './learning-history.js';
import {button} from './ui.js';
export function activityMonth(history,month) {
 const year=month.getFullYear(),index=month.getMonth();
 const days=Array.from({length:new Date(year,index+1,0).getDate()},(_,i)=>{const key=localDateKey(new Date(year,index,i+1));return {key,day:i+1,activity:history?.days[key]};});
 return {days,leadingBlanks:new Date(year,index,1).getDay(),activeDays:days.filter(d=>d.activity).length};
}
export function renderRecords(state,top,tabs,{offset=0,selected=localDateKey(new Date())}={}) {
 const now=new Date(),month=new Date(now.getFullYear(),now.getMonth()+offset,1),today=localDateKey(now);
 const {days,leadingBlanks,activeDays}=activityMonth(state.history,month),complete=completedCases(state);
 const d=state.history?.days[selected];
 const detail=d?[['letters','글자'],['expressions','표현'],['sentences','문장'],['cases','학습 완료']].filter(([key])=>d[key]).map(([key,label])=>`${label} ${d[key]}${key==='cases'?'개':'회'}`).join(' · '):!state.history||selected<state.history.startedOn?'날짜별 기록을 시작하기 전이에요.':'이날은 학습 기록이 없어요.';
 return `${top('학습 기록')}<main class="page records-page"><dl class="record-overview"><div><dt>완료한 학습</dt><dd>${complete.length}<span>개</span></dd></div><div><dt>학습한 날</dt><dd>${Object.keys(state.history?.days||{}).length}<span>일</span></dd></div></dl><section class="record-calendar" aria-label="학습 달력"><div class="calendar-heading">${button('‹','record-month','calendar-nav','data-id="-1" aria-label="이전 달"')}<h2>${month.getFullYear()}년 ${month.getMonth()+1}월</h2>${button('›','record-month','calendar-nav',`data-id="1" aria-label="다음 달" ${offset>=0?'disabled':''}`)}</div><div class="calendar-grid">${['일','월','화','수','목','금','토'].map(x=>`<span class="weekday">${x}</span>`).join('')}${'<span></span>'.repeat(leadingBlanks)}${days.map(({key,day,activity})=>button(String(day),'record-day',`calendar-day ${activity?'has-activity':''}`,`data-id="${key}" aria-label="${key}${activity?', 학습함':''}" aria-pressed="${selected===key}" ${key===today?'aria-current="date"':''} ${key>today?'disabled':''}`)).join('')}</div><p class="calendar-detail" aria-live="polite">${Number(selected.slice(5,7))}월 ${Number(selected.slice(8))}일<br>${detail}</p><p class="record-note">이번 달 ${activeDays}일 학습 · 날짜별 기록은 업데이트 후부터</p></section><details class="record-management"><summary>기록 관리</summary><div class="button-pair">${button('기록 내보내기','export','record-row')}${button('기록 초기화','reset','record-row danger')}</div></details></main>${tabs()}`;
}
