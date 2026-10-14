import {t,levelLabels} from './i18n.js';
import { selectedLevel } from "./kana-state.js";
import { episode, expressions } from "./content.js";
import { icon, button, expressionCard } from "./ui.js";
export function renderPanel(kind, state, id) {
  const e = state.episode;
  let title = "",
    body = "";
  if (kind === "settings") {
    title = t('설정');
    const select=(key,label,choices,current)=>`<label class="setting"><span>${t(label)}</span><select data-setting="${key}">${choices.map(([value,text])=>`<option value="${value}" ${String(current)===String(value)?'selected':''}>${t(text)}</option>`).join('')}</select></label>`;
    body = `${id === 'learning' ? select('course','배울 언어',[['ko-ja','일본어'],['ja-ko','한국어']],state.courseDirection)+select('difficulty','난이도',levelLabels.map((label,i)=>[i,label]),selectedLevel(state)) : ''}${select('textScale','글자 크기',[[1,'기본'],[1.2,'크게']],state.settings.textScale)}${select('motion','화면 움직임',[['system','기기 설정 따르기'],['off','항상 멈추기']],state.settings.motion)}<label class="setting"><span>${t('소리 사용')}</span><input type="checkbox" data-setting="sound" ${state.settings.sound?'checked':''}></label>${id==='learning'?button(t('서당개 안내'),'guide','record-row'):''}`;
  }
  if (kind === "clue") {
    const c = episode.clues.find((c) => c.id === id);
    title = c.title;
    body = `<span class="eyebrow">손님이 찾는 가방</span>${expressionCard(
      expressions.find((x) => x.id === c.expressionId),
      { sound: state.settings.sound, compactAudio: true },
    )}${button("가방 고르기", "close")}`;
  }
  if (kind === "hint") {
    title = "단계별 힌트";
    body = `<ol class="hints">${episode.hints
      .slice(0, e.hintLevel)
      .map((h) => `<li>${h}</li>`)
      .join(
        "",
      )}</ol><div class="button-pair">${button(e.hintLevel < 3 ? "힌트 더 보기" : "마지막 힌트", "more-hint", "secondary", e.hintLevel >= 3 ? "disabled" : "")}${button("학습으로 돌아가기", "close")}</div>`;
  }
  if (kind === "restart") {
    title = "처음부터 할까요?";
    body = `<p>이 학습만 처음부터 시작해요. 배운 표현과 설정은 유지돼요.</p><div class="button-pair">${button("이어서 하기", "close", "secondary")}${button("처음부터 시작", "confirm-restart")}</div>`;
  }

  return `<div class="panel-head"><h2 id="panel-title"${kind === "settings" ? ' tabindex="-1" autofocus' : ""}>${title}</h2>${["settings", "clue"].includes(kind) ? "" : button(icon("close"), "close", "icon-button", 'aria-label="닫기"')}</div><div class="panel-body">${body}</div>`;
}
