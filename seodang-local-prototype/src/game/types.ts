export const steps = [
  "intro",
  "seek_note",
  "seek_shelf",
  "seek_box",
  "use_key",
  "ending",
  "complete",
] as const;
export type Step = (typeof steps)[number];
export type ChallengeId = "shelf-note" | "box-note";
export type Place = "desk" | "shelf" | "blue-box";
export interface SaveGame {
  schemaVersion: 1;
  caseId: "case-01-lost-key";
  step: Step;
  wrongAttempts: Record<ChallengeId, number>;
  hintUsed: Record<ChallengeId, boolean>;
}
export interface Settings {
  schemaVersion: 1;
  reading: boolean;
  motion: "system" | "reduce";
}
export type CharacterState =
  "idle" | "talking" | "happy" | "thinking" | "surprised";
export interface ChallengeDefinition {
  id: ChallengeId;
  original: string;
  reading: string;
  translation: string;
  prompt: string;
  choices: { id: string; text: string }[];
  correctChoiceId: string;
  correctFeedback: string;
  wrongFeedback: string;
  hint: string;
}
export type Panel =
  | { kind: "challenge"; id: ChallengeId }
  | { kind: "message"; text: string; clue?: ChallengeId }
  | { kind: "box" }
  | { kind: "drawer" };
export interface GameState {
  progress: SaveGame | null;
  ui: {
    playing: boolean;
    line: number;
    panel: Panel | null;
    feedback: "correct" | "wrong" | null;
    hint: boolean;
    reaction: CharacterState;
    reactionId: number;
  };
}
