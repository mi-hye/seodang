import { steps, type SaveGame, type Settings } from "../game/types";
export const GAME_KEY = "seodang-local-prototype:case-01:v1";
export const SETTINGS_KEY = "seodang-local-prototype:settings:v1";
export const defaultSettings: Settings = {
  schemaVersion: 1,
  reading: true,
  motion: "system",
};
export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
export function validSave(v: unknown): v is SaveGame {
  if (
    !object(v) ||
    v.schemaVersion !== 1 ||
    v.caseId !== "case-01-lost-key" ||
    !steps.some((s) => s === v.step) ||
    !object(v.wrongAttempts) ||
    !object(v.hintUsed)
  )
    return false;
  return ["shelf-note", "box-note"].every((id) => {
    const n = (v.wrongAttempts as Record<string, unknown>)[id];
    return (
      typeof n === "number" &&
      Number.isSafeInteger(n) &&
      n >= 0 &&
      typeof (v.hintUsed as Record<string, unknown>)[id] === "boolean"
    );
  });
}
export function validSettings(v: unknown): v is Settings {
  return (
    object(v) &&
    v.schemaVersion === 1 &&
    typeof v.reading === "boolean" &&
    (v.motion === "system" || v.motion === "reduce")
  );
}
export function createStorage(getPort: () => StoragePort) {
  let unavailable = false;
  const safe = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      unavailable = true;
      return fallback;
    }
  };
  return {
    get unavailable() {
      return unavailable;
    },
    read<T>(
      key: string,
      validate: (v: unknown) => v is T,
    ): { value: T | null; invalid: boolean } {
      return safe(
        () => {
          const raw = getPort().getItem(key);
          if (raw === null) return { value: null, invalid: false };
          let value: unknown;
          try {
            value = JSON.parse(raw);
          } catch {
            value = null;
          }
          if (validate(value)) return { value, invalid: false };
          safe(() => getPort().removeItem(key), undefined);
          return { value: null, invalid: true };
        },
        { value: null, invalid: false },
      );
    },
    write(key: string, value: unknown) {
      return safe(() => {
        getPort().setItem(key, JSON.stringify(value));
        return true;
      }, false);
    },
    remove(key: string) {
      return safe(() => {
        getPort().removeItem(key);
        return true;
      }, false);
    },
  };
}

export const ONBOARDING_KEY = "seodang-local-prototype:onboarding:v1";
export type OnboardingSave = { schemaVersion: 1; completed: true };
export function validOnboarding(value: unknown): value is OnboardingSave {
  return object(value) && value.schemaVersion === 1 && value.completed === true;
}
