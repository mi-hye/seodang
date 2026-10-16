import { describe, expect, it } from "vitest";
import { initialState, newGame, reducer, type Action } from "./reducer";
import { challenges } from "./case01";
import { drawerOpen, hasKey, solved } from "./selectors";
import type { GameState, Step } from "./types";
const run = (s: GameState, ...actions: Action[]) => actions.reduce(reducer, s);
const at = (step: Step): GameState => ({
  ...initialState({ ...newGame(), step }),
  ui: { ...initialState(null).ui, playing: true },
});
const answer = (id: "shelf-note" | "box-note", choice: string): Action => ({
  type: "answer",
  id,
  choice,
});
describe("사건 규칙", () => {
  it("시작 전에는 진행이 없고, 전체 사건을 직접 조사해 완주한다", () => {
    let s = initialState(null);
    expect(s.progress).toBeNull();
    s = run(
      s,
      { type: "start" },
      { type: "next" },
      { type: "next" },
      { type: "next" },
    );
    expect(s.progress?.step).toBe("seek_note");
    s = run(s, { type: "inspect", place: "desk" }, answer("shelf-note", "b"));
    expect(s.progress?.step).toBe("seek_shelf");
    expect(s.ui.feedback).toBe("correct");
    s = run(
      s,
      { type: "close" },
      { type: "inspect", place: "shelf" },
      answer("box-note", "a"),
    );
    expect(s.progress?.step).toBe("seek_box");
    s = run(
      s,
      { type: "close" },
      { type: "inspect", place: "blue-box" },
      { type: "take-key" },
    );
    expect(hasKey(s.progress!)).toBe(true);
    s = run(s, { type: "inspect", place: "desk" }, { type: "use-key" });
    expect(drawerOpen(s.progress!)).toBe(true);
    expect(hasKey(s.progress!)).toBe(false);
    s = run(s, { type: "next" }, { type: "next" });
    expect(s.progress?.step).toBe("complete");
    expect(solved(s.progress!)).toHaveLength(2);
  });
  for (const [id, c] of Object.entries(challenges))
    for (const choice of c.choices)
      it(`${id}: ${choice.text} 판정`, () => {
        const s = run(
          at(id === "shelf-note" ? "seek_note" : "seek_shelf"),
          { type: "inspect", place: id === "shelf-note" ? "desk" : "shelf" },
          answer(c.id, choice.id),
        );
        expect(s.ui.feedback).toBe(
          choice.id === c.correctChoiceId ? "correct" : "wrong",
        );
        expect(s.progress?.step).toBe(
          choice.id === c.correctChoiceId
            ? id === "shelf-note"
              ? "seek_shelf"
              : "seek_box"
            : id === "shelf-note"
              ? "seek_note"
              : "seek_shelf",
        );
      });
  it("오답은 한 번만 집계하고 다시 고른 뒤 정답을 처리한다", () => {
    let s = run(
      at("seek_note"),
      { type: "inspect", place: "desk" },
      answer("shelf-note", "a"),
      answer("shelf-note", "a"),
    );
    expect(s.progress?.wrongAttempts["shelf-note"]).toBe(1);
    s = run(
      s,
      { type: "retry" },
      answer("shelf-note", "b"),
      answer("shelf-note", "b"),
    );
    expect(s.progress?.step).toBe("seek_shelf");
  });
  it("다른 문항/없는 선택지/패널 없는 답변을 무시한다", () => {
    const s = run(at("seek_note"), { type: "inspect", place: "desk" });
    expect(reducer(s, answer("box-note", "a"))).toBe(s);
    expect(reducer(s, answer("shelf-note", "z"))).toBe(s);
    const closed = reducer(s, { type: "close" });
    expect(reducer(closed, answer("shelf-note", "b"))).toBe(closed);
  });
  it("열쇠 없이 사용하거나 조사 없이 획득할 수 없다", () => {
    const s = at("seek_note");
    expect(reducer(s, { type: "use-key" })).toBe(s);
    expect(reducer(at("seek_box"), { type: "take-key" }).progress?.step).toBe(
      "seek_box",
    );
  });
  it("중복 획득/사용은 무시한다", () => {
    const s = run(
      at("seek_box"),
      { type: "inspect", place: "blue-box" },
      { type: "take-key" },
    );
    expect(reducer(s, { type: "take-key" })).toBe(s);
    const used = run(
      s,
      { type: "inspect", place: "desk" },
      { type: "use-key" },
    );
    expect(reducer(used, { type: "use-key" })).toBe(used);
  });
  it("순서 밖 조사는 진도를 바꾸지 않고 해석한 문항은 재시험하지 않는다", () => {
    const s = run(
      at("seek_note"),
      { type: "inspect", place: "blue-box" },
      { type: "inspect", place: "shelf" },
    );
    expect(s.progress?.step).toBe("seek_note");
    expect(s.ui.panel?.kind).toBe("message");
    expect(
      run(at("seek_box"), { type: "inspect", place: "shelf" }).ui.panel?.kind,
    ).toBe("message");
  });
  it("힌트 사용과 재개, 반복 반응이 진도와 독립적이다", () => {
    const s = run(
      at("seek_note"),
      { type: "inspect", place: "desk" },
      { type: "hint" },
    );
    expect(s.progress?.hintUsed["shelf-note"]).toBe(true);
    const reacted = run(
      s,
      { type: "react", state: "happy" },
      { type: "react", state: "happy" },
    );
    expect(reacted.progress).toBe(s.progress);
    expect(reacted.ui.reactionId).toBe(s.ui.reactionId + 2);
    expect(reducer(reacted, { type: "settle", id: 0 })).toBe(reacted);
  });
  it.each(["seek_shelf", "seek_box", "use_key", "ending", "complete"] as const)(
    "%s 복구 시 안정적인 화면으로 재개한다",
    (step) => {
      const s = reducer(initialState({ ...newGame(), step }), {
        type: "resume",
      });
      expect(s.progress?.step).toBe(step);
      expect(s.ui.panel).toBeNull();
      expect(s.ui.playing).toBe(true);
    },
  );
});
