export type UserType = "korean_learner" | "japanese_student";
export type AppLocale = "ko" | "ja";
export type ThemeMode = "light" | "dark";

export type CharacterProgress = {
  characterId: string;
  attempts: number;
  successes: number;
  failures: number;
  averageScore: number;
  lastScore: number;
  lastPracticedAt?: string;
};

export type LastCompletedPractice = {
  characterId: string;
  categoryKey?: string;
  practicedAt: string;
};

export type PersistedAppState = {
  locale: AppLocale;
  theme: ThemeMode;
  userType: UserType;
  progressByCharacter: Record<string, CharacterProgress>;
  recordedAttemptIds: string[];
  favoriteCharacterIds: Record<string, true>;
  lastCompletedPractice?: LastCompletedPractice;
};
