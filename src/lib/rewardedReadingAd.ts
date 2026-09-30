import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export type RewardedAdResult = "earned" | "dismissed" | "unavailable" | "error";

let adsInitialization: Promise<unknown> | null = null;

export async function showRewardedReadingAd(): Promise<RewardedAdResult> {
  if (
    Platform.OS === "web" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return "unavailable";
  }

  try {
    const ads = await import("react-native-google-mobile-ads");
    const unitId = resolveRewardedUnitId(ads.TestIds.REWARDED);
    if (!unitId) return "unavailable";

    try {
      await ads.AdsConsent.gatherConsent();
    } catch (error) {
      // UMP can reuse consent from a previous session when this refresh fails.
      // Do not prevent the ad request from reaching AdMob solely for that reason.
      console.warn("[rewardedReadingAd] Consent refresh failed", error);
    }
    adsInitialization ??= ads.default().initialize();
    await adsInitialization;

    return await new Promise<RewardedAdResult>((resolve) => {
      const rewardedAd = ads.RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      let earned = false;
      let settled = false;
      const subscriptions: Array<() => void> = [];

      const finish = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscriptions.forEach((unsubscribe) => unsubscribe());
        resolve(result);
      };

      const timeout = setTimeout(() => finish("error"), 30_000);
      subscriptions.push(
        rewardedAd.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
          rewardedAd.show().catch((error) => {
            console.warn("[rewardedReadingAd] Show failed", error);
            finish("error");
          });
        }),
        rewardedAd.addAdEventListener(
          ads.RewardedAdEventType.EARNED_REWARD,
          () => {
            earned = true;
          },
        ),
        rewardedAd.addAdEventListener(ads.AdEventType.CLOSED, () => {
          finish(earned ? "earned" : "dismissed");
        }),
        rewardedAd.addAdEventListener(ads.AdEventType.ERROR, (error) => {
          console.warn("[rewardedReadingAd] Load failed", error);
          finish("error");
        }),
      );
      rewardedAd.load();
    });
  } catch (error) {
    console.warn("[rewardedReadingAd] Request failed", error);
    return "error";
  }
}

function resolveRewardedUnitId(testUnitId: string) {
  if (__DEV__) return testUnitId;

  return Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
  }) ?? testUnitId;
}
