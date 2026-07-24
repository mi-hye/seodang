const SHORT_STROKE_COUNT_MAX = 2;
const HALF_SPEED_PROGRESS_MULTIPLIER = 0.5;
const DEFAULT_PROGRESS_MULTIPLIER = 1;

export function getStrokeGuideProgressStepMultiplier(
  strokeCount: number | null | undefined,
) {
  if (
    typeof strokeCount === "number" &&
    strokeCount > 0 &&
    strokeCount <= SHORT_STROKE_COUNT_MAX
  ) {
    return HALF_SPEED_PROGRESS_MULTIPLIER;
  }

  return DEFAULT_PROGRESS_MULTIPLIER;
}
