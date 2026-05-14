import {
  CanvasPoint,
  CanvasSize,
  Direction,
  InputStroke,
  KanjiVgStroke,
  PracticeEvaluation,
} from "../../types/practice";

type EvaluatePracticeInput = {
  strokes: InputStroke[];
  template?: KanjiVgStroke[];
  canvasSize: CanvasSize;
  t: (scope: string, options?: Record<string, unknown>) => string;
};

export function evaluatePractice({
  strokes,
  template,
  canvasSize,
  t,
}: EvaluatePracticeInput): PracticeEvaluation {
  const expectedStrokes = template?.length ?? 0;
  const drawnStrokes = strokes.length;

  if (!template || template.length === 0) {
    return {
      score: drawnStrokes > 0 ? 60 : 20,
      passed: false,
      drawnStrokes,
      expectedStrokes: 0,
      summary: t("practice.eval.missingTemplateSummary"),
      feedback: [
        t("practice.eval.missingTemplateFeedback"),
      ],
    };
  }

  const countGap = Math.abs(drawnStrokes - expectedStrokes);
  const matchedCount = Math.min(drawnStrokes, expectedStrokes);
  let directionMatches = 0;
  let positionMatches = 0;
  const feedback: string[] = [];

  for (let index = 0; index < matchedCount; index += 1) {
    const stroke = strokes[index];
    const reference = template[index];
    const normalized = normalizeStroke(stroke, canvasSize);

    if (!normalized) {
      feedback.push(
        t("practice.eval.strokeTooShort", { index: index + 1 })
      );
      continue;
    }

    const direction = classifyDirection(normalized.start, normalized.end);
    const directionPassed = direction === reference.direction;
    const startDistance = distance(normalized.start, reference.start);
    const endDistance = distance(normalized.end, reference.end);
    const positionPassed = startDistance <= 34 && endDistance <= 36;

    if (directionPassed) {
      directionMatches += 1;
    } else {
      feedback.push(
        t("practice.eval.directionMismatch", {
          index: index + 1,
          note: reference.note ?? "",
        }).trim()
      );
    }

    if (positionPassed) {
      positionMatches += 1;
    } else if (feedback.length < 4) {
      feedback.push(
        t("practice.eval.positionMismatch", { index: index + 1 })
      );
    }
  }

  if (countGap > 0) {
    if (drawnStrokes < expectedStrokes) {
      feedback.unshift(
        t("practice.eval.notEnoughStrokes", {
          expected: expectedStrokes,
          drawn: drawnStrokes,
        })
      );
    } else {
      feedback.unshift(
        t("practice.eval.tooManyStrokes", {
          expected: expectedStrokes,
        })
      );
    }
  }

  const countScore = Math.max(0, 40 - countGap * 6);
  const directionScore =
    expectedStrokes === 0 ? 0 : Math.round((directionMatches / expectedStrokes) * 33);
  const positionScore =
    expectedStrokes === 0 ? 0 : Math.round((positionMatches / expectedStrokes) * 29);
  const score = Math.max(18, Math.min(99, countScore + directionScore + positionScore));
  const passed =
    countGap <= 2 &&
    directionMatches >= Math.ceil(expectedStrokes * 0.4) &&
    positionMatches >= Math.ceil(expectedStrokes * 0.25) &&
    score >= 60;

  if (feedback.length === 0) {
    feedback.push(t("practice.eval.goodMatch"));
  }

  return {
    score,
    passed,
    drawnStrokes,
    expectedStrokes,
    summary: passed
      ? t("practice.eval.passSummary")
      : t("practice.eval.failSummary"),
    feedback: feedback.slice(0, 4),
  };
}

function normalizeStroke(stroke: InputStroke, canvasSize: CanvasSize) {
  if (!stroke.points.length || canvasSize.width === 0 || canvasSize.height === 0) {
    return undefined;
  }

  const start = normalizePoint(stroke.points[0], canvasSize);
  const end = normalizePoint(stroke.points[stroke.points.length - 1], canvasSize);

  return { start, end };
}

function normalizePoint(point: CanvasPoint, canvasSize: CanvasSize): CanvasPoint {
  return {
    x: Math.round((point.x / canvasSize.width) * 100),
    y: Math.round((point.y / canvasSize.height) * 100),
  };
}

function classifyDirection(start: CanvasPoint, end: CanvasPoint): Direction {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx >= absDy * 1.4) {
    return dx >= 0 ? "left_to_right" : "right_to_left";
  }

  if (absDy >= absDx * 1.4) {
    return dy >= 0 ? "top_to_bottom" : "bottom_to_top";
  }

  if (dx >= 0 && dy >= 0) return "diagonal_down_right";
  if (dx < 0 && dy >= 0) return "diagonal_down_left";
  if (dx >= 0 && dy < 0) return "diagonal_up_right";
  return "diagonal_up_left";
}

function distance(left: CanvasPoint, right: CanvasPoint) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}
