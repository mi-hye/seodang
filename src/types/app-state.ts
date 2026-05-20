export type UserType = "korean_learner" | "japanese_student";
export type AppLocale = "ko" | "ja";
export type ThemeMode = "light" | "dark";
export type NotificationRepeat = "daily" | "weekdays" | "weekends";

export type NotificationSettings = {
  enabled: boolean;
  time: string;
  repeat: NotificationRepeat;
  message: string;
};

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
  homeOnboardingDismissed: boolean;
  notifications: NotificationSettings;
  recentCategoryKeys: string[];
  progressByCharacter: Record<string, CharacterProgress>;
  recordedAttemptIds: string[];
  favoriteCharacterIds: Record<string, true>;
  lastCompletedPractice?: LastCompletedPractice;
};
