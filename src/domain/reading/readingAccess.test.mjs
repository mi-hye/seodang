import assert from "node:assert/strict";
import test from "node:test";

import {
  canUnlockWithRewardedAd,
  getReadingAccess,
} from "./readingAccess.ts";

const today = "2026-08-25";

test("keeps today's beginner reading free", () => {
  assert.deepEqual(
    getReadingAccess({
      isSubscribed: false,
      level: "beginner",
      selectedDate: today,
      today,
    }),
    { allowed: true, reason: "today_beginner" },
  );
});

test("locks paid levels until the selected level is rewarded", () => {
  assert.equal(
    getReadingAccess({
      isSubscribed: false,
      level: "advanced",
      selectedDate: today,
      today,
    }).allowed,
    false,
  );
  assert.deepEqual(
    getReadingAccess({
      isSubscribed: false,
      level: "advanced",
      rewardedLevels: ["advanced"],
      selectedDate: today,
      today,
    }),
    { allowed: true, reason: "rewarded_ad" },
  );
});

test("allows each locked level to be rewarded independently", () => {
  assert.equal(
    canUnlockWithRewardedAd({
      isSubscribed: false,
      level: "intermediate",
      selectedDate: today,
      today,
    }),
    true,
  );
  assert.equal(
    canUnlockWithRewardedAd({
      isSubscribed: false,
      level: "advanced",
      rewardedLevels: ["intermediate"],
      selectedDate: today,
      today,
    }),
    true,
  );
  assert.equal(
    canUnlockWithRewardedAd({
      isSubscribed: false,
      level: "intermediate",
      rewardedLevels: ["intermediate"],
      selectedDate: today,
      today,
    }),
    false,
  );
});

test("locks archive readings for free users and unlocks everything for subscribers", () => {
  assert.equal(
    getReadingAccess({
      isSubscribed: false,
      level: "beginner",
      selectedDate: "2026-08-24",
      today,
    }).reason,
    "past_reading_locked",
  );
  assert.deepEqual(
    getReadingAccess({
      isSubscribed: true,
      level: "advanced",
      selectedDate: "2026-08-01",
      today,
    }),
    { allowed: true, reason: "subscription" },
  );
});
