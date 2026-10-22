import {button,esc,quotedText} from './ui.js';
import {japaneseLessonUI} from './curriculum.js';
import {t} from './i18n.js';
import {studyCatalog} from './study-catalog.js';
import {MISSION_MAX_LENGTH,currentMission} from './mission-state.js';
import {hasMissionTask,missionTask} from './mission-content.js';
import {formatDay} from './growth-view.js';

export const activeMission=state=>currentMission(state,hasMissionTask);

export function renderMission(state,header,{error='',pendingText}={}){
 const jp=japaneseLessonUI(state),L=(ko,ja)=>jp?ja:ko,learn=jp?'ko':'ja',ui=jp?'ja':'ko';
 const title=L('오늘의 작은 미션','今日の小さなミッション'),m=activeMission(state);
 const status=(message,kind='')=>`<p class="growth-status${kind?` ${kind}`:''}" role="status">${esc(message)}</p>`;
 const back=button(L('학습 기록','学習記録'),'my','secondary');
 if(!m)return `${header(title)}<main class="page growth-page mission-page" lang="${ui}"><h1>${title}</h1><p class="growth-note">${L('미션이 있는 수업을 하나 마치면, 그 수업과 이어지는 미션이 열려요. 영상과 글자 수업에는 아직 미션이 없어요.','ミッションのある授業を一つ終えると、その授業につながるミッションが始まります。動画と文字の授業には、まだミッションがありません。')}</p>${back}</main>`;
 const lesson=studyCatalog(state).find(l=>l.key===m.lessonKey);
 const source=`<section class="growth-situation"><p class="growth-label">${L('마친 수업','終えた授業')} · ${formatDay(m.lessonOn,jp)}</p>${lesson?`<p class="mission-lesson">${esc(lesson.position)} · ${quotedText(t(lesson.title))}</p>`:''}<p class="growth-label">${L('미션','ミッション')}</p><p>${esc(missionTask(m.lessonKey))}</p></section>`;
 const stale=m.stale?`<p class="growth-note">${L(`${formatDay(m.updatedOn,jp)}에 쓰던 미션이에요. 이어서 쓰거나, 지우고 최근 수업의 미션을 받을 수 있어요.`,`${formatDay(m.updatedOn,jp)}に書いていたミッションです。続きを書くか、消して最近の授業のミッションを受け取れます。`)}</p>${button(L('지우고 새 미션 받기','消して新しいミッションへ'),'mission-discard','text-button')}`:'';
 const sentence=`<article class="growth-answer"><p class="growth-label">${L('내 문장','自分の文')}</p><p class="growth-text" lang="${learn}">${esc(m.text)}</p></article>`;
 let body;
 if(m.status==='draft'){
  const value=pendingText??m.text;
  body=`${stale}<label class="growth-field" for="mission-answer">${L('일본어로 써 주세요','韓国語で書きましょう')}</label>
<textarea id="mission-answer" class="growth-input" data-mission-draft data-lesson-key="${esc(m.lessonKey)}" data-lesson-on="${esc(m.lessonOn)}" lang="${learn}" maxlength="${MISSION_MAX_LENGTH}" rows="4" autocomplete="off">${esc(value)}</textarea>
<p class="growth-count" data-growth-count>${value.length} / ${MISSION_MAX_LENGTH}</p>${error?status(error,'is-error'):status(pendingText===undefined&&m.text?L('쓰던 문장을 불러왔어요.','書きかけの文を読み込みました。'):'')}
<div class="button-pair">${back}${button(L('저장','保存'),'mission-save','primary',`data-lesson-key="${esc(m.lessonKey)}" data-lesson-on="${esc(m.lessonOn)}" ${value.trim()?'':'disabled'}`)}</div>`;
 }else if(m.status==='ready')body=`${stale}${sentence}<p class="growth-note">${quotedText(L('교류 글쓰기 화면에서 「미션 문장 넣기」를 누르면 쓰던 초안 끝에 들어가요. 게시는 직접 눌러야 해요.','交流の投稿画面で「ミッションの文を入れる」を押すと、書きかけの下書きの最後に入ります。投稿はご自身で押すまで行われません。'))}</p>${error?status(error,'is-error'):''}
<div class="button-pair">${button(L('고쳐 쓰기','書き直す'),'mission-edit','secondary')}${button(L('교류로 가져가기','交流に持っていく'),'mission-community','primary')}</div>`;
 else body=`${sentence}<p class="growth-note">${L('교류 초안에 넣었어요. 게시는 교류에서 직접 해 주세요.','交流の下書きに入れました。投稿は交流でご自身で行ってください。')}</p>
<div class="button-pair">${back}${button(L('교류 열기','交流を開く'),'community','primary')}</div>`;
 return `${header(title)}<main class="page growth-page mission-page" lang="${ui}"><h1>${title}</h1>${source}${body}</main>`;
}
