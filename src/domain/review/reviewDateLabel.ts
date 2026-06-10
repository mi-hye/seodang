type ReviewDateLocale = "ko" | "ja";

export function formatReviewDateLabel({
  locale,
  now = new Date(),
  reviewAt,
}: {
  locale: ReviewDateLocale;
  now?: Date;
  reviewAt: string;
}) {
  const reviewDate = new Date(reviewAt);
  if (Number.isNaN(reviewDate.getTime())) {
    return "-";
  }

  const dayDelta = getDayDelta(now, reviewDate);
  if (dayDelta === 0) {
    return locale === "ja" ? "今日" : "오늘";
  }

  if (dayDelta === 1) {
    return locale === "ja" ? "明日" : "내일";
  }

  const month = reviewDate.getUTCMonth() + 1;
  const day = reviewDate.getUTCDate();
  return locale === "ja" ? `${month}月${day}日` : `${month}월 ${day}일`;
}

function getDayDelta(from: Date, to: Date) {
  return getUtcDayNumber(to) - getUtcDayNumber(from);
}

function getUtcDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      (24 * 60 * 60 * 1000),
  );
}
