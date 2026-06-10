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
  nextReviewAt?: string;
};

export type LastCompletedPractice = {
  characterId: string;
  categoryKey?: string;
  practicedAt: string;
};

export type DismissedReviewCharacter = {
  dismissedAt: string;
};

export type PersistedAppState = {
  locale: AppLocale;
  theme: ThemeMode;
  userType: UserType;
  homeOnboardingDismissed: boolean;
  categoryOnboardingDismissed: boolean;
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStep;
  notificationReminders: NotificationReminder[];
  recentCategoryKeys: string[];
  resetProgressByCategoryKey: Record<string, string[]>;
  progressByCharacter: Record<string, CharacterProgress>;
  dismissedReviewCharacterIds: Record<string, DismissedReviewCharacter>;
  recordedAttemptIds: string[];
  favoriteCharacterIds: Record<string, true>;
  isPro: boolean;
  lastCompletedPractice?: LastCompletedPractice;
  mistakeNoteBadgesExpanded: boolean;
};
