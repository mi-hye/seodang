type Translate = (key: string, params?: Record<string, string | number>) => string;

export function getReviewCardValue({
  hasAnyProgress,
  hasReviewCompletedToday,
  nextScheduledReviewLabel,
  reviewCount,
  t,
}: {
  hasAnyProgress: boolean;
  hasReviewCompletedToday: boolean;
  nextScheduledReviewLabel: string | undefined;
  reviewCount: number;
  t: Translate;
}) {
  if (reviewCount > 0) {
    return t("home.reviewCount", { count: reviewCount });
  }

  if (!hasAnyProgress) {
    return t("home.reviewReady");
  }

  if (nextScheduledReviewLabel) {
    return t("home.nextReview", {
      date: nextScheduledReviewLabel,
    });
  }

  if (hasReviewCompletedToday) {
    return t("home.reviewCompleted");
  }

  return t("home.reviewCount", { count: reviewCount });
}
