import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  PurchasesPackage,
} from "react-native-purchases";

import {
  DAILY_READING_ENTITLEMENT_ID,
  DAILY_READING_FALLBACK_PRICE,
  DAILY_READING_MONTHLY_PRODUCT_ID,
} from "../domain/reading/readingAccess";
import { ReadingLevel } from "../domain/reading/dailyReading";
import {
  RewardedAdResult,
  showRewardedReadingAd,
} from "../lib/rewardedReadingAd";

const REWARDED_UNLOCKS_KEY = "seodang-daily-reading-rewarded-v1";

type PurchaseResult = "purchased" | "cancelled" | "unavailable" | "error";
type RestoreResult = "restored" | "empty" | "unavailable" | "error";

type ReadingAccessContextValue = {
  hydrated: boolean;
  isSubscribed: boolean;
  isStoreConfigured: boolean;
  monthlyPrice: string;
  purchaseMonthly: () => Promise<PurchaseResult>;
  restoreSubscription: () => Promise<RestoreResult>;
  rewardedLevelsForDate: (date: string) => ReadingLevel[];
  unlockLevelWithAd: (date: string, level: ReadingLevel) => Promise<RewardedAdResult>;
};

const ReadingAccessContext = createContext<ReadingAccessContextValue | null>(null);

export function ReadingAccessProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isStoreConfigured, setIsStoreConfigured] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [rewardedUnlocks, setRewardedUnlocks] = useState<Record<string, ReadingLevel[]>>({});

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(REWARDED_UNLOCKS_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        setRewardedUnlocks(parseRewardedUnlocks(raw));
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    });
    if (!apiKey) return;

    let mounted = true;
    const updateSubscription = (customerInfo: CustomerInfo) => {
      if (mounted) {
        setIsSubscribed(Boolean(customerInfo.entitlements.active[DAILY_READING_ENTITLEMENT_ID]));
      }
    };

    async function initializePurchases() {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey: apiKey! });
      }
      Purchases.addCustomerInfoUpdateListener(updateSubscription);
      setIsStoreConfigured(true);

      const [customerInfo, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      if (!mounted) return;
      updateSubscription(customerInfo);
      const offering = offerings.current;
      setMonthlyPackage(
        offering?.monthly ??
          offering?.availablePackages.find(
            (item) => item.product.identifier === DAILY_READING_MONTHLY_PRODUCT_ID,
          ) ??
          null,
      );
    }

    initializePurchases().catch((error) => {
      console.error("[RevenueCat] initialization failed", error);
      if (mounted) setIsStoreConfigured(false);
    });

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(updateSubscription);
    };
  }, []);

  const value = useMemo<ReadingAccessContextValue>(() => ({
    hydrated,
    isSubscribed,
    isStoreConfigured,
    monthlyPrice: monthlyPackage?.product.priceString ?? DAILY_READING_FALLBACK_PRICE,
    purchaseMonthly: async () => {
      if (!isStoreConfigured || !monthlyPackage) return "unavailable";
      try {
        const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
        const active = Boolean(customerInfo.entitlements.active[DAILY_READING_ENTITLEMENT_ID]);
        setIsSubscribed(active);
        return active ? "purchased" : "error";
      } catch (error) {
        if (isPurchaseCancelled(error)) return "cancelled";
        console.error("[RevenueCat] purchase failed", error);
        return "error";
      }
    },
    restoreSubscription: async () => {
      if (!isStoreConfigured) return "unavailable";
      try {
        const customerInfo = await Purchases.restorePurchases();
        const active = Boolean(customerInfo.entitlements.active[DAILY_READING_ENTITLEMENT_ID]);
        setIsSubscribed(active);
        return active ? "restored" : "empty";
      } catch {
        return "error";
      }
    },
    rewardedLevelsForDate: (date) => rewardedUnlocks[date] ?? [],
    unlockLevelWithAd: async (date, level) => {
      if (level === "beginner" || rewardedUnlocks[date]?.includes(level)) return "unavailable";
      const result = await showRewardedReadingAd();
      if (result !== "earned") return result;

      const next = {
        ...rewardedUnlocks,
        [date]: [...(rewardedUnlocks[date] ?? []), level],
      };
      setRewardedUnlocks(next);
      await AsyncStorage.setItem(REWARDED_UNLOCKS_KEY, JSON.stringify(next));
      return "earned";
    },
  }), [hydrated, isStoreConfigured, isSubscribed, monthlyPackage, rewardedUnlocks]);

  return (
    <ReadingAccessContext.Provider value={value}>
      {children}
    </ReadingAccessContext.Provider>
  );
}

export function useReadingAccess() {
  const value = useContext(ReadingAccessContext);
  if (!value) {
    throw new Error("useReadingAccess must be used within ReadingAccessProvider");
  }
  return value;
}

function parseRewardedUnlocks(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).flatMap(([date, value]) => {
      const levels = (Array.isArray(value) ? value : [value]).filter(
        (level): level is ReadingLevel => level === "intermediate" || level === "advanced",
      );
      return levels.length ? [[date, [...new Set(levels)]]] : [];
    })) as Record<string, ReadingLevel[]>;
  } catch {
    return {};
  }
}

function isPurchaseCancelled(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
  );
}
