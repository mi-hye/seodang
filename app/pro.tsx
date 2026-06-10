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
          icon="trophy-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.mistakeNoteTitle")}
          body={t("pro.feature.mistakeNoteBody")}
        />
        <ProFeature
          icon="flash-outline"
          colors={colors}
          styles={styles}
          title={t("pro.feature.focusedReviewTitle")}
          body={t("pro.feature.focusedReviewBody")}
        />
      </View>

      <View style={[styles.mistakePreviewCard, styles.shadow]}>
        <View style={styles.previewHeader}>
          <View style={styles.previewIcon}>
            <Ionicons
              name="trophy-outline"
              size={18}
              color={colors.inkOnDark}
            />
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>
              {t("pro.preview.mistakeTitle")}
            </Text>
            <Text style={styles.previewBody}>
              {t("pro.preview.mistakeBody")}
            </Text>
          </View>
        </View>
        <View style={styles.previewTabs}>
          <View style={[styles.previewTab, styles.previewTabActive]}>
            <Text style={styles.previewTabActiveText}>
              {t("pro.preview.tabRepeated")}
            </Text>
          </View>
          <View style={styles.previewTab}>
            <Text style={styles.previewTabText}>
              {t("pro.preview.tabConquered")}
            </Text>
          </View>
        </View>
        <View style={styles.previewRows}>
          <PreviewMetric
            label={t("pro.preview.priority")}
            styles={styles}
            value="4"
          />
          <PreviewMetric
            label={t("pro.preview.badges")}
            styles={styles}
            value="1/4"
          />
          <PreviewMetric
            label={t("pro.preview.rank")}
            styles={styles}
            value={t("mistakeNote.rank.practitioner")}
          />
        </View>
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

function PreviewMetric({
  label,
  styles,
  value,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  return (
    <View style={styles.previewMetric}>
      <Text style={styles.previewMetricValue}>{value}</Text>
      <Text style={styles.previewMetricLabel}>{label}</Text>
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
    mistakePreviewCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      gap: spacing[3],
      marginBottom: spacing[5],
    },
    previewHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing[3],
    },
    previewIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inkStrongAlt,
    },
    previewCopy: {
      flex: 1,
      gap: spacing[1],
      minWidth: 0,
    },
    previewTitle: textStyles.titleSm,
    previewBody: textStyles.bodySm,
    previewTabs: {
      flexDirection: "row",
      gap: spacing[2],
    },
    previewTab: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: spacing[2],
      alignItems: "center",
      backgroundColor: colors.bgMuted,
    },
    previewTabActive: {
      backgroundColor: colors.inkStrongAlt,
    },
    previewTabText: {
      ...textStyles.meta,
      color: colors.inkMuted,
    },
    previewTabActiveText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    previewRows: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
    },
    previewMetric: {
      flexBasis: "48%",
      flexGrow: 1,
      minWidth: 0,
      minHeight: 66,
      borderRadius: 8,
      padding: spacing[3],
      justifyContent: "space-between",
      backgroundColor: colors.bgMuted,
    },
    previewMetricValue: {
      ...textStyles.titleSm,
      color: colors.accentWarmMuted,
      flexShrink: 1,
      lineHeight: 20,
    },
    previewMetricLabel: {
      ...textStyles.meta,
      flexShrink: 1,
      lineHeight: 17,
    },
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
