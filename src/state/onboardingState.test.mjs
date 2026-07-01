import test from "node:test";
import assert from "node:assert/strict";

const { resetOnboardingForDevelopment } = await import("./onboardingState.ts");

test("resets completed onboarding so the first onboarding step can be tested again", () => {
  const state = resetOnboardingForDevelopment({
    onboardingStep: "done",
    onboardingCompleted: true,
    homeOnboardingDismissed: true,
    categoryOnboardingDismissed: true,
  });

  assert.deepEqual(state, {
    onboardingStep: "home",
    onboardingCompleted: false,
    homeOnboardingDismissed: false,
    categoryOnboardingDismissed: false,
  });
});
