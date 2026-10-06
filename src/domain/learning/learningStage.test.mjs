import test from "node:test";
import assert from "node:assert/strict";
import { getLearningStartStep, LEARNING_STAGES } from "./learningStage.ts";

test("new learners meet the dog before choosing difficulty", () => {
  assert.equal(getLearningStartStep({}), "welcome");
  assert.equal(getLearningStartStep({ learningWelcomeSeen: false }), "welcome");
});

test("interrupted onboarding resumes at difficulty without repeating the welcome", () => {
  assert.equal(getLearningStartStep({ learningWelcomeSeen: true }), "difficulty");
  for (const learningStage of LEARNING_STAGES) {
    assert.equal(getLearningStartStep({ learningStage }), "difficulty");
  }
});

test("settings always opens difficulty directly, even without a welcome flag", () => {
  assert.equal(getLearningStartStep({ fromSettings: true }), "difficulty");
});
