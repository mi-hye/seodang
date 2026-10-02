import type { LearningStage, PersistedAppState } from "../../types/app-state";

export const LEARNING_STAGES: readonly LearningStage[] = ["starter", "kana", "words", "sentences", "advanced"];

export function isLearningStage(value: unknown): value is LearningStage {
  return LEARNING_STAGES.includes(value as LearningStage);
}

export function selectLearningStage(state: PersistedAppState, stage: LearningStage): PersistedAppState {
  if (!isLearningStage(stage)) return state;
  return {
    ...state,
    learningStage: stage,
    learningWelcomeSeen: true,
    // Replacing today's plan is explicit in the selector; earned rewards and
    // all writing/quiz history remain intact, including the daily reward cap.
    dailyLesson: state.learningStage === stage ? state.dailyLesson : undefined,
    onboardingCompleted: true,
    onboardingStep: "done",
    homeOnboardingDismissed: true,
    categoryOnboardingDismissed: true,
  };
}
