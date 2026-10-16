import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import { initialState, reducer } from "./game/reducer";
import { objectives } from "./game/case01";
import { drawerOpen, hasKey, solved } from "./game/selectors";
import type { Place } from "./game/types";
import {
  createStorage,
  defaultSettings,
  GAME_KEY,
  SETTINGS_KEY,
  validSave,
  validSettings,
  ONBOARDING_KEY,
  validOnboarding,
} from "./storage/storage";
import { RoomScene } from "./components/RoomScene";
import { StoryPanel } from "./components/StoryPanel";
const Onboarding = lazy(() => import("./components/Onboarding"));
const AuxiliaryPanel = lazy(() => import("./components/AuxiliaryPanel"));
const DevPanel = import.meta.env.DEV
  ? lazy(() => import("./components/DevPanel"))
  : () => null;
export default function App() {
  const [storage] = useState(() => createStorage(() => window.localStorage));
  const [loaded] = useState(() => ({
    game: storage.read(GAME_KEY, validSave),
    settings: storage.read(SETTINGS_KEY, validSettings),
    onboarding: storage.read(ONBOARDING_KEY, validOnboarding),
  }));
  const [showOnboarding, setShowOnboarding] = useState(
    !loaded.onboarding.value,
  );
  const [state, dispatch] = useReducer(
    reducer,
    loaded.game.value,
    initialState,
  );
  const [settings, setSettings] = useState(
    loaded.settings.value ?? defaultSettings,
  );
  const [notice, setNotice] = useState(
    storage.unavailable
      ? "이 브라우저에서는 진행이 저장되지 않아요"
      : loaded.game.invalid
        ? "저장된 진행을 읽지 못해 새로 시작합니다"
        : loaded.settings.invalid
          ? "읽기와 동작 설정을 기본값으로 복구했어요"
          : "",
  );
  const [modal, setModal] = useState<"settings" | "journal" | "restart" | null>(
    null,
  );
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const panelRef = useRef<HTMLElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const savedProgress = useRef(loaded.game.value);
  const savedSettings = useRef(settings);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (state.progress && state.progress !== savedProgress.current) {
      savedProgress.current = state.progress;
      if (!storage.write(GAME_KEY, state.progress))
        setNotice("이 브라우저에서는 진행이 저장되지 않아요");
    }
  }, [state.progress, storage]);
  useEffect(() => {
    if (settings !== savedSettings.current) {
      savedSettings.current = settings;
      if (!storage.write(SETTINGS_KEY, settings))
        setNotice("이 브라우저에서는 진행이 저장되지 않아요");
    }
  }, [settings, storage]);
  useEffect(() => {
    if (state.ui.reaction === "idle") return;
    const id = state.ui.reactionId;
    const timer = window.setTimeout(
      () => dispatch({ type: "settle", id }),
      state.ui.reaction === "talking" ? 900 : 1100,
    );
    return () => window.clearTimeout(timer);
  }, [state.ui.reaction, state.ui.reactionId]);
  useEffect(() => {
    if (!state.ui.playing) return;
    if (state.ui.panel) {
      panelRef.current?.focus({ preventScroll: true });
      panelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
    } else if (lastTrigger.current?.isConnected) {
      lastTrigger.current.focus({ preventScroll: true });
    }
  }, [state.ui.panel, state.ui.playing]);
  const p = state.progress;
  const enabled =
    state.ui.playing &&
    !!p &&
    !["intro", "ending", "complete"].includes(p.step);
  const active: Place | null =
    enabled && p
      ? ((
          {
            seek_note: "desk",
            seek_shelf: "shelf",
            seek_box: "blue-box",
            use_key: "desk",
          } as Record<string, Place>
        )[p.step] ?? null)
      : null;
  const reduced = settings.motion === "reduce" || systemReduced;
  const inspect = (place: Place) => {
    lastTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dispatch({ type: "inspect", place });
  };
  const finishOnboarding = () => {
    if (!storage.write(ONBOARDING_KEY, { schemaVersion: 1, completed: true }))
      setNotice("이 브라우저에서는 진행이 저장되지 않아요");
    setShowOnboarding(false);
    if (!state.ui.playing) dispatch({ type: p ? "resume" : "start" });
  };
  // Ignore the second click of a double-click, including when an action replaces the button below it.
  return (
    <main
      onClickCapture={(event) => {
        if (event.detail > 1) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      className={`game-shell ${reduced ? "reduce" : ""}`}
    >
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">서</span>
          <span>
            서당<small>작은 이야기, 한 걸음</small>
          </span>
        </div>
        <nav aria-label="보조 메뉴">
          {!showOnboarding && (
            <button onClick={() => setModal("journal")}>
              단서 <span className="count">{p ? solved(p).length : 0}</span>
            </button>
          )}
          <button onClick={() => setModal("settings")} aria-label="설정">
            설정
          </button>
        </nav>
      </header>
      {showOnboarding ? (
        <Suspense
          fallback={
            <p className="notice" role="status">
              서당개를 만나러 가는 중…
            </p>
          }
        >
          <Onboarding
            onFinish={finishOnboarding}
            reducedMotion={reduced}
            reading={settings.reading}
            hasProgress={!!p}
          />
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </Suspense>
      ) : (
        <>
          <div className="case-strip">
            <span>사건 01</span>
            <span>첫 수업 전, 사라진 열쇠</span>
            <span className="case-flower">✳</span>
          </div>
          <div className="objective">
            <span className="compass">◇</span>
            <p>
              {state.ui.playing && p
                ? objectives[p.step]
                : "서당개와 함께 단서를 찾아보세요"}
            </p>
          </div>
          <RoomScene
            active={active}
            enabled={enabled}
            boxOpen={
              !!p &&
              (state.ui.panel?.kind === "box" ||
                ["use_key", "ending", "complete"].includes(p.step))
            }
            drawerOpen={!!p && drawerOpen(p)}
            hasKey={!!p && ["use_key", "ending", "complete"].includes(p.step)}
            state={state.ui.reaction}
            reactionId={state.ui.reactionId}
            reducedMotion={reduced}
            onInspect={inspect}
            onDog={() => dispatch({ type: "react", state: "surprised" })}
          />
          <div className="inventory">
            <span>소지품</span>
            {p && hasKey(p) ? (
              <strong>
                ⚿ 작은 열쇠 <small>× 1</small>
              </strong>
            ) : p && drawerOpen(p) ? (
              <strong>
                도장 발견 <small>열쇠 사용 완료</small>
              </strong>
            ) : (
              <span className="empty">아직 챙긴 물건이 없어요</span>
            )}
            <span className="inventory-line" />
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <StoryPanel
            state={state}
            settings={settings}
            dispatch={dispatch}
            onRestart={() => setModal("restart")}
            panelRef={panelRef}
          />
        </>
      )}
      <footer className="game-footer">
        <span>SEODANG</span>
        <span>이야기 속에서 만나는 일본어</span>
      </footer>
      {modal && (
        <Suspense fallback={<p role="status">패널을 여는 중…</p>}>
          <AuxiliaryPanel
            kind={modal}
            progress={p}
            settings={settings}
            onSettings={setSettings}
            onClose={() => setModal(null)}
            onReplay={() => {
              setModal(null);
              setShowOnboarding(true);
            }}
            onRestart={() => {
              dispatch({ type: "start" });
              setModal(null);
            }}
          />
        </Suspense>
      )}
      {import.meta.env.DEV &&
        new URLSearchParams(window.location.search).get("debug") === "1" && (
          <Suspense fallback={null}>
            <DevPanel
              step={p?.step ?? "not-started"}
              onReact={(s) => dispatch({ type: "react", state: s })}
            />
          </Suspense>
        )}
    </main>
  );
}
