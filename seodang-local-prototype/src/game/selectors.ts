import { steps, type SaveGame, type ChallengeId } from "./types";
export const rank = (p: SaveGame) => steps.indexOf(p.step);
export const hasKey = (p: SaveGame) => p.step === "use_key";
export const drawerOpen = (p: SaveGame) => rank(p) >= 5;
export const solved = (p: SaveGame): ChallengeId[] =>
  rank(p) >= 3
    ? ["shelf-note", "box-note"]
    : rank(p) >= 2
      ? ["shelf-note"]
      : [];
