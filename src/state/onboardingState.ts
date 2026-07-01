import type { OnboardingStep } from "../types/app-state.ts";

type OnboardingState = {
  onboardingStep: OnboardingStep;
  onboardingCompleted: boolean;
  homeOnboardingDismissed: boolean;
  categoryOnboardingDismissed: boolean;
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
  };
}
