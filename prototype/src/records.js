import {localDateKey,completedCases} from './learning-history.js';
import {button,icon} from './ui.js';
import {t,isJapaneseUI} from './i18n.js';
export function activityMonth(history,month) {
 const year=month.getFullYear(),index=month.getMonth();
 const days=Array.from({length:new Date(year,index+1,0).getDate()},(_,i)=>{const key=localDateKey(new Date(year,index,i+1));return {key,day:i+1,activity:history?.days[key]};});
 return {days,leadingBlanks:new Date(year,index,1).getDay(),activeDays:days.filter(d=>d.activity).length};
}
export function renderRecords(state,top,tabs,{offset=0,selected=localDateKey(new Date())}={}) {
 const jp=isJapaneseUI(),history=state.courseDirection==='ja-ko'?state.korean?.history:state.history;
 const now=new Date(),month=new Date(now.getFullYear(),now.getMonth()+offset,1),today=localDateKey(now);
 const {days,leadingBlanks,activeDays}=activityMonth(history,month),complete=state.courseDirection==='ja-ko'?Object.values(state.korean?.lessons||{}).filter(l=>l.completed):completedCases(state);
 const d=history?.days[selected];
 const detail=d?[['letters','글자'],['expressions','표현'],['sentences','문장'],['cases','학습 완료']].filter(([key])=>d[key]).map(([key,label])=>`${t(label)} ${d[key]}${jp?key==='cases'?'件':'回':key==='cases'?'개':'회'}`).join(' · '):t(!history||selected<history.startedOn?'날짜별 기록을 시작하기 전이에요.':'학습 기록이 없어요.');
 return `${top('학습 기록')}<main class="page records-page"><dl class="record-overview"><div><dt>${t('완료한 학습')}</dt><dd>${complete.length}<span>${jp?'件':'개'}</span></dd></div><div><dt>${t('학습한 날')}</dt><dd>${Object.keys(history?.days||{}).length}<span>${jp?'日':'일'}</span></dd></div></dl><section class="record-calendar" aria-label="${t('학습 달력')}"><div class="calendar-heading">${button('‹','record-month','calendar-nav',`data-id="-1" aria-label="${t('이전 달')}"`)}<h2>${month.getFullYear()}${jp?'年':'년'} ${month.getMonth()+1}${jp?'月':'월'}</h2>${button('›','record-month','calendar-nav',`data-id="1" aria-label="${t('다음 달')}" ${offset>=0?'disabled':''}`)}</div><div class="calendar-grid">${(jp?['日','月','火','水','木','金','土']:['일','월','화','수','목','금','토']).map(x=>`<span class="weekday">${x}</span>`).join('')}${'<span></span>'.repeat(leadingBlanks)}${days.map(({key,day,activity})=>button(String(day),'record-day',`calendar-day ${activity?'has-activity':''}`,`data-id="${key}" aria-label="${key}${activity?', '+t('학습함'):''}" aria-pressed="${selected===key}" ${key===today?'aria-current="date"':''} ${key>today?'disabled':''}`)).join('')}</div><p class="calendar-detail" aria-live="polite">${Number(selected.slice(5,7))}${jp?'月':'월'} ${Number(selected.slice(8))}${jp?'日':'일'}<br>${detail}</p><p class="record-note">${jp?`今月は${activeDays}日学習`:`이번 달 ${activeDays}일 학습`}</p></section>${button(`${icon('trash')}<span>${t('기록 초기화')}</span>`,'reset','record-row record-reset danger')}</main>${tabs()}`;
}
