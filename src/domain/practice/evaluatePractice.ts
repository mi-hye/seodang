import {
  CanvasPoint,
  CanvasSize,
  Direction,
  InputStroke,
  KanjiVgStroke,
  PracticeEvaluation,
} from "../../types/practice";
import { AppLocale } from "../../types/app-state";

type EvaluatePracticeInput = {
  strokes: InputStroke[];
  template?: KanjiVgStroke[];
  canvasSize: CanvasSize;
  locale?: AppLocale;
};

export function evaluatePractice({
  strokes,
  template,
  canvasSize,
  locale = "ko",
}: EvaluatePracticeInput): PracticeEvaluation {
  const expectedStrokes = template?.length ?? 0;
  const drawnStrokes = strokes.length;

  if (!template || template.length === 0) {
    return {
      score: drawnStrokes > 0 ? 60 : 20,
      passed: false,
      drawnStrokes,
      expectedStrokes: 0,
      summary:
        locale === "ja"
          ? "この漢字はまだ基準の画データが用意されていません。"
          : "이 한자는 아직 기준 획 데이터가 준비되지 않았습니다.",
      feedback: [
        locale === "ja"
          ? "基準となる stroke テンプレートがない漢字です。"
          : "샘플 stroke 템플릿이 없는 한자입니다.",
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
        locale === "ja"
          ? `${index + 1}画目の入力が短すぎます。`
          : `${index + 1}번째 획이 너무 짧게 입력되었습니다.`
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
        locale === "ja"
          ? `${index + 1}画目の方向が異なります.${reference.note ? ` ${reference.note} をもう一度確認してください。` : ""}`
          : `${index + 1}번째 획 방향이 다릅니다.${reference.note ? ` ${reference.note} 위치를 다시 보세요.` : ""}`
      );
    }

    if (positionPassed) {
      positionMatches += 1;
    } else if (feedback.length < 4) {
      feedback.push(
        locale === "ja"
          ? `${index + 1}画目の始点または終点の位置が基準と少し違います。`
          : `${index + 1}번째 획의 시작점이나 끝점 위치가 기준과 조금 다릅니다.`
      );
    }
  }

  if (countGap > 0) {
    if (drawnStrokes < expectedStrokes) {
      feedback.unshift(
        locale === "ja"
          ? `画数が足りません。${expectedStrokes}画のうち ${drawnStrokes}画を書きました。`
          : `획 수가 부족합니다. ${expectedStrokes}획 중 ${drawnStrokes}획을 썼습니다.`
      );
    } else {
      feedback.unshift(
        locale === "ja"
          ? `画数が多いです。${expectedStrokes}画より多く書いています。`
          : `획 수가 많습니다. ${expectedStrokes}획보다 많이 그렸습니다.`
      );
    }
  }

  const countScore = Math.max(0, 42 - countGap * 6);
  const directionScore =
    expectedStrokes === 0 ? 0 : Math.round((directionMatches / expectedStrokes) * 34);
  const positionScore =
    expectedStrokes === 0 ? 0 : Math.round((positionMatches / expectedStrokes) * 32);
  const score = Math.max(20, Math.min(99, countScore + directionScore + positionScore));
  const passed =
    countGap <= 2 &&
    directionMatches >= Math.ceil(expectedStrokes * 0.4) &&
    positionMatches >= Math.ceil(expectedStrokes * 0.25) &&
    score >= 58;

  if (feedback.length === 0) {
    feedback.push(
      locale === "ja"
        ? "画数、方向、始点の位置がおおむね基準と一致しました。"
        : "획 수, 방향, 시작 위치가 기준과 전반적으로 잘 맞았습니다."
    );
  }

  return {
    score,
    passed,
    drawnStrokes,
    expectedStrokes,
    summary: passed
      ? locale === "ja"
        ? "基準の画データと比べたとき、全体的によく合っていました。"
        : "기준 획 데이터와 비교했을 때 전반적으로 잘 맞았습니다."
      : locale === "ja"
        ? "基準の画データと比べたとき、画数や方向に差があります。"
        : "기준 획 데이터와 비교했을 때 획 수나 방향에서 차이가 있습니다.",
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
