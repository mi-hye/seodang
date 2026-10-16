import type { CharacterState } from "../game/types";
export default function DevPanel({
  step,
  onReact,
}: {
  step: string;
  onReact: (s: CharacterState) => void;
}) {
  return (
    <details className="dev-panel">
      <summary>개발 테스트 · {step}</summary>
      <p>캐릭터만 재생하며 사건 진행은 바꾸지 않아요.</p>
      <div>
        {(["idle", "talking", "happy", "thinking", "surprised"] as const).map(
          (s) => (
            <button key={s} onClick={() => onReact(s)}>
              {s}
            </button>
          ),
        )}
      </div>
    </details>
  );
}
