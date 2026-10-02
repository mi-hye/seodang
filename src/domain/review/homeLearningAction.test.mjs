import test from "node:test";
import assert from "node:assert/strict";
import { getHomeLearningAction } from "./homeLearningAction.ts";

test("home waits for stored progress before offering a learning destination", () => {
  assert.deepEqual(getHomeLearningAction(false, 0), { kind: "loading", route: null });
  assert.equal(getHomeLearningAction(false, 3).route, null);
});

test("home prioritizes due reviews", () => {
  assert.deepEqual(getHomeLearningAction(true, 3), { kind: "review", route: "/review" });
});

test("home offers new letters for first use and after the review queue clears", () => {
  assert.deepEqual(getHomeLearningAction(true, 0), { kind: "learn", route: "/categories" });
  assert.equal(getHomeLearningAction(true, 1).kind, "review");
  assert.equal(getHomeLearningAction(true, 0).kind, "learn");
});
