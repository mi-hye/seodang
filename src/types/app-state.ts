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

// Calendar day in the device's local timezone at the time of practice.
export type WritingActivityDay = {
  attempts: number;
  successes: number;
  totalScore: number;
  lastPracticedAt: string;
};

export type WritingActivity = {
  startedAt: string;
  days: Record<string, WritingActivityDay>;
};

export type LearningPet = {
  species: "dog";
  food: number;
  totalFed: number;
  rewardsByDay: Record<string, { characterIds: string[]; attemptIds: string[] }>;
};

export type LearningStage = "starter" | "kana" | "words" | "sentences" | "advanced";
export type LessonQuiz = {
  id: string;
  mode: "choice" | "order";
  prompt: { ko: string; ja: string };
  cue: string;
  choices: string[];
  answer: string[];
  hint: { ko: string; ja: string };
};
export type GuidedProgress = Record<string, { completions: number; lastCompletedAt: string }>;
export type GuidedReviewQuizzes = Record<string, { stage: "kana" | "words"; quiz: LessonQuiz }>;

export type DailyLessonItem = {
  characterId: string;
  categoryKey?: string;
  kind: "review" | "new";
  completedAt?: string;
  quiz?: LessonQuiz;
};

export type DailyLesson = {
  id: string;
  day: string;
  startedAt: string;
  items: DailyLessonItem[];
  stage?: LearningStage;
  source?: "server" | "offline";
  contentDate?: string;
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
  writingActivity?: WritingActivity;
  learningPet?: LearningPet;
  dailyLesson?: DailyLesson;
  learningStage?: LearningStage;
  learningWelcomeSeen?: boolean;
  guidedProgress?: GuidedProgress;
  guidedReviewQuizzes?: GuidedReviewQuizzes;
  favoriteCharacterIds: Record<string, true>;
  isPro: boolean;
  lastCompletedPractice?: LastCompletedPractice;
  mistakeNoteBadgesExpanded: boolean;
};
