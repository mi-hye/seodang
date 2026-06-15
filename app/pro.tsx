import { Ionicons } from "@expo/vector-icons";
import {
  getAvailablePurchases as getAvailablePurchasesDirect,
  presentCodeRedemptionSheetIOS,
  useIAP,
  type Purchase,
} from "expo-iap";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { PRO_PRODUCT } from "../src/domain/pro/proProduct";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function ProScreen() {
  const { activateProPurchase, isPro } = useAppState();
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const [isPurchaseBusy, setIsPurchaseBusy] = useState(false);
  const [isRestoreBusy, setIsRestoreBusy] = useState(false);
  const [isRedeemBusy, setIsRedeemBusy] = useState(false);
  const {
    connected,
    fetchProducts,
    finishTransaction,
    products,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void handleGrantedPurchase(purchase);
    },
    onPurchaseError: (error) => {
      setIsPurchaseBusy(false);
      Alert.alert(t("pro.purchaseErrorTitle"), error.message);
    },
    onError: () => {
      setIsPurchaseBusy(false);
      setIsRestoreBusy(false);
    },
  });
  const proStoreProduct = useMemo(
    () => products.find((product) => product.id === PRO_PRODUCT.id),
    [products],
  );
  const displayPrice = proStoreProduct?.displayPrice ?? PRO_PRODUCT.price[locale];
  const canPurchasePro = connected && Boolean(proStoreProduct) && !isPro;

  useEffect(() => {
    if (!connected) {
      return;
    }

    void fetchProducts({
      skus: [PRO_PRODUCT.id],
      type: "in-app",
    });
  }, [connected, fetchProducts]);

  async function handleGrantedPurchase(purchase: Purchase) {
    setIsPurchaseBusy(false);

    if (!isProPurchase(purchase)) {
      return;
    }

    activateProPurchase();
    await finishTransaction({ purchase, isConsumable: false });
    Alert.alert(t("pro.purchaseSuccessTitle"), t("pro.purchaseSuccessBody"));
  }

  async function handlePurchase() {
    if (isPro) {
      return;
    }

    if (!connected || !proStoreProduct) {
      Alert.alert(t("pro.storeUnavailableTitle"), t("pro.storeUnavailableBody"));
      return;
    }

    try {
      setIsPurchaseBusy(true);
      await requestPurchase({
        type: "in-app",
        request: {
          apple: {
            sku: PRO_PRODUCT.id,
          },
          google: {
            skus: [PRO_PRODUCT.id],
          },
        },
      });
    } catch (error) {
      setIsPurchaseBusy(false);
      Alert.alert(
        t("pro.purchaseErrorTitle"),
        error instanceof Error ? error.message : t("pro.purchaseErrorBody"),
      );
    }
  }

  async function handleRestore() {
    if (!connected) {
      Alert.alert(t("pro.storeUnavailableTitle"), t("pro.storeUnavailableBody"));
      return;
    }

    try {
      setIsRestoreBusy(true);
      const purchases = await getAvailablePurchasesDirect({
        onlyIncludeActiveItemsIOS: true,
      });
      const proPurchases = purchases.filter(isProPurchase);

      if (proPurchases.length) {
        activateProPurchase();
        await Promise.all(
          proPurchases.map((purchase) =>
            finishTransaction({ purchase, isConsumable: false }),
          ),
        );
        Alert.alert(t("pro.restoreSuccessTitle"), t("pro.restoreSuccessBody"));
      } else {
        Alert.alert(t("pro.restoreEmptyTitle"), t("pro.restoreEmptyBody"));
      }
    } catch (error) {
      Alert.alert(
        t("pro.purchaseErrorTitle"),
        error instanceof Error ? error.message : t("pro.purchaseErrorBody"),
      );
    } finally {
      setIsRestoreBusy(false);
    }
  }

  async function handleRedeemOfferCode() {
    if (Platform.OS !== "ios") {
      Alert.alert(t("pro.redeemIosOnlyTitle"), t("pro.redeemIosOnlyBody"));
      return;
    }

    try {
      setIsRedeemBusy(true);
      await presentCodeRedemptionSheetIOS();
      const purchases = await getAvailablePurchasesDirect({
        onlyIncludeActiveItemsIOS: true,
      });
      const proPurchases = purchases.filter(isProPurchase);

      if (proPurchases.length) {
        activateProPurchase();
        await Promise.all(
          proPurchases.map((purchase) =>
            finishTransaction({ purchase, isConsumable: false }),
          ),
        );
      }
    } catch (error) {
      Alert.alert(
        t("pro.purchaseErrorTitle"),
        error instanceof Error ? error.message : t("pro.purchaseErrorBody"),
      );
    } finally {
      setIsRedeemBusy(false);
    }
  }

  const purchaseButtonLabel = isPro
    ? t("pro.active")
    : isPurchaseBusy
      ? t("pro.purchaseLoading")
      : proStoreProduct
        ? t("pro.purchaseAction", { price: displayPrice })
        : t("pro.productPreparing");

  return (
    <Screen>
      <View style={[styles.heroCard, styles.shadow]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t("pro.badge")}</Text>
        </View>
        <Text style={styles.title}>{t("pro.title")}</Text>
        <Text style={styles.body}>{t("pro.body")}</Text>
      </View>

      <View style={styles.featureList}>
        <ProFeature
          icon="stats-chart-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.statsTitle")}
          body={t("pro.feature.statsBody")}
          onPress={() => router.push("/review-stats")}
        />
        <ProFeature
          icon="analytics-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.weaknessTitle")}
          body={t("pro.feature.weaknessBody")}
          onPress={() => router.push("/review-weaknesses")}
        />
        <ProFeature
          icon="trophy-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.mistakeNoteTitle")}
          body={t("pro.feature.mistakeNoteBody")}
          onPress={() => router.push("/mistake-note")}
        />
        <ProFeature
          icon="flash-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.focusedReviewTitle")}
          body={t("pro.feature.focusedReviewBody")}
          onPress={() => router.push("/review-stats")}
        />
      </View>

      <View style={[styles.priceCard, styles.shadow]}>
        <Text style={styles.priceLabel}>{t("pro.priceLabel")}</Text>
        <Text style={styles.price}>{displayPrice}</Text>
        <Text style={styles.priceBody}>{t("pro.priceBody")}</Text>
        <View style={styles.includedList}>
          {PRO_PRODUCT.benefitKeys.map((benefitKey) => (
            <IncludedRow
              key={benefitKey}
              colors={colors}
              label={t(benefitKey)}
              styles={styles}
            />
          ))}
        </View>
        <Pressable
          style={[
            styles.primaryButton,
            !canPurchasePro ? styles.primaryButtonDisabled : null,
            isPro ? styles.activeButton : null,
          ]}
          disabled={!canPurchasePro || isPurchaseBusy}
          onPress={handlePurchase}
        >
          <Text
            style={[
              styles.primaryButtonText,
              isPro ? styles.activeButtonText : null,
            ]}
          >
            {purchaseButtonLabel}
          </Text>
        </Pressable>
        <View style={styles.purchaseActions}>
          <Pressable
            style={styles.textButton}
            disabled={isRestoreBusy}
            onPress={handleRestore}
          >
            <Text style={styles.textButtonLabel}>
              {isRestoreBusy ? t("pro.restoreLoading") : t("pro.restore")}
            </Text>
          </Pressable>
          <Pressable
            style={styles.textButton}
            disabled={isRedeemBusy}
            onPress={handleRedeemOfferCode}
          >
            <Text style={styles.textButtonLabel}>
              {isRedeemBusy ? t("pro.redeemLoading") : t("pro.redeemOfferCode")}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/review-stats")}
      >
        <Text style={styles.secondaryButtonText}>
          {t("pro.viewReviewStats")}
        </Text>
      </Pressable>
    </Screen>
  );
}

function isProPurchase(purchase: Purchase) {
  return purchase.productId === PRO_PRODUCT.id;
}

function ProFeature({
  body,
  colors,
  icon,
  onPress,
  styles,
  title,
}: {
  body: string;
  colors: ReturnType<typeof useTheme>["colors"];
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.featureCard,
        styles.shadow,
        pressed ? styles.featureCardPressed : null,
      ]}
    >
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={colors.accentWarmMuted} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.inkFaint}
      />
    </Pressable>
  );
}

function IncludedRow({
  colors,
  label,
  styles,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.includedRow}>
      <Ionicons
        name="checkmark"
        size={16}
        color={colors.accentWarmMuted}
      />
      <Text style={styles.includedText}>{label}</Text>
    </View>
  );
}

function createStyles({ colors, surfaceStyles, textStyles, shadows }: any) {
  return StyleSheet.create({
    heroCard: {
      ...surfaceStyles.card,
      padding: spacing[7],
      marginBottom: spacing[4],
      gap: spacing[3],
    },
    badge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      backgroundColor: colors.inkStrongAlt,
    },
    badgeText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    title: textStyles.displaySm,
    body: textStyles.bodySm,
    featureList: {
      gap: spacing[3],
      marginBottom: spacing[5],
    },
    featureCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      flexDirection: "row",
      gap: spacing[3],
      alignItems: "center",
    },
    featureCardPressed: {
      opacity: 0.72,
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgMuted,
    },
    featureContent: {
      flex: 1,
      gap: spacing[1],
    },
    featureTitle: textStyles.titleSm,
    featureBody: textStyles.bodySm,
    priceCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[3],
    },
    priceLabel: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
    price: textStyles.displayMd,
    priceBody: textStyles.bodySm,
    includedList: {
      gap: spacing[2],
      marginTop: spacing[1],
    },
    includedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    includedText: textStyles.bodySm,
    primaryButton: {
      alignItems: "center",
      borderRadius: 999,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[3],
      backgroundColor: colors.accentWarm,
      borderWidth: 1,
      borderColor: colors.accentWarm,
    },
    primaryButtonText: {
      ...textStyles.buttonLabel,
      color: colors.inkOnDark,
    },
    primaryButtonDisabled: {
      backgroundColor: colors.bgMutedStrong,
      borderColor: colors.borderSoft,
      opacity: 0.72,
    },
    activeButton: {
      backgroundColor: colors.inkStrongAlt,
      borderColor: colors.inkStrongAlt,
    },
    activeButtonText: {
      color: colors.inkOnDark,
    },
    purchaseActions: {
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: spacing[3],
    },
    textButton: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    textButtonLabel: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
    secondaryButton: {
      alignItems: "center",
      paddingVertical: spacing[3],
    },
    secondaryButtonText: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
    shadow: shadows.card,
  });
}
