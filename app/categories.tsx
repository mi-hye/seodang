import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Screen } from "../src/components/common/Screen";
import { radius, spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCategoryGroupsQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function CategoriesScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { hydrated, onboardingStep, dismissCategoryOnboarding } = useAppState();
  const { data, isLoading, isError } = useKanjiCategoryGroupsQuery(locale);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && width >= 700;
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({
    colors,
    isLandscape,
    surfaceStyles,
    textStyles,
  });
  const visibleGroups = (data ?? [])
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) =>
        category.visibleLocales.includes(locale),
      ),
    }))
    .filter((group) => group.categories.length > 0);
  const firstCategory = visibleGroups[0]?.categories[0];
  const firstCategoryGroupId = visibleGroups[0]?.id;
  const showOnboarding =
    hydrated && onboardingStep === "categories" && Boolean(firstCategory);

  const isExpanded = (groupId: string) => expandedGroupIds.includes(groupId);
  const toggleExpanded = (groupId: string) =>
    setExpandedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.content}>
        {showOnboarding ? (
          <View pointerEvents="none" style={styles.onboardingHint}>
            <View style={styles.onboardingTail} />
            <View style={styles.onboardingBubble}>
              <Text style={styles.onboardingHintText}>
                {t("categories.onboardingAction")}
              </Text>
            </View>
          </View>
        ) : null}

        {isLoading ? <CategoriesSkeleton isLandscape={isLandscape} /> : null}

        {isError ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>
              {t("categories.errorTitle")}
            </Text>
            <Text style={styles.placeholderBody}>
              {t("categories.errorBody")}
            </Text>
          </View>
        ) : null}

        {!isLoading && !isError && !visibleGroups.length ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>
              {t("categories.emptyTitle")}
            </Text>
            <Text style={styles.placeholderBody}>
              {t("categories.emptyBody")}
            </Text>
          </View>
        ) : null}

        {!isLoading && !isError
          ? visibleGroups.map((group) => (
              <View
                key={group.id}
                pointerEvents={
                  showOnboarding &&
                  !group.categories.some(
                    (category) => category.id === firstCategory?.id,
                  )
                    ? "none"
                    : "auto"
                }
                style={[
                  styles.groupSection,
                  showOnboarding && group.id !== firstCategoryGroupId
                    ? styles.dimmedSection
                    : null,
                ]}
              >
                <View
                  style={[
                    styles.groupHeader,
                    showOnboarding && group.id !== firstCategoryGroupId
                      ? styles.dimmedSection
                      : null,
                  ]}
                >
                  <Text style={styles.groupTitle}>{group.label}</Text>
                </View>

                {(() => {
                  const isRadicalGroup = group.groupKey === "radical";
                  const shouldCollapse =
                    isRadicalGroup && group.categories.length > 9;
                  const categories =
                    shouldCollapse && !isExpanded(group.id)
                      ? group.categories.slice(0, 9)
                      : group.categories;

                  return (
                    <>
                      <View style={styles.chipRow}>
                        {categories.map((category) => (
                          <Pressable
                            key={category.id}
                            disabled={
                              showOnboarding && category.id !== firstCategory?.id
                            }
                            style={[
                              styles.categoryChip,
                              showOnboarding && category.id !== firstCategory?.id
                                ? styles.categoryChipDimmed
                                : null,
                            ]}
                            onPress={() => {
                              if (showOnboarding) {
                                dismissCategoryOnboarding();
                              }

                              router.push({
                                pathname: "/list",
                                params: { categoryKey: category.categoryKey },
                              });
                            }}
                          >
                            <Text style={styles.categoryChipText}>
                              {category.label}
                            </Text>
                          </Pressable>
                        ))}

                        {shouldCollapse ? (
                          <Pressable
                            style={styles.moreChip}
                            onPress={() => toggleExpanded(group.id)}
                          >
                            <Text style={styles.moreChipText}>
                              {isExpanded(group.id)
                                ? t("categories.showLess")
                                : t("categories.showMore")}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </>
                  );
                })()}
              </View>
            ))
          : null}
      </View>
    </Screen>
  );
}

function CategoriesSkeleton({ isLandscape }: { isLandscape: boolean }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;
  const styles = useMemo(
    () => createSkeletonStyles(colors, isLandscape),
    [colors, isLandscape],
  );

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

  const skeletonStyle = { opacity } as const;
  const groups = [
    [96, 82, 74, 88],
    [108, 94, 86],
  ];

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.heroLineWide, skeletonStyle]} />
      <Animated.View style={[styles.heroLineNarrow, skeletonStyle]} />

      {groups.map((chips, groupIndex) => (
        <View key={groupIndex} style={styles.groupSection}>
          <Animated.View style={[styles.groupTitle, skeletonStyle]} />
          <Animated.View style={[styles.groupBody, skeletonStyle]} />
          <View style={styles.chipRow}>
            {chips.map((width, chipIndex) => (
              <Animated.View
                key={`${groupIndex}-${chipIndex}`}
                style={[styles.chip, { width }, skeletonStyle]}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles({ colors, isLandscape, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    content: {
      alignSelf: "center",
      width: "100%",
      maxWidth: isLandscape ? 760 : undefined,
      position: "relative",
    },
    screenContent: {
      paddingTop: 0,
    },
    dimmedSection: {
      opacity: 0.32,
    },
    onboardingHint: {
      position: "absolute",
      top: 76,
      left: 20,
      zIndex: 20,
      alignItems: "flex-start",
    },
    onboardingBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 18,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      maxWidth: 220,
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
    placeholderCard: {
      ...surfaceStyles.card,
      padding: spacing[7],
      gap: spacing[2],
      marginBottom: spacing[6],
    },
    placeholderTitle: textStyles.titleMd,
    placeholderBody: textStyles.bodySm,
    groupSection: {
      marginBottom: spacing[7],
      gap: spacing[3],
      alignItems: isLandscape ? "center" : "stretch",
    },
    groupHeader: {
      gap: spacing[1],
      alignItems: isLandscape ? "center" : "stretch",
    },
    groupTitle: {
      ...textStyles.sectionTitle,
      textAlign: isLandscape ? "center" : "left",
    },
    groupBody: {
      ...textStyles.bodySm,
      textAlign: isLandscape ? "center" : "left",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: isLandscape ? "center" : "flex-start",
      gap: spacing[2],
    },
    categoryChip: {
      backgroundColor: colors.bgMuted,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 2,
    },
    categoryChipDimmed: {
      opacity: 0.32,
    },
    categoryChipText: {
      ...textStyles.meta,
      color: colors.inkStrong,
    },
    moreChip: {
      backgroundColor: colors.bgCanvas,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    moreChipText: {
      ...textStyles.meta,
      color: colors.inkStrong,
    },
  });
}

function createSkeletonStyles(colors: any, isLandscape: boolean) {
  return StyleSheet.create({
    wrapper: {
      alignSelf: "center",
      gap: spacing[7],
      width: "100%",
      maxWidth: isLandscape ? 760 : undefined,
    },
    heroLineWide: {
      width: "46%",
      height: 16,
      borderRadius: radius.pill,
      backgroundColor: colors.bgMutedStrong,
    },
    heroLineNarrow: {
      width: "62%",
      height: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.bgMuted,
      marginTop: -spacing[5],
    },
    groupSection: {
      gap: spacing[3],
      alignItems: isLandscape ? "center" : "stretch",
    },
    groupTitle: {
      width: 112,
      height: 18,
      borderRadius: radius.pill,
      backgroundColor: colors.bgMutedStrong,
    },
    groupBody: {
      width: "58%",
      height: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.bgMuted,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: isLandscape ? "center" : "flex-start",
      gap: spacing[2],
    },
    chip: {
      height: 38,
      borderRadius: radius.sm,
      backgroundColor: colors.bgMutedStrong,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
  });
}
