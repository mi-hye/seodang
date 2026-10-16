import { useEffect, useReducer, useRef } from "react";
import { CharacterView } from "../character/CharacterView";
import {
  initialOnboarding,
  onboardingReducer,
  onboardingSteps,
  onboardingExample,
} from "../game/onboarding";
import "./onboarding.css";
export default function Onboarding({
  onFinish,
  reducedMotion,
  reading,
  hasProgress,
}: {
  onFinish: () => void;
  reducedMotion: boolean;
  reading: boolean;
  hasProgress: boolean;
}) {
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboarding);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const copy = onboardingSteps[state.step];
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [state.step]);
  return (
    <section className="onboarding" aria-label="서당 시작 안내">
      <div className="onboarding-top">
        <span>
          함께 시작해요 <b>{state.step + 1} / 3</b>
        </span>
        <button className="quiet" onClick={onFinish}>
          건너뛰기
        </button>
      </div>
      <div className={`onboarding-stage stage-${state.step}`}>
        <div className="onboarding-window" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="onboarding-branch" aria-hidden="true">
          ✳
        </div>
        <div className="onboarding-dog">
          <CharacterView
            state={
              state.feedback === "correct" ||
              (state.discovered && state.step === 1)
                ? "happy"
                : state.feedback === "wrong"
                  ? "thinking"
                  : "idle"
            }
            reactionId={
              state.step +
              (state.discovered ? 10 : 0) +
              (state.feedback ? 20 : 0)
            }
            reducedMotion={reducedMotion}
          />
        </div>
        <div className="onboarding-name">
          서당개 <span>너의 이야기 길잡이</span>
        </div>
        <span className="onboarding-scene-label">서당에 온 걸 환영해</span>
      </div>
      <div className="onboarding-content">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 ref={heading} tabIndex={-1}>
          {copy.title}
        </h1>
        <p className="onboarding-description">{copy.description}</p>
        {state.step === 1 && (
          <div className="practice-object">
            <button
              className={state.discovered ? "book discovered" : "book"}
              aria-label="연습용 책 살펴보기"
              onClick={() => dispatch({ type: "discover" })}
            >
              <svg viewBox="0 0 160 86" aria-hidden="true">
                <path d="M25 13L78 21L135 10V66L80 79L25 69Z" fill="#6a8060" />
                <path
                  d="M30 8L80 16L130 6V62L80 74L30 64Z"
                  fill="#fff6dc"
                  stroke="#ae9d7d"
                  strokeWidth="2"
                />
                <path
                  d="M80 16V74M40 25L69 30M40 36L69 41M40 47L62 51M91 27L119 21M91 38L119 32M91 49L112 44"
                  fill="none"
                  stroke="#b9b291"
                  strokeWidth="2"
                />
              </svg>
              <span>
                {state.discovered ? "✓ 쪽지를 발견했어" : "책을 눌러 살펴보기"}
              </span>
            </button>
            <p role="status">
              {state.discovered
                ? "잘 찾았어! 이런 식으로 방 안의 사물을 살펴보면 돼."
                : "궁금한 사물을 누르면 이야기가 이어져."}
            </p>
          </div>
        )}
        {state.step === 2 && (
          <div className="onboarding-example">
            <div className="paper">
              <span className="paper-label">
                연습용 쪽지 · 사건의 단서와는 달라요
              </span>
              <p className="japanese" lang="ja">
                {onboardingExample.original}
              </p>
              {reading && (
                <p className="reading">
                  읽기 <span lang="ja">こんにちは</span> · 곤니치와
                </p>
              )}
            </div>
            {state.feedback ? (
              <div className="feedback" role="status">
                <strong>
                  {state.feedback === "correct"
                    ? "✓ 안녕하세요. 반가운 인사야!"
                    : "낮에 만났을 때 건네는 인사야."}
                </strong>
                <p>
                  {state.feedback === "correct"
                    ? "사건에서도 문장을 읽으면 어디를 살펴볼지 알 수 있어."
                    : "괜찮아. 다시 골라 보자."}
                </p>
                {state.feedback === "wrong" && (
                  <button
                    className="wide"
                    onClick={() => dispatch({ type: "retry" })}
                  >
                    다시 고르기
                  </button>
                )}
              </div>
            ) : (
              <>
                <h2 className="question">{onboardingExample.prompt}</h2>
                <div className="button-pair">
                  {onboardingExample.choices.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => dispatch({ type: "answer", choice: c.id })}
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
                <p className="hint">도움말 · 낮에 만났을 때 하는 인사야.</p>
              </>
            )}
          </div>
        )}
        <div className="onboarding-actions">
          {state.step > 0 && (
            <button onClick={() => dispatch({ type: "back" })}>이전</button>
          )}
          {state.step < 2 ? (
            <button
              className="primary"
              disabled={state.step === 1 && !state.discovered}
              onClick={() => dispatch({ type: "next" })}
            >
              {state.step === 0 ? "같이 둘러보기" : "단서 읽어보기"} →
            </button>
          ) : (
            <button
              className="primary"
              disabled={state.feedback !== "correct"}
              onClick={onFinish}
            >
              {hasProgress ? "이야기로 돌아가기" : "첫 사건 시작하기"} →
            </button>
          )}
        </div>
        <div
          className="onboarding-dots"
          aria-label={`안내 ${state.step + 1}단계`}
        >
          <i className={state.step === 0 ? "current" : ""} />
          <i className={state.step === 1 ? "current" : ""} />
          <i className={state.step === 2 ? "current" : ""} />
        </div>
      </div>
    </section>
  );
}
