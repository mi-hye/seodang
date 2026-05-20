import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import {
  buildCategoryProgressMap,
  buildCategoryTotalsMap,
  listActiveCategoryProgress,
} from "../src/lib/categoryProgress";
import {
  useKanjiCategoryGroupsQuery,
  useKanjiCharacterQuery,
  useKanjiCategoryProgressMappingsQuery,
  useKanjiCategoryTotalsQuery,
} from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function HomeScreen() {
  const router = useRouter();
  const {
    hydrated,
    favoriteCount,
    homeOnboardingDismissed,
    lastCompletedPractice,
    progressByCharacter,
    recentCategoryKeys,
    dismissHomeOnboarding,
  } = useAppState();
  const { locale, t } = useI18n();
  const { data: lastCharacter } = useKanjiCharacterQuery(
    lastCompletedPractice?.characterId,
  );
  const { data: categoryGroups = [], isLoading: isLoadingCategoryGroups } =
    useKanjiCategoryGroupsQuery(locale);
  const completedCharacterIds = useMemo(
    () =>
      Object.values(progressByCharacter)
        .filter((progress) => progress.successes > 0)
        .map((progress) => progress.characterId)
        .sort(),
    [progressByCharacter],
  );
  const {
    data: categoryProgressMappings = [],
    isLoading: isLoadingCategoryProgressMappings,
  } = useKanjiCategoryProgressMappingsQuery(completedCharacterIds);
  const {
    data: categoryTotalMappings = [],
    isLoading: isLoadingCategoryTotals,
  } = useKanjiCategoryTotalsQuery();
  const { colors, textStyles, surfaceStyles, shadows } = useTheme();
  const styles = createStyles({ colors, textStyles, surfaceStyles, shadows });
  const lastCategory = categoryGroups
    .flatMap((group) => group.categories)
    .find(
      (category) => category.categoryKey === lastCompletedPractice?.categoryKey,
    );
  const categoryProgressMap = useMemo(
    () =>
      buildCategoryProgressMap(
        categoryGroups,
        categoryProgressMappings,
        buildCategoryTotalsMap(categoryTotalMappings),
      ),
    [categoryGroups, categoryProgressMappings, categoryTotalMappings],
  );
  const featuredProgressCategories = useMemo(() => {
    const activeProgress = listActiveCategoryProgress(
      categoryGroups,
      categoryProgressMap,
    );
    const byCategoryKey = new Map(
      activeProgress.map((category) => [category.categoryKey, category]),
    );

    return recentCategoryKeys
      .map((categoryKey: string) => byCategoryKey.get(categoryKey))
      .filter(
        (
          category,
        ): category is ReturnType<typeof listActiveCategoryProgress>[number] =>
          Boolean(category),
      )
      .slice(0, 2);
  }, [categoryGroups, categoryProgressMap, recentCategoryKeys]);
  const isLoadingProgressSection =
    isLoadingCategoryGroups ||
    isLoadingCategoryTotals ||
    isLoadingCategoryProgressMappings;
  const showOnboarding = hydrated;

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.contentRoot}>
        <View
          style={[styles.hero, showOnboarding ? styles.dimmedSection : null]}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.title}>{t("home.title")}</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push("/search")}
                style={styles.iconButton}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={colors.inkStrong}
                />
              </Pressable>
              <Pressable
                onPress={() => router.push("/settings")}
                style={styles.iconButton}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={colors.inkStrong}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {showOnboarding ? (
          <View pointerEvents="none" style={styles.onboardingHint}>
            <View style={styles.onboardingTail} />
            <View style={styles.onboardingBubble}>
              <Text style={styles.onboardingHintText}>
                {t("home.onboardingAction")}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            if (showOnboarding) {
              dismissHomeOnboarding();
            }

            router.push("/categories");
          }}
          style={[styles.primaryCard, styles.shadow]}
        >
          <Text style={styles.primaryLabel}>{t("home.start")}</Text>
          <Text style={styles.primaryBody}>{t("home.startBody")}</Text>
        </Pressable>

        <View
          pointerEvents={showOnboarding ? "none" : "auto"}
          style={[styles.row, showOnboarding ? styles.dimmedSection : null]}
        >
          <Pressable
            onPress={() => router.push("/favorites")}
            style={[styles.actionCard, styles.shadow]}
          >
            <View style={styles.actionCardTop}>
              <Text style={styles.actionTitle}>{t("home.favorites")}</Text>
              <Text style={styles.actionValue}>
                {hydrated ? favoriteCount : "-"}
              </Text>
            </View>
            <Text style={styles.actionBody}>{t("home.favoritesBody")}</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              lastCompletedPractice?.characterId
                ? router.push({
                    pathname: "/practice/[characterId]",
                    params: {
                      characterId: lastCompletedPractice.characterId,
                      categoryKey: lastCompletedPractice.categoryKey,
                    },
                  })
                : router.push("/categories")
            }
            style={[styles.actionCard, styles.shadow]}
          >
            <View style={styles.actionCardTop}>
              <Text style={styles.actionTitle}>{t("home.recentPractice")}</Text>
              <Text style={styles.actionValue}>
                {lastCharacter?.literal ?? "-"}
              </Text>
            </View>
            <Text style={styles.actionBody}>
              {lastCharacter
                ? t("home.recentPracticeBodyReady", {
                    category: lastCategory?.label ?? t("nav.categories"),
                  })
                : t("home.recentPracticeBodyEmpty")}
            </Text>
          </Pressable>
        </View>

        <View
          pointerEvents={showOnboarding ? "none" : "auto"}
          style={[
            styles.progressSection,
            showOnboarding ? styles.dimmedSection : null,
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t("home.categoryProgress")}
            </Text>
            <Pressable onPress={() => router.push("/category-progress")}>
              <Text style={styles.sectionAction}>
                {t("home.seeAllCategories")}
              </Text>
            </Pressable>
          </View>

          {isLoadingProgressSection ? (
            <CategoryProgressSkeleton />
          ) : featuredProgressCategories.length ? (
            <View style={styles.progressList}>
              {featuredProgressCategories.map(
                (
                  category: ReturnType<
                    typeof listActiveCategoryProgress
                  >[number],
                ) => (
                  <Pressable
                    key={category.categoryKey}
                    onPress={() =>
                      router.push({
                        pathname: "/list",
                        params: { categoryKey: category.categoryKey },
                      })
                    }
                    style={[styles.progressCard, styles.shadow]}
                  >
                    <View style={styles.progressCardTop}>
                      <Text style={styles.progressCategoryLabel}>
                        {category.label}
                      </Text>
                      <Text style={styles.progressCount}>
                        {t("home.progressCount", {
                          completed: category.completed,
                          total: category.total,
                        })}
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.max(
                              category.ratio * 100,
                              category.completed > 0 ? 8 : 0,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressMeta}>
                      {t("home.progressPercent", {
                        percent: Math.round(category.ratio * 100),
                      })}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          ) : (
            <View style={[styles.progressEmptyCard, styles.shadow]}>
              <Text style={styles.progressEmptyTitle}>
                {t("home.progressEmptyTitle")}
              </Text>
              <Text style={styles.progressEmptyBody}>
                {t("home.progressEmptyBody")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

function CategoryProgressSkeleton() {
  const { colors, surfaceStyles, shadows } = useTheme();
  const styles = useMemo(
    () => createSkeletonStyles(colors, surfaceStyles, shadows),
    [colors, shadows, surfaceStyles],
  );
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.list}>
      {[0, 1].map((index) => (
        <Animated.View key={index} style={[styles.card, { opacity }]}>
          <View style={styles.topRow}>
            <View style={styles.label} />
            <View style={styles.count} />
          </View>
          <View style={styles.barTrack}>
            <View style={styles.barFill} />
          </View>
          <View style={styles.meta} />
        </Animated.View>
      ))}
    </View>
  );
}

function createStyles({ colors, textStyles, surfaceStyles, shadows }: any) {
  return StyleSheet.create({
    contentRoot: {
      position: "relative",
    },
    hero: {
      marginBottom: spacing[7],
      gap: spacing[2] + 2,
    },
    dimmedSection: {
      opacity: 0.32,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[1],
      gap: spacing[3],
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    title: textStyles.displayLg,
    subtitle: textStyles.bodyMd,
    primaryCard: {
      ...surfaceStyles.heroDark,
      padding: spacing[7],
      marginBottom: spacing[4],
    },
    onboardingHint: {
      position: "absolute",
      top: 200,
      left: 12,
      zIndex: 20,
      alignItems: "flex-start",
    },
    onboardingBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 18,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      maxWidth: 196,
    },
    onboardingTail: {
      marginLeft: 28,
      width: 0,
      height: 0,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderBottomWidth: 14,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderBottomColor: colors.accentWarm,
      marginBottom: -2,
    },
    onboardingHintText: {
      ...textStyles.bodySm,
      color: colors.inkOnDark,
      fontWeight: "800",
    },
    primaryLabel: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.inkOnDark,
      marginBottom: spacing[2],
    },
    primaryBody: {
      color: colors.inkOnDarkMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    row: {
      flexDirection: "row",
      gap: spacing[3],
      marginBottom: spacing[4],
    },
    actionCard: {
      flex: 1,
      ...surfaceStyles.card,
      padding: spacing[6],
      minHeight: 136,
      justifyContent: "space-between",
    },
    actionCardTop: {
      gap: spacing[2],
    },
    actionTitle: {
      ...textStyles.titleSm,
      fontWeight: "700",
    },
    actionValue: {
      ...textStyles.glyphMd,
      fontWeight: "700",
    },
    actionBody: {
      ...textStyles.bodySm,
      color: colors.inkMuted,
    },
    progressSection: {
      gap: spacing[3],
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    sectionTitle: textStyles.titleMd,
    sectionAction: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
    progressList: {
      gap: spacing[3],
    },
    progressCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      gap: spacing[3],
    },
    progressCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    progressCategoryLabel: textStyles.titleSm,
    progressCount: textStyles.meta,
    progressBarTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accentWarm,
    },
    progressMeta: {
      ...textStyles.bodySm,
      color: colors.inkMuted,
    },
    progressEmptyCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      gap: spacing[2],
    },
    progressEmptyTitle: textStyles.titleSm,
    progressEmptyBody: {
      ...textStyles.bodySm,
      color: colors.inkMuted,
    },
    shadow: shadows.card,
  });
}

function createSkeletonStyles(colors: any, surfaceStyles: any, shadows: any) {
  return StyleSheet.create({
    list: {
      gap: spacing[3],
    },
    card: {
      ...surfaceStyles.card,
      ...shadows.card,
      padding: spacing[5],
      gap: spacing[3],
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    label: {
      width: "42%",
      height: 16,
      borderRadius: 999,
      backgroundColor: colors.bgMutedStrong,
    },
    count: {
      width: 64,
      height: 12,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
    },
    barTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
      overflow: "hidden",
    },
    barFill: {
      width: "38%",
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.bgMutedStrong,
    },
    meta: {
      width: 52,
      height: 12,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
    },
  });
}
