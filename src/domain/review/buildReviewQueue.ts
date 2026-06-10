import type { CharacterProgress } from "../../types/app-state";

export type ReviewReason = "failed_recently" | "low_score" | "due_again";

export type ReviewQueueItem = {
  characterId: string;
  reason: ReviewReason;
  priority: number;
  daysSincePractice: number | null;
};

type BuildReviewQueueOptions = {
  now?: Date;
  limit?: number;
  lowScoreThreshold?: number;
  dueAfterDays?: number;
  dismissedCharacterIds?: Record<string, true>;
};

const DEFAULT_LIMIT = 20;
const DEFAULT_LOW_SCORE_THRESHOLD = 80;
const DEFAULT_DUE_AFTER_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function buildReviewQueue(
  progressByCharacter: Record<string, CharacterProgress>,
  options: BuildReviewQueueOptions = {},
): ReviewQueueItem[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? DEFAULT_LIMIT;
  const lowScoreThreshold =
    options.lowScoreThreshold ?? DEFAULT_LOW_SCORE_THRESHOLD;
  const dueAfterDays = options.dueAfterDays ?? DEFAULT_DUE_AFTER_DAYS;
  const dismissedCharacterIds = options.dismissedCharacterIds ?? {};

  return Object.values(progressByCharacter)
    .filter((progress) => !dismissedCharacterIds[progress.characterId])
    .map((progress) =>
      toReviewQueueItem(progress, {
        now,
        lowScoreThreshold,
        dueAfterDays,
      }),
    )
    .filter((item): item is ReviewQueueItem => Boolean(item))
    .sort(
      (a, b) =>
        b.priority - a.priority || a.characterId.localeCompare(b.characterId),
    )
    .slice(0, limit);
}

function toReviewQueueItem(
  progress: CharacterProgress,
  options: {
    now: Date;
    lowScoreThreshold: number;
    dueAfterDays: number;
  },
): ReviewQueueItem | null {
  const daysSincePractice = getDaysSincePractice(
    progress.lastPracticedAt,
    options.now,
  );
  const recentFailure =
    progress.lastScore < 70 || progress.failures > progress.successes;
  const lowScore =
    progress.lastScore < options.lowScoreThreshold ||
    progress.averageScore < options.lowScoreThreshold;
  const dueAgain =
    daysSincePractice != null && daysSincePractice >= options.dueAfterDays;

  if (recentFailure) {
    return {
      characterId: progress.characterId,
      reason: "failed_recently",
      priority: 300 + (100 - progress.lastScore) + progress.failures * 8,
      daysSincePractice,
    };
  }

  if (lowScore) {
    return {
      characterId: progress.characterId,
      reason: "low_score",
      priority:
        200 +
        (options.lowScoreThreshold -
          Math.min(progress.lastScore, progress.averageScore)),
      daysSincePractice,
    };
  }

  if (dueAgain) {
    return {
      characterId: progress.characterId,
      reason: "due_again",
      priority: 100 + daysSincePractice,
      daysSincePractice,
    };
  }

  return null;
}

function getDaysSincePractice(lastPracticedAt: string | undefined, now: Date) {
  if (!lastPracticedAt) {
    return null;
  }

  const practicedAt = new Date(lastPracticedAt);
  const timestamp = practicedAt.getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.floor((now.getTime() - timestamp) / MS_PER_DAY);
}
