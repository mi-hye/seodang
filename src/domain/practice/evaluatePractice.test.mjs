import test from "node:test";
import assert from "node:assert/strict";

const { evaluatePractice } = await import("./evaluatePractice.ts");

const t = (key) => key;

test("passes accurate practice at the higher score threshold", () => {
  const result = evaluatePractice({
    canvasSize: { width: 100, height: 100 },
    strokes: [
      { points: [{ x: 10, y: 10 }, { x: 50, y: 10 }] },
      { points: [{ x: 10, y: 30 }, { x: 50, y: 30 }] },
    ],
    template: [
      {
        direction: "left_to_right",
        start: { x: 10, y: 10 },
        end: { x: 50, y: 10 },
      },
      {
        direction: "left_to_right",
        start: { x: 10, y: 30 },
        end: { x: 50, y: 30 },
      },
    ],
    t,
  });

  assert.equal(result.score, 99);
  assert.equal(result.passed, true);
});

test("fails practice below 70 even when minimum stroke checks pass", () => {
  const result = evaluatePractice({
    canvasSize: { width: 100, height: 100 },
    strokes: [
      { points: [{ x: 10, y: 10 }, { x: 50, y: 10 }] },
      { points: [{ x: 10, y: 25 }, { x: 50, y: 25 }] },
      { points: [{ x: 90, y: 90 }, { x: 90, y: 50 }] },
      { points: [{ x: 80, y: 80 }, { x: 80, y: 40 }] },
      { points: [{ x: 70, y: 70 }, { x: 70, y: 30 }] },
    ],
    template: [
      {
        direction: "left_to_right",
        start: { x: 10, y: 10 },
        end: { x: 50, y: 10 },
      },
      {
        direction: "left_to_right",
        start: { x: 10, y: 25 },
        end: { x: 50, y: 25 },
      },
      {
        direction: "left_to_right",
        start: { x: 10, y: 40 },
        end: { x: 50, y: 40 },
      },
      {
        direction: "left_to_right",
        start: { x: 10, y: 55 },
        end: { x: 50, y: 55 },
      },
      {
        direction: "left_to_right",
        start: { x: 10, y: 70 },
        end: { x: 50, y: 70 },
      },
    ],
    t,
  });

  assert.equal(result.score, 65);
  assert.equal(result.passed, false);
});

test("penalizes strokes that curve far away from the expected path", () => {
  const result = evaluatePractice({
    canvasSize: { width: 100, height: 100 },
    strokes: [
      {
        points: [
          { x: 10, y: 10 },
          { x: 30, y: 70 },
          { x: 50, y: 10 },
        ],
      },
    ],
    template: [
      {
        direction: "left_to_right",
        start: { x: 10, y: 10 },
        end: { x: 50, y: 10 },
      },
    ],
    t,
  });

  assert.equal(result.passed, false);
  assert.ok(result.score < 90);
  assert.ok(result.feedback.includes("practice.eval.shapeMismatch"));
});

test("reports very short strokes before direction or position feedback", () => {
  const result = evaluatePractice({
    canvasSize: { width: 100, height: 100 },
    strokes: [
      {
        points: [
          { x: 10, y: 10 },
          { x: 13, y: 10 },
        ],
      },
    ],
    template: [
      {
        direction: "left_to_right",
        start: { x: 10, y: 10 },
        end: { x: 80, y: 10 },
      },
    ],
    t,
  });

  assert.equal(result.passed, false);
  assert.equal(result.feedback[0], "practice.eval.strokeTooShort");
});
