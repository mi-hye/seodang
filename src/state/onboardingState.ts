import type { LearningStage, OnboardingStep } from "../types/app-state.ts";

type OnboardingState = {
  onboardingStep: OnboardingStep;
  onboardingCompleted: boolean;
  homeOnboardingDismissed: boolean;
  categoryOnboardingDismissed: boolean;
  learningStage?: LearningStage;
  learningWelcomeSeen?: boolean;
};

export function resetOnboardingForDevelopment(
  state: OnboardingState,
): OnboardingState {
  return {
    ...state,
    onboardingStep: "home",
    onboardingCompleted: false,
    homeOnboardingDismissed: false,
    categoryOnboardingDismissed: false,
    learningStage: undefined,
    learningWelcomeSeen: false,
  };
}
