import { challenges, intro, ending } from "./case01";
import { rank, solved } from "./selectors";
import type {
  SaveGame,
  GameState,
  ChallengeId,
  Place,
  CharacterState,
  Panel,
} from "./types";
export const newGame = (): SaveGame => ({
  schemaVersion: 1,
  caseId: "case-01-lost-key",
  step: "intro",
  wrongAttempts: { "shelf-note": 0, "box-note": 0 },
  hintUsed: { "shelf-note": false, "box-note": false },
});
export const initialState = (progress: SaveGame | null): GameState => ({
  progress,
  ui: {
    playing: false,
    line: 0,
    panel: null,
    feedback: null,
    hint: false,
    reaction: "idle",
    reactionId: 0,
  },
});
export type Action =
  | {
      type:
        | "start"
        | "resume"
        | "next"
        | "close"
        | "retry"
        | "hint"
        | "take-key"
        | "use-key";
    }
  | { type: "inspect"; place: Place }
  | { type: "answer"; id: ChallengeId; choice: string }
  | { type: "react"; state: CharacterState }
  | { type: "settle"; id: number };
export function reducer(state: GameState, action: Action): GameState {
  const { progress: p, ui } = state;
  const react = (
    reaction: CharacterState,
    extra: Partial<GameState["ui"]> = {},
  ): GameState["ui"] => ({
    ...ui,
    ...extra,
    reaction,
    reactionId: ui.reactionId + 1,
  });
  if (action.type === "start")
    return {
      progress: newGame(),
      ui: react("talking", {
        playing: true,
        line: 0,
        panel: null,
        feedback: null,
        hint: false,
      }),
    };
  if (action.type === "resume" && p)
    return {
      ...state,
      ui: react(p.step === "complete" ? "happy" : "talking", {
        playing: true,
        line: 0,
        panel: null,
        feedback: null,
        hint: false,
      }),
    };
  if (action.type === "react") return { ...state, ui: react(action.state) };
  if (action.type === "settle")
    return ui.reactionId === action.id
      ? { ...state, ui: { ...ui, reaction: "idle" } }
      : state;
  if (!p || !ui.playing) return state;
  if (action.type === "close")
    return {
      ...state,
      ui: { ...ui, panel: null, feedback: null, hint: false },
    };
  if (action.type === "next" && (p.step === "intro" || p.step === "ending")) {
    const lines = p.step === "intro" ? intro : ending;
    return ui.line < lines.length - 1
      ? { ...state, ui: react("talking", { line: ui.line + 1 }) }
      : {
          progress: {
            ...p,
            step: p.step === "intro" ? "seek_note" : "complete",
          },
          ui: react(p.step === "intro" ? "idle" : "happy", { line: 0 }),
        };
  }
  if (action.type === "inspect") {
    if (["intro", "ending", "complete"].includes(p.step)) return state;
    let panel: Panel;
    if (action.place === "desk") {
      if (p.step === "seek_note")
        panel = { kind: "challenge", id: "shelf-note" };
      else if (p.step === "use_key") panel = { kind: "drawer" };
      else
        panel = {
          kind: "message",
          text: "잠겨 있어. 열쇠가 필요해. 쪽지에는 이렇게 적혀 있었어.",
          clue: "shelf-note",
        };
    } else if (action.place === "shelf") {
      if (p.step === "seek_shelf")
        panel = { kind: "challenge", id: "box-note" };
      else if (solved(p).includes("box-note"))
        panel = {
          kind: "message",
          text: "선반에서 읽은 메모야.",
          clue: "box-note",
        };
      else
        panel = {
          kind: "message",
          text: "책이 가지런히 놓여 있어. 먼저 책상의 쪽지를 읽어 보자.",
        };
    } else {
      panel =
        p.step === "seek_box"
          ? { kind: "box" }
          : {
              kind: "message",
              text:
                rank(p) >= 4
                  ? "열쇠는 챙겼어. 이제 서랍을 열자."
                  : "파란 상자네. 무엇을 찾는지 단서를 더 읽어 보자.",
            };
    }
    return {
      ...state,
      ui: react(panel.kind === "challenge" ? "talking" : "thinking", {
        panel,
        feedback: null,
        hint: false,
      }),
    };
  }
  if (action.type === "answer") {
    if (
      ui.panel?.kind !== "challenge" ||
      ui.panel.id !== action.id ||
      ui.feedback
    )
      return state;
    if (
      (action.id === "shelf-note" && p.step !== "seek_note") ||
      (action.id === "box-note" && p.step !== "seek_shelf")
    )
      return state;
    const c = challenges[action.id];
    if (!c.choices.some((choice) => choice.id === action.choice)) return state;
    const correct = action.choice === c.correctChoiceId;
    return {
      progress: correct
        ? { ...p, step: action.id === "shelf-note" ? "seek_shelf" : "seek_box" }
        : {
            ...p,
            wrongAttempts: {
              ...p.wrongAttempts,
              [action.id]: p.wrongAttempts[action.id] + 1,
            },
          },
      ui: react(correct ? "happy" : "thinking", {
        feedback: correct ? "correct" : "wrong",
      }),
    };
  }
  if (action.type === "retry" && ui.feedback === "wrong")
    return { ...state, ui: { ...ui, feedback: null } };
  if (action.type === "hint" && ui.panel?.kind === "challenge" && !ui.feedback)
    return {
      progress: { ...p, hintUsed: { ...p.hintUsed, [ui.panel.id]: true } },
      ui: react("thinking", { hint: true }),
    };
  if (
    action.type === "take-key" &&
    p.step === "seek_box" &&
    ui.panel?.kind === "box"
  )
    return {
      progress: { ...p, step: "use_key" },
      ui: react("happy", { panel: null }),
    };
  if (
    action.type === "use-key" &&
    p.step === "use_key" &&
    ui.panel?.kind === "drawer"
  )
    return {
      progress: { ...p, step: "ending" },
      ui: react("happy", { panel: null, line: 0 }),
    };
  return state;
}
