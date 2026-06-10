import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { PRO_PRODUCT } from "../src/domain/pro/proProduct";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function ProScreen() {
  const { isPro } = useAppState();
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });

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
        />
        <ProFeature
          icon="analytics-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.weaknessTitle")}
          body={t("pro.feature.weaknessBody")}
        />
        <ProFeature
          icon="notifications-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.notificationsTitle")}
          body={t("pro.feature.notificationsBody")}
        />
      </View>

      <View style={[styles.priceCard, styles.shadow]}>
        <Text style={styles.priceLabel}>{t("pro.priceLabel")}</Text>
        <Text style={styles.price}>{PRO_PRODUCT.price[locale]}</Text>
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
          style={[styles.disabledButton, isPro ? styles.activeButton : null]}
          disabled
        >
          <Text
            style={[
              styles.disabledButtonText,
              isPro ? styles.activeButtonText : null,
            ]}
          >
            {isPro ? t("pro.active") : t("pro.purchasePending")}
          </Text>
        </Pressable>
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

function ProFeature({
  body,
  colors,
  icon,
  styles,
  title,
}: {
  body: string;
  colors: ReturnType<typeof useTheme>["colors"];
  icon: keyof typeof Ionicons.glyphMap;
  styles: ReturnType<typeof createStyles>;
  title: string;
}) {
  return (
    <View style={[styles.featureCard, styles.shadow]}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={colors.accentWarmMuted} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
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
      alignItems: "flex-start",
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
    disabledButton: {
      alignItems: "center",
      borderRadius: 999,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[3],
      backgroundColor: colors.bgMutedStrong,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    disabledButtonText: {
      ...textStyles.meta,
      color: colors.inkMuted,
    },
    activeButton: {
      backgroundColor: colors.inkStrongAlt,
      borderColor: colors.inkStrongAlt,
    },
    activeButtonText: {
      color: colors.inkOnDark,
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
