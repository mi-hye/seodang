export type UserType = "korean_learner" | "japanese_student";
export type AppLocale = "ko" | "ja";
export type ThemeMode = "light" | "dark";
export type NotificationRepeat = "daily" | "weekdays" | "weekends";
export type NotificationReminder = {
  id: string;
  title: string;
  enabled: boolean;
  time: string;
  repeat: NotificationRepeat;
  message: string;
};

export type OnboardingStep =
  | "home"
  | "categories"
  | "list_favorite"
  | "list_item"
  | "detail"
  | "practice_guide"
  | "practice_submit"
  | "result"
  | "done";

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
  categoryOnboardingDismissed: boolean;
  onboardingStep: OnboardingStep;
  notificationReminders: NotificationReminder[];
  recentCategoryKeys: string[];
  progressByCharacter: Record<string, CharacterProgress>;
  recordedAttemptIds: string[];
  favoriteCharacterIds: Record<string, true>;
  lastCompletedPractice?: LastCompletedPractice;
};
