import { useEffect, useRef, useState } from "react";
import type { SaveGame, Settings } from "../game/types";
import { solved } from "../game/selectors";
import { challenges } from "../game/case01";
export default function AuxiliaryPanel({
  kind,
  progress,
  settings,
  onSettings,
  onClose,
  onRestart,
  onReplay,
}: {
  kind: "settings" | "journal" | "restart";
  progress: SaveGame | null;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onClose: () => void;
  onRestart: () => void;
  onReplay: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef(document.activeElement);
  const [confirm, setConfirm] = useState(kind === "restart");
  useEffect(() => {
    const previous = returnFocus.current;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-inner">
        <header className="modal-heading">
          <h2 id="modal-title">
            {confirm
              ? "처음부터 시작할까요?"
              : kind === "settings"
                ? "읽기와 동작"
                : "단서 기록"}
          </h2>
          <button onClick={onClose} aria-label="모달 닫기">
            닫기 ×
          </button>
        </header>
        {confirm ? (
          <>
            <p>
              이 사건의 진행을 지우고 다시 시작해요. 읽기와 동작 설정은
              유지돼요.
            </p>
            <div className="button-pair">
              <button onClick={onClose}>돌아가기</button>
              <button className="primary" onClick={onRestart}>
                처음부터 시작
              </button>
            </div>
          </>
        ) : kind === "settings" ? (
          <>
            <label className="setting-row">
              <span>
                <strong>읽기 보조</strong>
                <small>일본어 문장 아래 읽기를 표시해요.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.reading}
                onChange={(e) =>
                  onSettings({ ...settings, reading: e.target.checked })
                }
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>동작</strong>
                <small>움직임을 줄여도 이야기는 계속돼요.</small>
              </span>
              <select
                value={settings.motion}
                onChange={(e) =>
                  onSettings({
                    ...settings,
                    motion: e.target.value === "reduce" ? "reduce" : "system",
                  })
                }
              >
                <option value="system">시스템에 따름</option>
                <option value="reduce">줄이기</option>
              </select>
            </label>
            <button className="restart-button" onClick={onReplay}>
              사용법 다시 보기
            </button>
            {progress && (
              <button
                className="restart-button"
                onClick={() => setConfirm(true)}
              >
                처음부터 다시 시작
              </button>
            )}
          </>
        ) : (
          <>
            {!progress || solved(progress).length === 0 ? (
              <p className="empty-note">
                아직 해석한 단서가 없어요.
                <br />
                책상 위 쪽지부터 함께 읽어 봐요.
              </p>
            ) : (
              solved(progress).map((id, i) => (
                <article className="journal-clue" key={id}>
                  <small>
                    단서 0{i + 1} · {i === 0 ? "책상 위 쪽지" : "선반 위 메모"}
                  </small>
                  <p lang="ja">{challenges[id].original}</p>
                  {settings.reading && (
                    <small lang="ja">{challenges[id].reading}</small>
                  )}
                  <p>{challenges[id].translation}</p>
                </article>
              ))
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
