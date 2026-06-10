import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { canAccessProFeature } from "../src/domain/pro/proAccess";
import { buildReviewStats } from "../src/domain/review/reviewStats";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function ReviewStatsScreen() {
  const { isPro, progressByCharacter } = useAppState();
  const { t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const stats = buildReviewStats(progressByCharacter);
  const canViewStats = canAccessProFeature({
    feature: "review_stats",
    isPro,
  });

  if (!canViewStats) {
    return (
      <Screen>
        <View style={[styles.lockedCard, styles.shadow]}>
          <View style={styles.lockIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={24}
              color={colors.inkOnDark}
            />
          </View>
          <Text style={styles.title}>{t("reviewStats.lockedTitle")}</Text>
          <Text style={styles.body}>{t("reviewStats.lockedBody")}</Text>
          <View style={styles.previewHeader}>
            <Text style={styles.chartTitle}>{t("reviewStats.previewTitle")}</Text>
            <View style={styles.lockedBadge}>
              <Ionicons
                name="lock-closed"
                size={12}
                color={colors.inkOnDark}
              />
              <Text style={styles.lockedBadgeText}>
                {t("reviewStats.previewLocked")}
              </Text>
            </View>
          </View>
          <View style={styles.previewGrid}>
            <View style={styles.previewStatCard}>
              <Text style={styles.statValue}>{stats.practicedCharacters}</Text>
              <Text style={styles.statLabel}>
                {t("reviewStats.practicedCharacters")}
              </Text>
            </View>
            <View style={styles.previewStatCard}>
              <Text style={styles.statValue}>{stats.totalAttempts}</Text>
              <Text style={styles.statLabel}>
                {t("reviewStats.totalAttempts")}
              </Text>
            </View>
            <View style={styles.previewStatCard}>
              <Text style={styles.statValue}>{stats.weakCharacters}</Text>
              <Text style={styles.statLabel}>
                {t("reviewStats.weakCharacters")}
              </Text>
            </View>
          </View>
          <View style={styles.lockedPreviewChart}>
            <MetricBar
              label={t("reviewStats.averageScore")}
              styles={styles}
              value={stats.averageScore}
              valueLabel={t("reviewStats.scoreValue", { value: stats.averageScore })}
            />
            <MetricBar
              label={t("reviewStats.successRate")}
              styles={styles}
              value={stats.successRate}
              valueLabel={t("reviewStats.percentValue", { value: stats.successRate })}
            />
            <View style={styles.previewScrim}>
              <Ionicons
                name="analytics-outline"
                size={18}
                color={colors.inkOnDark}
              />
              <Text style={styles.previewScrimText}>
                {t("reviewStats.previewLocked")}
              </Text>
            </View>
          </View>
          <View style={styles.featureList}>
            <FeatureRow
              colors={colors}
              label={t("reviewStats.proFeature.average")}
              styles={styles}
            />
            <FeatureRow
              colors={colors}
              label={t("reviewStats.proFeature.weakness")}
              styles={styles}
            />
            <FeatureRow
              colors={colors}
              label={t("reviewStats.proFeature.mastery")}
              styles={styles}
            />
          </View>
          <Pressable
            style={styles.upgradeButton}
            onPress={() => router.navigate("/pro")}
          >
            <Text style={styles.upgradeButtonText}>
              {t("reviewStats.viewPro")}
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (stats.practicedCharacters === 0) {
    return (
      <Screen>
        <Text style={styles.screenTitle}>{t("reviewStats.title")}</Text>
        <View style={[styles.emptyCard, styles.shadow]}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="bar-chart-outline"
              size={24}
              color={colors.inkOnDark}
            />
          </View>
          <Text style={styles.title}>{t("reviewStats.emptyTitle")}</Text>
          <Text style={styles.body}>{t("reviewStats.emptyBody")}</Text>
          <View style={styles.emptyChecklist}>
            <FeatureRow
              colors={colors}
              label={t("reviewStats.emptyStep.practice")}
              styles={styles}
            />
            <FeatureRow
              colors={colors}
              label={t("reviewStats.emptyStep.review")}
              styles={styles}
            />
            <FeatureRow
              colors={colors}
              label={t("reviewStats.emptyStep.analysis")}
              styles={styles}
            />
          </View>
          <Pressable
            style={styles.upgradeButton}
            onPress={() => router.navigate("/")}
          >
            <Text style={styles.upgradeButtonText}>
              {t("reviewStats.emptyAction")}
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.screenTitle}>{t("reviewStats.title")}</Text>
      <View style={[styles.chartCard, styles.shadow]}>
        <Text style={styles.chartTitle}>{t("reviewStats.performanceTitle")}</Text>
        <MetricBar
          label={t("reviewStats.averageScore")}
          styles={styles}
          value={stats.averageScore}
          valueLabel={t("reviewStats.scoreValue", { value: stats.averageScore })}
        />
        <MetricBar
          label={t("reviewStats.successRate")}
          styles={styles}
          value={stats.successRate}
          valueLabel={t("reviewStats.percentValue", { value: stats.successRate })}
        />
      </View>
      <View style={[styles.chartCard, styles.shadow]}>
        <Text style={styles.chartTitle}>{t("reviewStats.distributionTitle")}</Text>
        <View style={styles.distributionBar}>
          <View
            style={[
              styles.distributionSegmentWeak,
              { flex: getDistributionFlex(stats.characterDistribution.weak) },
            ]}
          />
          <View
            style={[
              styles.distributionSegmentProgress,
              {
                flex: getDistributionFlex(
                  stats.characterDistribution.inProgress,
                ),
              },
            ]}
          />
          <View
            style={[
              styles.distributionSegmentMastered,
              {
                flex: getDistributionFlex(stats.characterDistribution.mastered),
              },
            ]}
          />
        </View>
        <View style={styles.legendRow}>
          <LegendItem
            colorStyle={styles.legendWeak}
            label={t("reviewStats.weakDistribution", {
              value: stats.characterDistribution.weak,
            })}
            styles={styles}
          />
          <LegendItem
            colorStyle={styles.legendProgress}
            label={t("reviewStats.progressDistribution", {
              value: stats.characterDistribution.inProgress,
            })}
            styles={styles}
          />
          <LegendItem
            colorStyle={styles.legendMastered}
            label={t("reviewStats.masteredDistribution", {
              value: stats.characterDistribution.mastered,
            })}
            styles={styles}
          />
        </View>
      </View>
      <View style={styles.grid}>
        <StatCard
          label={t("reviewStats.practicedCharacters")}
          styles={styles}
          value={stats.practicedCharacters}
        />
        <StatCard
          label={t("reviewStats.totalAttempts")}
          styles={styles}
          value={stats.totalAttempts}
        />
        <StatCard
          onPress={
            stats.inProgressCharacters > 0
              ? () => router.push("/review-progressing")
              : undefined
          }
          label={t("reviewStats.inProgressCharacters")}
          styles={styles}
          value={stats.inProgressCharacters}
        />
        <StatCard
          onPress={
            stats.weakCharacters > 0
              ? () => router.push("/review-weaknesses")
              : undefined
          }
          label={t("reviewStats.weakCharacters")}
          styles={styles}
          value={stats.weakCharacters}
        />
        <StatCard
          onPress={
            stats.masteredCharacters > 0
              ? () => router.push("/review-mastered")
              : undefined
          }
          label={t("reviewStats.masteredCharacters")}
          styles={styles}
          value={stats.masteredCharacters}
        />
      </View>
    </Screen>
  );
}

function FeatureRow({
  colors,
  label,
  styles,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name="checkmark-circle"
        size={17}
        color={colors.accentWarmMuted}
      />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function MetricBar({
  label,
  styles,
  value,
  valueLabel,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: number;
  valueLabel: string;
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{valueLabel}</Text>
      </View>
      <View style={styles.metricTrack}>
        <View
          style={[
            styles.metricFill,
            { width: `${Math.max(0, Math.min(100, value))}%` },
          ]}
        />
      </View>
    </View>
  );
}

function LegendItem({
  colorStyle,
  label,
  styles,
}: {
  colorStyle: any;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, colorStyle]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function StatCard({
  label,
  onPress,
  styles,
  value,
}: {
  label: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
  value: string | number;
}) {
  const content = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[styles.statCard, styles.shadow]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.statCard, styles.shadow]}>
      {content}
    </View>
  );
}

function getDistributionFlex(value: number) {
  return value > 0 ? value : 0.01;
}

function createStyles({ colors, surfaceStyles, textStyles, shadows }: any) {
  return StyleSheet.create({
    screenTitle: {
      ...textStyles.displayMd,
      marginBottom: spacing[6],
    },
    lockedCard: {
      ...surfaceStyles.card,
      padding: spacing[7],
      alignItems: "flex-start",
      gap: spacing[3],
    },
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[7],
      alignItems: "flex-start",
      gap: spacing[3],
    },
    emptyIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentWarmMuted,
      marginBottom: spacing[1],
    },
    emptyChecklist: {
      gap: spacing[2],
      marginTop: spacing[2],
      marginBottom: spacing[2],
    },
    lockIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inkStrongAlt,
      marginBottom: spacing[1],
    },
    title: textStyles.titleMd,
    body: textStyles.bodySm,
    previewHeader: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
      marginTop: spacing[2],
    },
    lockedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[1],
      borderRadius: 999,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      backgroundColor: colors.inkStrongAlt,
    },
    lockedBadgeText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    previewGrid: {
      width: "100%",
      flexDirection: "row",
      gap: spacing[2],
    },
    previewStatCard: {
      flex: 1,
      minHeight: 92,
      borderRadius: 8,
      padding: spacing[3],
      justifyContent: "space-between",
      backgroundColor: colors.bgMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    lockedPreviewChart: {
      width: "100%",
      gap: spacing[4],
      borderRadius: 8,
      padding: spacing[4],
      overflow: "hidden",
      backgroundColor: colors.bgMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      opacity: 0.9,
    },
    previewScrim: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing[2],
      backgroundColor: `${colors.inkStrongAlt}D9`,
    },
    previewScrimText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    featureList: {
      gap: spacing[2],
      marginTop: spacing[1],
      marginBottom: spacing[2],
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    featureText: textStyles.bodySm,
    upgradeButton: {
      borderRadius: 999,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[3],
      backgroundColor: colors.inkStrongAlt,
    },
    upgradeButtonText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    chartCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      marginBottom: spacing[4],
      gap: spacing[4],
    },
    chartTitle: textStyles.titleMd,
    metricRow: {
      gap: spacing[2],
    },
    metricHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing[3],
    },
    metricLabel: textStyles.bodySm,
    metricValue: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
    metricTrack: {
      height: 12,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.bgMuted,
    },
    metricFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accentWarmMuted,
    },
    distributionBar: {
      height: 16,
      borderRadius: 999,
      overflow: "hidden",
      flexDirection: "row",
      backgroundColor: colors.bgMuted,
    },
    distributionSegmentWeak: {
      backgroundColor: colors.danger,
    },
    distributionSegmentProgress: {
      backgroundColor: colors.accentWarmMuted,
    },
    distributionSegmentMastered: {
      backgroundColor: colors.success,
    },
    legendRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[3],
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[1],
    },
    legendDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    legendWeak: {
      backgroundColor: colors.danger,
    },
    legendProgress: {
      backgroundColor: colors.accentWarmMuted,
    },
    legendMastered: {
      backgroundColor: colors.success,
    },
    legendText: textStyles.meta,
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[3],
    },
    statCard: {
      ...surfaceStyles.card,
      width: "47%",
      minHeight: 110,
      padding: spacing[5],
      justifyContent: "space-between",
    },
    statValue: {
      ...textStyles.displaySm,
      color: colors.accentWarmMuted,
    },
    statLabel: textStyles.bodySm,
    shadow: shadows.card,
  });
}
