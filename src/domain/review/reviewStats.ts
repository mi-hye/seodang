import type { CharacterProgress } from "../../types/app-state";

export type ReviewStats = {
  averageScore: number;
  characterDistribution: {
    inProgress: number;
    mastered: number;
    weak: number;
  };
  inProgressCharacterIds: string[];
  inProgressCharacters: number;
  masteredCharacterIds: string[];
  masteredCharacters: number;
  practicedCharacters: number;
  successRate: number;
  weakCharacterIds: string[];
  totalAttempts: number;
  weakCharacters: number;
};

const WEAK_SCORE_THRESHOLD = 70;
const MASTERED_SCORE_THRESHOLD = 90;

export function buildReviewStats(
  progressByCharacter: Record<string, CharacterProgress>,
): ReviewStats {
  const progressItems = Object.values(progressByCharacter).filter(
    (progress) => progress.attempts > 0,
  );

  if (progressItems.length === 0) {
    return {
      averageScore: 0,
      characterDistribution: {
        inProgress: 0,
        mastered: 0,
        weak: 0,
      },
      inProgressCharacterIds: [],
      inProgressCharacters: 0,
      masteredCharacterIds: [],
      masteredCharacters: 0,
      practicedCharacters: 0,
      successRate: 0,
      totalAttempts: 0,
      weakCharacterIds: [],
      weakCharacters: 0,
    };
  }

  const totalAttempts = progressItems.reduce(
    (sum, progress) => sum + progress.attempts,
    0,
  );
  const totalSuccesses = progressItems.reduce(
    (sum, progress) => sum + progress.successes,
    0,
  );
  const totalScore = progressItems.reduce(
    (sum, progress) => sum + progress.averageScore * progress.attempts,
    0,
  );
  const weakItems = progressItems.filter(isWeakProgress);
  const masteredItems = progressItems.filter(isMasteredProgress);
  const inProgressItems = progressItems.filter(
    (progress) => !isWeakProgress(progress) && !isMasteredProgress(progress),
  );

  return {
    averageScore: Math.round(totalScore / totalAttempts),
    characterDistribution: {
      inProgress: getPercent(inProgressItems.length, progressItems.length),
      mastered: getPercent(masteredItems.length, progressItems.length),
      weak: getPercent(weakItems.length, progressItems.length),
    },
    inProgressCharacterIds: inProgressItems.map((progress) => progress.characterId),
    inProgressCharacters: inProgressItems.length,
    masteredCharacterIds: masteredItems.map((progress) => progress.characterId),
    masteredCharacters: masteredItems.length,
    practicedCharacters: progressItems.length,
    successRate: Math.round((totalSuccesses / totalAttempts) * 100),
    totalAttempts,
    weakCharacterIds: weakItems.map((progress) => progress.characterId),
    weakCharacters: weakItems.length,
  };
}

function isMasteredProgress(progress: CharacterProgress) {
  return (
    progress.successes > 0 &&
    progress.averageScore >= MASTERED_SCORE_THRESHOLD &&
    !isWeakProgress(progress)
  );
}

function isWeakProgress(progress: CharacterProgress) {
  return (
    progress.lastScore < WEAK_SCORE_THRESHOLD ||
    progress.failures > progress.successes
  );
}

function getPercent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
