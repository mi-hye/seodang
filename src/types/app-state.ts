export type UserType = "korean_learner" | "japanese_student";

export type CharacterProgress = {
  characterId: string;
  attempts: number;
  successes: number;
  failures: number;
  averageScore: number;
  lastScore: number;
  lastPracticedAt?: string;
};

export type PersistedAppState = {
  userType: UserType;
  progressByCharacter: Record<string, CharacterProgress>;
  recordedAttemptIds: string[];
};
