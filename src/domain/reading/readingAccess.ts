import type { ReadingLevel } from "./dailyReading.ts";

export const DAILY_READING_ENTITLEMENT_ID = "daily_reading";
export const DAILY_READING_MONTHLY_PRODUCT_ID = "seodang_ai_reading_monthly";
export const DAILY_READING_FALLBACK_PRICE = "₩3,300";

export type ReadingAccessReason =
  | "subscription"
  | "today_beginner"
  | "rewarded_ad"
  | "past_reading_locked"
  | "level_locked";

export type ReadingAccess = {
  allowed: boolean;
  reason: ReadingAccessReason;
};

export function getReadingAccess({
  isSubscribed,
  level,
  rewardedLevels,
  selectedDate,
  today,
}: {
  isSubscribed: boolean;
  level: ReadingLevel;
  rewardedLevels?: readonly ReadingLevel[];
  selectedDate: string;
  today: string;
}): ReadingAccess {
  if (isSubscribed) {
    return { allowed: true, reason: "subscription" };
  }

  if (selectedDate !== today) {
    return { allowed: false, reason: "past_reading_locked" };
  }

  if (level === "beginner") {
    return { allowed: true, reason: "today_beginner" };
  }

  if (rewardedLevels?.includes(level)) {
    return { allowed: true, reason: "rewarded_ad" };
  }

  return { allowed: false, reason: "level_locked" };
}

export function canUnlockWithRewardedAd({
  isSubscribed,
  level,
  rewardedLevels,
  selectedDate,
  today,
}: {
  isSubscribed: boolean;
  level: ReadingLevel;
  rewardedLevels?: readonly ReadingLevel[];
  selectedDate: string;
  today: string;
}) {
  return (
    !isSubscribed &&
    selectedDate === today &&
    level !== "beginner" &&
    !rewardedLevels?.includes(level)
  );
}
