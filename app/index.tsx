import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import {
  buildCategoryProgressMap,
  listActiveCategoryProgress,
} from "../src/lib/categoryProgress";
import { buildReviewQueue } from "../src/domain/review/buildReviewQueue";
import {
  useKanjiCategoryGroupsQuery,
  useKanjiCharacterQuery,
  useKanjiCategoryProgressMappingsQuery,
} from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function HomeScreen() {
  const router = useRouter();
  const {
    hydrated,
    favoriteCount,
    onboardingStep,
    lastCompletedPractice,
    progressByCharacter,
    recentCategoryKeys,
    resetProgressByCategoryKey,
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
  const reviewQueue = useMemo(
    () => buildReviewQueue(progressByCharacter, { limit: 20 }),
    [progressByCharacter],
  );
  const reviewCount = reviewQueue.length;
  const {
    data: categoryProgressMappings = [],
    isLoading: isLoadingCategoryProgressMappings,
  } = useKanjiCategoryProgressMappingsQuery(completedCharacterIds);
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const textScale = getHomeTextScale(screenWidth, fontScale);
  const { colors, textStyles, surfaceStyles, shadows } = useTheme();
  const styles = createStyles({
    colors,
    textScale,
    textStyles,
    surfaceStyles,
    shadows,
  });
  const [startCardLayout, setStartCardLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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
        undefined,
        resetProgressByCategoryKey,
      ),
    [
      categoryGroups,
      categoryProgressMappings,
      resetProgressByCategoryKey,
    ],
  );
  const featuredProgressCategories = useMemo(() => {
    const activeProgress = listActiveCategoryProgress(
      categoryGroups,
      categoryProgressMap,
    );
    const byCategoryKey = new Map(
      activeProgress.map((category) => [category.categoryKey, category]),
    );
    const prioritized = recentCategoryKeys
      .map((categoryKey: string) => byCategoryKey.get(categoryKey))
      .filter(
        (
          category,
        ): category is ReturnType<typeof listActiveCategoryProgress>[number] =>
          Boolean(category),
      );
    const remaining = activeProgress.filter(
      (category) =>
        !prioritized.some(
          (prioritizedCategory) =>
            prioritizedCategory.categoryKey === category.categoryKey,
        ),
    );

    return [...prioritized, ...remaining].slice(0, 2);
  }, [
    categoryGroups,
    categoryProgressMap,
    recentCategoryKeys,
  ]);
  const isLoadingProgressSection =
    isLoadingCategoryGroups ||
    isLoadingCategoryProgressMappings;
  const showOnboarding = hydrated && onboardingStep === "home";
  const onboardingHintStyle = startCardLayout
    ? {
        top: startCardLayout.y + 130,
        left: startCardLayout.x + 12,
      }
    : styles.onboardingHint;

  const handleStartCardLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setStartCardLayout({ x, y, width, height });
  };

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.contentRoot}>
        <View
          pointerEvents={showOnboarding ? "none" : "auto"}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <Text style={[styles.title, showOnboarding ? styles.dimmedTitle : null]}>
              {t("home.title")}
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push("/search")}
                style={styles.iconButton}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={showOnboarding ? colors.inkFaint : colors.inkStrong}
                />
              </Pressable>
              <Pressable
                onPress={() => router.push("/settings")}
                style={styles.iconButton}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={showOnboarding ? colors.inkFaint : colors.inkStrong}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {showOnboarding ? (
          <View
            pointerEvents="none"
            style={[styles.onboardingHint, onboardingHintStyle]}
          >
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
          onLayout={handleStartCardLayout}
          style={[styles.primaryCard, styles.shadow]}
        >
          <Text style={styles.primaryLabel}>{t("home.start")}</Text>
          <Text style={styles.primaryBody}>{t("home.startBody")}</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/review")}
          style={[
            styles.reviewCard,
            showOnboarding ? styles.dimmedCard : styles.shadow,
          ]}
        >
          <View style={styles.reviewCardTop}>
            <Text
              style={[
                styles.reviewTitle,
                showOnboarding ? styles.dimmedText : null,
              ]}
            >
              {t("home.review")}
            </Text>
            <Text
              style={[
                styles.reviewCount,
                showOnboarding ? styles.dimmedText : null,
              ]}
            >
              {hydrated ? t("home.reviewCount", { count: reviewCount }) : "-"}
            </Text>
          </View>
        </Pressable>

        <View
          pointerEvents={showOnboarding ? "none" : "auto"}
          style={styles.row}
        >
          <Pressable
            onPress={() => router.push("/favorites")}
            style={[
              styles.actionCard,
              showOnboarding ? styles.dimmedCard : styles.shadow,
            ]}
          >
            <View style={styles.actionCardTop}>
              <Text
                style={[
                  styles.actionTitle,
                  showOnboarding ? styles.dimmedText : null,
                ]}
              >
                {t("home.favorites")}
              </Text>
              <Text
                style={[
                  styles.actionValue,
                  showOnboarding ? styles.dimmedText : null,
                ]}
              >
                {hydrated ? favoriteCount : "-"}
              </Text>
            </View>
            <Text
              style={[
                styles.actionBody,
                showOnboarding ? styles.dimmedBodyText : null,
              ]}
            >
              {t("home.favoritesBody")}
            </Text>
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
            style={[
              styles.actionCard,
              showOnboarding ? styles.dimmedCard : styles.shadow,
            ]}
          >
            <View style={styles.actionCardTop}>
              <Text
                style={[
                  styles.actionTitle,
                  showOnboarding ? styles.dimmedText : null,
                ]}
              >
                {t("home.recentPractice")}
              </Text>
              <Text
                style={[
                  styles.actionValue,
                  showOnboarding ? styles.dimmedText : null,
                ]}
              >
                {lastCharacter?.literal ?? "-"}
              </Text>
            </View>
            <Text
              style={[
                styles.actionBody,
                showOnboarding ? styles.dimmedBodyText : null,
              ]}
            >
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
          style={styles.progressSection}
        >
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                showOnboarding ? styles.dimmedText : null,
              ]}
            >
              {t("home.categoryProgress")}
            </Text>
            <Pressable onPress={() => router.push("/category-progress")}>
              <Text
                style={[
                  styles.sectionAction,
                  showOnboarding ? styles.dimmedActionText : null,
                ]}
              >
                {t("home.seeAllCategories")}
              </Text>
            </Pressable>
          </View>

          {showOnboarding ? (
            <ProgressEmptyCard styles={styles} showOnboarding />
          ) : isLoadingProgressSection ? (
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
                    style={[
                      styles.progressCard,
                      showOnboarding ? styles.dimmedCard : styles.shadow,
                    ]}
                  >
                    <View style={styles.progressCardTop}>
                      <Text
                        style={[
                          styles.progressCategoryLabel,
                          showOnboarding ? styles.dimmedText : null,
                        ]}
                      >
                        {category.label}
                      </Text>
                      <Text
                        style={[
                          styles.progressCount,
                          showOnboarding ? styles.dimmedBodyText : null,
                        ]}
                      >
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
                          showOnboarding ? styles.dimmedProgressBarFill : null,
                          {
                            width: `${Math.max(
                              category.ratio * 100,
                              category.completed > 0 ? 8 : 0,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.progressMeta,
                        showOnboarding ? styles.dimmedBodyText : null,
                      ]}
                    >
                      {t("home.progressPercent", {
                        percent: Math.round(category.ratio * 100),
                      })}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          ) : (
            <ProgressEmptyCard styles={styles} />
          )}
        </View>
      </View>
    </Screen>
  );
}

function ProgressEmptyCard({
  showOnboarding = false,
  styles,
}: {
  showOnboarding?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useI18n();

  return (
    <View
      style={[
        styles.progressEmptyCard,
        showOnboarding ? styles.dimmedCard : styles.shadow,
      ]}
    >
      <Text
        style={[
          styles.progressEmptyTitle,
          showOnboarding ? styles.dimmedText : null,
        ]}
      >
        {t("home.progressEmptyTitle")}
      </Text>
      <Text
        style={[
          styles.progressEmptyBody,
          showOnboarding ? styles.dimmedBodyText : null,
        ]}
      >
        {t("home.progressEmptyBody")}
      </Text>
    </View>
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

function getHomeTextScale(screenWidth: number, fontScale: number) {
  const widthScale = Math.min(1, Math.max(0.84, screenWidth / 390));
  const accessibilityScale = fontScale > 1 ? Math.max(0.86, 1 / fontScale) : 1;
  return widthScale * accessibilityScale;
}

function scaledFont(size: number, textScale: number) {
  return Math.round(size * textScale);
}

function createStyles({
  colors,
  textScale,
  textStyles,
  surfaceStyles,
  shadows,
}: any) {
  return StyleSheet.create({
    contentRoot: {
      position: "relative",
    },
    hero: {
      position: "relative",
      marginBottom: spacing[7],
      gap: spacing[2] + 2,
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
    title: {
      ...textStyles.displayLg,
      fontSize: scaledFont(34, textScale),
      lineHeight: scaledFont(40, textScale),
    },
    subtitle: {
      ...textStyles.bodyMd,
      fontSize: scaledFont(15, textScale),
      lineHeight: scaledFont(23, textScale),
    },
    primaryCard: {
      ...surfaceStyles.heroDark,
      padding: spacing[7],
      marginBottom: spacing[4],
    },
    onboardingHint: {
      position: "absolute",
      top: 200,
      left: 12,
      zIndex: 999,
      elevation: 999,
      alignItems: "flex-start",
      maxWidth: "92%",
    },
    onboardingBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 18,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      alignSelf: "flex-start",
      zIndex: 1000,
      elevation: 1000,
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
      zIndex: 1000,
      elevation: 1000,
    },
    onboardingHintText: {
      ...textStyles.bodySm,
      fontSize: scaledFont(14, textScale),
      lineHeight: scaledFont(21, textScale),
      color: colors.inkOnDark,
      fontWeight: "800",
    },
    primaryLabel: {
      fontSize: scaledFont(22, textScale),
      lineHeight: scaledFont(30, textScale),
      fontWeight: "800",
      color: colors.inkOnDark,
      marginBottom: spacing[2],
    },
    primaryBody: {
      color: colors.inkOnDarkMuted,
      fontSize: scaledFont(15, textScale),
      lineHeight: scaledFont(22, textScale),
    },
    reviewCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      marginBottom: spacing[4],
      gap: spacing[3],
    },
    reviewCardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing[3],
    },
    reviewTitle: {
      ...textStyles.titleSm,
      fontSize: scaledFont(16, textScale),
      lineHeight: scaledFont(22, textScale),
      fontWeight: "800",
      flex: 1,
    },
    reviewCount: {
      ...textStyles.titleSm,
      fontSize: scaledFont(16, textScale),
      lineHeight: scaledFont(22, textScale),
      fontWeight: "800",
      color: colors.accentWarmMuted,
    },
    row: {
      position: "relative",
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
      fontSize: scaledFont(16, textScale),
      lineHeight: scaledFont(22, textScale),
      fontWeight: "700",
    },
    actionValue: {
      ...textStyles.glyphMd,
      fontSize: scaledFont(36, textScale),
      lineHeight: scaledFont(42, textScale),
      fontWeight: "700",
    },
    actionBody: {
      ...textStyles.bodySm,
      fontSize: scaledFont(14, textScale),
      lineHeight: scaledFont(21, textScale),
      color: colors.inkMuted,
    },
    progressSection: {
      position: "relative",
      gap: spacing[3],
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    sectionTitle: {
      ...textStyles.titleMd,
      fontSize: scaledFont(18, textScale),
      lineHeight: scaledFont(24, textScale),
    },
    sectionAction: {
      ...textStyles.meta,
      fontSize: scaledFont(12, textScale),
      lineHeight: scaledFont(17, textScale),
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
    progressCategoryLabel: {
      ...textStyles.titleSm,
      fontSize: scaledFont(16, textScale),
      lineHeight: scaledFont(22, textScale),
    },
    progressCount: {
      ...textStyles.meta,
      fontSize: scaledFont(12, textScale),
      lineHeight: scaledFont(17, textScale),
    },
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
      fontSize: scaledFont(14, textScale),
      lineHeight: scaledFont(21, textScale),
      color: colors.inkMuted,
    },
    progressEmptyCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      gap: spacing[2],
    },
    progressEmptyTitle: {
      ...textStyles.titleSm,
      fontSize: scaledFont(16, textScale),
      lineHeight: scaledFont(22, textScale),
    },
    progressEmptyBody: {
      ...textStyles.bodySm,
      fontSize: scaledFont(14, textScale),
      lineHeight: scaledFont(21, textScale),
      color: colors.inkMuted,
    },
    dimmedCard: {
      backgroundColor: colors.bgSurface,
    },
    dimmedTitle: {
      color: colors.inkFaint,
    },
    dimmedText: {
      color: colors.inkFaint,
    },
    dimmedBodyText: {
      color: colors.inkFaint,
    },
    dimmedActionText: {
      color: colors.inkFaint,
    },
    dimmedProgressBarFill: {
      backgroundColor: colors.bgMutedStrong,
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
