import type { Dispatch, RefObject } from "react";
import type { GameState, Settings } from "../game/types";
import type { Action } from "../game/reducer";
import { challenges, intro, ending, objectives } from "../game/case01";
export function StoryPanel({
  state,
  settings,
  dispatch,
  onRestart,
  panelRef,
}: {
  state: GameState;
  settings: Settings;
  dispatch: Dispatch<Action>;
  onRestart: () => void;
  panelRef: RefObject<HTMLElement | null>;
}) {
  const { progress: p, ui } = state;
  const sentence = (id: keyof typeof challenges, translated: boolean) => {
    const c = challenges[id];
    return (
      <div className="paper">
        <span className="paper-label">
          {id === "shelf-note" ? "책상 위 쪽지" : "선반 위 메모"}
        </span>
        <p className="japanese" lang="ja">
          {c.original}
        </p>
        {settings.reading && (
          <p className="reading" lang="ja">
            {c.reading}
          </p>
        )}
        {translated && <p className="translation">{c.translation}</p>}
      </div>
    );
  };
  let content;
  if (!ui.playing)
    content = (
      <>
        <p className="eyebrow">서당개와 함께하는 작은 사건</p>
        <h1>
          첫 수업 전,
          <br />
          사라진 열쇠
        </h1>
        <p className="welcome-copy">
          쪽지 두 장, 작은 서재 하나.
          <br />
          일본어 단서를 읽고 도장이 든 서랍을 열어 봐요.
        </p>
        {p ? (
          <div className="button-pair">
            <button onClick={onRestart}>처음부터</button>
            <button
              className="primary"
              onClick={() => dispatch({ type: "resume" })}
            >
              {p.step === "complete" ? "결과 보기" : "이어하기"} <span>→</span>
            </button>
          </div>
        ) : (
          <button
            className="primary wide"
            onClick={() => dispatch({ type: "start" })}
          >
            시작하기 <span>→</span>
          </button>
        )}
        <p className="footnote">그림 속 사물을 눌러 이야기를 이어 가요.</p>
      </>
    );
  else if (!p) return null;
  else if (p.step === "complete")
    content = (
      <>
        <p className="eyebrow">CASE 01 · COMPLETE</p>
        <h1>사건 해결!</h1>
        <p>
          열쇠와 도장을 찾았어요.
          <br />
          이제 첫 수업을 시작할 수 있겠네요.
        </p>
        {sentence("shelf-note", true)}
        {sentence("box-note", true)}
        <button className="primary wide" onClick={onRestart}>
          다시 하기 ↺
        </button>
      </>
    );
  else if (ui.panel?.kind === "challenge") {
    const c = challenges[ui.panel.id];
    content = (
      <>
        <div className="panel-top">
          <span className="eyebrow">단서를 함께 읽어요</span>
          <button
            className="quiet"
            aria-label="조사 패널 닫기"
            onClick={() => dispatch({ type: "close" })}
          >
            닫기 ×
          </button>
        </div>
        {sentence(c.id, ui.feedback === "correct")}
        {ui.feedback ? (
          <div className={`feedback ${ui.feedback}`} role="status">
            <strong>
              {ui.feedback === "correct" ? "✓ 알겠어!" : "다시 읽어 볼까?"}
            </strong>
            <p>
              {ui.feedback === "correct" ? c.correctFeedback : c.wrongFeedback}
            </p>
            <button
              className="primary wide"
              onClick={() =>
                dispatch({
                  type: ui.feedback === "correct" ? "close" : "retry",
                })
              }
            >
              {ui.feedback === "correct" ? "계속" : "다시 고르기"} →
            </button>
          </div>
        ) : (
          <>
            <h2 className="question">{c.prompt}</h2>
            <div className="choices">
              {c.choices.map((choice, i) => (
                <button
                  key={choice.id}
                  onClick={() =>
                    dispatch({ type: "answer", id: c.id, choice: choice.id })
                  }
                >
                  <span className="choice-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {choice.text}
                  <span className="choice-arrow">↗</span>
                </button>
              ))}
            </div>
            <button
              className="hint-button"
              onClick={() => dispatch({ type: "hint" })}
            >
              ? 도움말
            </button>
            {ui.hint && (
              <p className="hint" role="status">
                {c.hint}
              </p>
            )}
          </>
        )}
      </>
    );
  } else if (ui.panel) {
    const panel = ui.panel;
    content = (
      <>
        <div className="panel-top">
          <span className="speaker">
            <i /> 서당개
          </span>
          <button
            className="quiet"
            aria-label="조사 패널 닫기"
            onClick={() => dispatch({ type: "close" })}
          >
            닫기 ×
          </button>
        </div>
        {panel.kind === "message" ? (
          <>
            <p className="dialogue">{panel.text}</p>
            {panel.clue && sentence(panel.clue, true)}
            <button
              className="wide"
              onClick={() => dispatch({ type: "close" })}
            >
              다시 살펴보기
            </button>
          </>
        ) : panel.kind === "box" ? (
          <>
            <p className="dialogue">
              상자 안에 작은 열쇠가 있어!
              <br />
              이걸로 서랍을 열 수 있겠어.
            </p>
            <button
              className="primary wide"
              onClick={() => dispatch({ type: "take-key" })}
            >
              열쇠 챙기기 →
            </button>
          </>
        ) : (
          <>
            <p className="dialogue">
              열쇠가 꼭 맞을 것 같아.
              <br />
              이제 서랍을 열어 보자.
            </p>
            <button
              className="primary wide"
              onClick={() => dispatch({ type: "use-key" })}
            >
              열쇠로 서랍 열기 →
            </button>
          </>
        )}
      </>
    );
  } else if (p.step === "intro" || p.step === "ending") {
    const lines = p.step === "intro" ? intro : ending;
    content = (
      <>
        <span className="speaker">
          <i /> 서당개{" "}
          <small>
            {ui.line + 1} / {lines.length}
          </small>
        </span>
        <p className="dialogue" aria-live="polite">
          {lines[ui.line]}
        </p>
        <button
          className="primary wide"
          onClick={() => dispatch({ type: "next" })}
        >
          {ui.line === lines.length - 1
            ? p.step === "intro"
              ? "조사 시작"
              : "사건 해결 보기"
            : "다음"}{" "}
          →
        </button>
      </>
    );
  } else
    content = (
      <>
        <span className="speaker">
          <i /> 서당개
        </span>
        <p className="dialogue">{objectives[p.step]}.</p>
        <p className="footnote left">위의 그림에서 사물을 눌러 살펴봐.</p>
      </>
    );
  return (
    <section
      className={`story-panel ${!ui.playing ? "welcome" : ""}`}
      ref={panelRef}
      tabIndex={-1}
      aria-label="이야기와 조사"
    >
      {content}
    </section>
  );
}
