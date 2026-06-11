import test from "node:test";
import assert from "node:assert/strict";

const { evaluatePractice } = await import("./evaluatePractice.ts");

const t = (key) => key;
const canvasSize = { width: 100, height: 100 };

test("passes accurate practice at the higher score threshold", () => {
  const result = evaluatePractice({
    canvasSize,
    strokes: [
      { points: [{ x: 10, y: 10 }, { x: 50, y: 10 }] },
      { points: [{ x: 10, y: 30 }, { x: 50, y: 30 }] },
    ],
    template: [
      {
        direction: "left_to_right",
        start: { x: 10, y: 10 },
        end: { x: 50, y: 10 },
        type: "horizontal",
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
    canvasSize,
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

  assert.ok(result.score < 65);
  assert.equal(result.passed, false);
});

test("penalizes strokes that curve far away from the expected path", () => {
  const result = evaluatePractice({
    canvasSize,
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
        type: "horizontal",
      },
    ],
    t,
  });

  assert.equal(result.passed, false);
  assert.ok(result.score < 65);
  assert.ok(result.feedback.includes("practice.eval.shapeMismatch"));
});

test("reports very short strokes before direction or position feedback", () => {
  const result = evaluatePractice({
    canvasSize,
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

test("does not apply straight-line shape penalties to curved reference strokes", () => {
  const result = evaluatePractice({
    canvasSize,
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
        type: "curve",
      },
    ],
    t,
  });

  assert.equal(result.passed, true);
  assert.equal(result.score, 99);
  assert.deepEqual(result.feedback, ["practice.eval.goodMatch"]);
});

test("penalizes curved drawings for diagonal sweep strokes", () => {
  const result = evaluatePractice({
    canvasSize,
    strokes: [
      {
        points: [
          { x: 80, y: 10 },
          { x: 90, y: 90 },
          { x: 20, y: 80 },
        ],
      },
    ],
    template: [
      {
        direction: "diagonal_down_left",
        start: { x: 80, y: 10 },
        end: { x: 20, y: 80 },
        type: "sweep_left",
      },
    ],
    t,
  });

  assert.equal(result.passed, false);
  assert.ok(result.score < 65);
  assert.ok(result.feedback.includes("practice.eval.shapeMismatch"));
});

test("accepts intentionally short dot strokes", () => {
  const result = evaluatePractice({
    canvasSize,
    strokes: [
      {
        points: [
          { x: 50, y: 50 },
          { x: 53, y: 53 },
        ],
      },
    ],
    template: [
      {
        direction: "diagonal_down_right",
        start: { x: 50, y: 50 },
        end: { x: 54, y: 54 },
        type: "dot",
      },
    ],
    t,
  });

  assert.equal(result.passed, true);
  assert.equal(result.score, 99);
  assert.deepEqual(result.feedback, ["practice.eval.goodMatch"]);
});

test("rejects extra strokes for simple one-stroke templates", () => {
  const result = evaluatePractice({
    canvasSize,
    strokes: [
      { points: [{ x: 10, y: 10 }, { x: 80, y: 10 }] },
      { points: [{ x: 10, y: 30 }, { x: 80, y: 30 }] },
      { points: [{ x: 10, y: 50 }, { x: 80, y: 50 }] },
    ],
    template: [
      {
        direction: "left_to_right",
        start: { x: 10, y: 10 },
        end: { x: 80, y: 10 },
        type: "horizontal",
      },
    ],
    t,
  });

  assert.equal(result.passed, false);
  assert.ok(result.score < 70);
  assert.equal(result.feedback[0], "practice.eval.tooManyStrokes");
});

test("does not show good-match feedback for failed practice results", () => {
  const failedResults = [
    evaluatePractice({
      canvasSize,
      strokes: [{ points: [{ x: 10, y: 10 }, { x: 13, y: 10 }] }],
      template: [
        {
          direction: "left_to_right",
          start: { x: 10, y: 10 },
          end: { x: 80, y: 10 },
        },
      ],
      t,
    }),
    evaluatePractice({
      canvasSize,
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
          type: "horizontal",
        },
      ],
      t,
    }),
  ];

  for (const result of failedResults) {
    assert.equal(result.passed, false);
    assert.ok(result.score < 65);
    assert.notEqual(result.summary, "practice.eval.summary.good");
    assert.notEqual(result.summary, "practice.eval.summary.great");
    assert.notEqual(result.summary, "practice.eval.summary.excellent");
    assert.ok(!result.feedback.includes("practice.eval.goodMatch"));
  }
});
