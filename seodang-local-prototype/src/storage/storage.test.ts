import { expect, it } from "vitest";
import {
  createStorage,
  GAME_KEY,
  SETTINGS_KEY,
  validSave,
  validSettings,
  defaultSettings,
  type StoragePort,
} from "./storage";
import { newGame } from "../game/reducer";
const memory = () => {
  const data = new Map<string, string>();
  const port: StoragePort = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
  return { data, port, store: createStorage(() => port) };
};
it("저장 직렬화/복원과 정확한 키 삭제", () => {
  const { store, data } = memory();
  data.set("other-app", "keep");
  store.write(GAME_KEY, newGame());
  store.write(SETTINGS_KEY, defaultSettings);
  expect(store.read(GAME_KEY, validSave).value).toEqual(newGame());
  store.remove(GAME_KEY);
  expect(data.get("other-app")).toBe("keep");
  expect(store.read(SETTINGS_KEY, validSettings).value).toEqual(
    defaultSettings,
  );
});
it.each([
  "{broken",
  "null",
  "[]",
  JSON.stringify({ ...newGame(), schemaVersion: 2 }),
  JSON.stringify({ ...newGame(), step: "oops" }),
  JSON.stringify({ ...newGame(), caseId: "wrong" }),
  JSON.stringify({
    ...newGame(),
    wrongAttempts: { "shelf-note": -1, "box-note": 0 },
  }),
  JSON.stringify({
    ...newGame(),
    wrongAttempts: { "shelf-note": 0.5, "box-note": 0 },
  }),
  JSON.stringify({
    ...newGame(),
    hintUsed: { "shelf-note": "yes", "box-note": false },
  }),
])("손상된 저장을 제한적으로 무효화: %s", (raw) => {
  const { store, data } = memory();
  data.set(GAME_KEY, raw);
  data.set("other-app", "keep");
  expect(store.read(GAME_KEY, validSave)).toEqual({
    value: null,
    invalid: true,
  });
  expect(data.has(GAME_KEY)).toBe(false);
  expect(data.get("other-app")).toBe("keep");
});
it("저장소 자체 접근이 차단돼도 예외가 전파되지 않는다", () => {
  const store = createStorage(() => {
    throw new Error("blocked");
  });
  expect(store.read(GAME_KEY, validSave).value).toBeNull();
  expect(store.write(GAME_KEY, newGame())).toBe(false);
  expect(store.remove(GAME_KEY)).toBe(false);
  expect(store.unavailable).toBe(true);
});
it("할당량 초과/삭제 실패를 방어한다", () => {
  const port: StoragePort = {
    getItem: () => "{bad",
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  const store = createStorage(() => port);
  expect(store.read(GAME_KEY, validSave).invalid).toBe(true);
  expect(store.write(GAME_KEY, newGame())).toBe(false);
  expect(store.unavailable).toBe(true);
});
it("설정의 타입과 버전을 검증한다", () => {
  expect(validSettings(defaultSettings)).toBe(true);
  expect(validSettings({ ...defaultSettings, reading: "true" })).toBe(false);
  expect(validSettings({ ...defaultSettings, motion: "full" })).toBe(false);
});
