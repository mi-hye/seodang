// AdMob is native-only; keep its imports outside the web dependency graph.
export type RewardedAdResult = "earned" | "dismissed" | "unavailable" | "error";

export async function showRewardedReadingAd(): Promise<RewardedAdResult> {
  return "unavailable";
}
