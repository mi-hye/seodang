import { selectedLevel } from "./kana-state.js";
import { episode, expressions } from "./content.js";
import { icon, button, expressionCard } from "./ui.js";
export function renderPanel(kind, state, id) {
  const e = state.episode;
  let title = "",
    body = "";
  if (kind === "settings") {
    title = "설정";
    body = `${id === "learning" ? `<label class="setting difficulty-setting"><span>난이도</span><select data-setting="difficulty">${["1 · 글자부터 배우기", "2 · 단어와 짧은 표현", "3 · 짧은 문장", "4 · 일상 대화", "5 · 글의 핵심과 의견", "6 · 일본어로 읽고 생각하기", "7 · 듣고 숨은 뜻 이해하기"].map((label, i) => `<option value="${i + 1}" ${selectedLevel(state) === i + 1 ? "selected" : ""}>${label}</option>`).join("")}</select></label>` : ""}<label class="setting"><span>글자 크기</span><select data-setting="textScale"><option value="1" ${state.settings.textScale === 1 ? "selected" : ""}>기본</option><option value="1.2" ${state.settings.textScale === 1.2 ? "selected" : ""}>크게</option></select></label><label class="setting"><span>화면 움직임</span><select data-setting="motion"><option value="system" ${state.settings.motion === "system" ? "selected" : ""}>기기 설정 따르기</option><option value="off" ${state.settings.motion === "off" ? "selected" : ""}>항상 멈추기</option></select></label><label class="setting"><span>소리 사용</span><input type="checkbox" data-setting="sound" ${state.settings.sound ? "checked" : ""}></label>`;
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
      )}</ol><div class="button-pair">${button(e.hintLevel < 3 ? "도움 한 단계 더 보기" : "모든 도움을 확인했어요", "more-hint", "secondary", e.hintLevel >= 3 ? "disabled" : "")}${button("사건으로 돌아가기", "close")}</div>`;
  }
  if (kind === "restart") {
    title = "사건을 다시 시작할까요?";
    body = `<p>이 사건의 진행·단서·이해 확인을 처음으로 돌려요. 이미 만난 표현과 읽기 설정은 남겨 둘게요.</p><div class="button-pair">${button("이어 읽기", "close", "secondary")}${button("처음부터 시작", "confirm-restart")}</div>`;
  }
  if (kind === "reset") {
    title = "이 기기의 기록을 지울까요?";
    body = `<p>이 프로토타입의 사건 진행, 표현 노트, 설정이 삭제돼요. 되돌릴 수 없어요.</p>${button("기록 먼저 내보내기", "export", "secondary")}${button("프로토타입 기록 삭제", "confirm-reset", "primary destructive")}${button("취소", "close", "text-button")}<p role="status"></p>`;
  }
  return `<div class="panel-head"><h2 id="panel-title"${kind === "settings" ? ' tabindex="-1" autofocus' : ""}>${title}</h2>${["settings", "clue"].includes(kind) ? "" : button(icon("close"), "close", "icon-button", 'aria-label="닫기"')}</div><div class="panel-body">${body}</div>`;
}
