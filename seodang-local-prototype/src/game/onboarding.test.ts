import { expect, it } from "vitest";
import { initialOnboarding, onboardingReducer as reduce } from "./onboarding";
import {
  createStorage,
  ONBOARDING_KEY,
  GAME_KEY,
  validOnboarding,
  validSave,
} from "../storage/storage";
import { newGame } from "./reducer";
it("사물을 직접 살펴봐야 읽기 단계로 진행한다", () => {
  let s = reduce(initialOnboarding, { type: "next" });
  expect(s.step).toBe(1);
  expect(reduce(s, { type: "next" })).toBe(s);
  s = reduce(s, { type: "discover" });
  expect(reduce(s, { type: "next" }).step).toBe(2);
});
it("오답 재시도·정답을 지원하고 피드백 중 추가 제출을 무시한다", () => {
  let s = { ...initialOnboarding, step: 2 };
  s = reduce(s, { type: "answer", choice: "bye" });
  expect(s.feedback).toBe("wrong");
  expect(reduce(s, { type: "answer", choice: "hello" })).toBe(s);
  s = reduce(s, { type: "retry" });
  expect(reduce(s, { type: "answer", choice: "hello" }).feedback).toBe(
    "correct",
  );
});
it("단계 밖 정답과 알 수 없는 선택지는 무시한다", () => {
  expect(reduce(initialOnboarding, { type: "answer", choice: "hello" })).toBe(
    initialOnboarding,
  );
  const s = { ...initialOnboarding, step: 2 };
  expect(reduce(s, { type: "answer", choice: "unknown" })).toBe(s);
});
it("앞뒤 이동은 연습 결과를 보존하고 범위 밖으로 나가지 않는다", () => {
  expect(reduce(initialOnboarding, { type: "back" })).toBe(initialOnboarding);
  const s = { step: 2, discovered: true, feedback: "correct" as const };
  expect(reduce(s, { type: "next" })).toBe(s);
  expect(reduce(reduce(s, { type: "back" }), { type: "next" })).toEqual(s);
});
it("완료 표시는 사건 저장을 덮어쓰지 않는다", () => {
  const data = new Map<string, string>();
  const store = createStorage(() => ({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  }));
  const game = { ...newGame(), step: "use_key" as const };
  store.write(GAME_KEY, game);
  store.write(ONBOARDING_KEY, { schemaVersion: 1, completed: true });
  expect(store.read(ONBOARDING_KEY, validOnboarding).value?.completed).toBe(
    true,
  );
  expect(store.read(GAME_KEY, validSave).value).toEqual(game);
});
it("온보딩 버전과 완료 플래그를 검증한다", () => {
  expect(validOnboarding({ schemaVersion: 1, completed: true })).toBe(true);
  expect(validOnboarding({ schemaVersion: 2, completed: true })).toBe(false);
  expect(validOnboarding({ schemaVersion: 1, completed: "true" })).toBe(false);
});
