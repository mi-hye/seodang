const LOW_SCORE_THRESHOLD = 70;
const HIGH_SCORE_THRESHOLD = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateNextReviewAt({
  passed,
  practicedAt,
  score,
}: {
  passed: boolean;
  practicedAt: string;
  score: number;
}) {
  const practicedTime = new Date(practicedAt).getTime();
  const baseTime = Number.isNaN(practicedTime) ? Date.now() : practicedTime;
  const intervalDays = getReviewIntervalDays({ passed, score });

  return new Date(baseTime + intervalDays * MS_PER_DAY).toISOString();
}

function getReviewIntervalDays({
  passed,
  score,
}: {
  passed: boolean;
  score: number;
}) {
  if (!passed || score < LOW_SCORE_THRESHOLD) {
    return 1;
  }

  if (score >= HIGH_SCORE_THRESHOLD) {
    return 7;
  }

  return 3;
}
