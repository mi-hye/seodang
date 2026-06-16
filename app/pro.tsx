import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { PRO_PRODUCT } from "../src/domain/pro/proProduct";
import { useI18n } from "../src/i18n/useI18n";

export default function ProScreen() {
  const { t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });

  return (
    <Screen>
      <View style={[styles.heroCard, styles.shadow]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t("pro.freeLaunchBadge")}</Text>
        </View>
        <Text style={styles.title}>{t("pro.freeLaunchTitle")}</Text>
        <Text style={styles.body}>{t("pro.freeLaunchBody")}</Text>
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
        <Text style={styles.priceLabel}>{t("pro.freeLaunchIncludedTitle")}</Text>
        <Text style={styles.priceBody}>{t("pro.freeLaunchIncludedBody")}</Text>
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
          style={styles.primaryButton}
          onPress={() => router.push("/review-stats")}
        >
          <Text style={styles.primaryButtonText}>
            {t("pro.freeLaunchPrimaryAction")}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
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
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
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
      <Ionicons name="checkmark" size={16} color={colors.accentWarmMuted} />
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
    shadow: shadows.card,
  });
}
