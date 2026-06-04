import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import {
  buildCategoryProgressMap,
  listActiveCategoryProgress,
} from "../src/lib/categoryProgress";
import {
  useKanjiCategoryGroupsQuery,
  useKanjiCategoryProgressMappingsQuery,
} from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function CategoryProgressScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const {
    progressByCharacter,
    resetProgressByCategoryKey,
    resetCategoryProgress,
  } = useAppState();
  const { data: categoryGroups = [], isLoading, isError } =
    useKanjiCategoryGroupsQuery(locale);
  const completedCharacterIds = useMemo(
    () =>
      Object.values(progressByCharacter)
        .filter((progress) => progress.successes > 0)
        .map((progress) => progress.characterId)
        .sort(),
    [progressByCharacter],
  );
  const { data: categoryProgressMappings = [] } =
    useKanjiCategoryProgressMappingsQuery(completedCharacterIds);
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });

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
  const activeCategories = useMemo(
    () => listActiveCategoryProgress(categoryGroups, categoryProgressMap),
    [categoryGroups, categoryProgressMap],
  );
  const characterIdsByCategoryId = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const mapping of categoryProgressMappings) {
      const current = map.get(mapping.category_id) ?? [];
      current.push(mapping.character_id);
      map.set(mapping.category_id, current);
    }

    return map;
  }, [categoryProgressMappings]);
  const resetProgressMutation = useMutation({
    mutationFn: async (input: { categoryKey: string; characterIds: string[] }) =>
      input,
    onMutate: async ({ categoryKey, characterIds }) => {
      resetCategoryProgress({ categoryKey, characterIds });
      return {};
    },
    onError: () => {},
    onSettled: () => {},
  });

  return (
    <Screen>
      <View style={styles.wrapper}>
        {isLoading ? (
          <View style={[styles.emptyCard, styles.shadow]}>
            <Text style={styles.emptyTitle}>{t("common.loading")}</Text>
          </View>
        ) : null}

        {isError ? (
          <View style={[styles.emptyCard, styles.shadow]}>
            <Text style={styles.emptyTitle}>
              {t("categoryProgress.errorTitle")}
            </Text>
            <Text style={styles.emptyBody}>
              {t("categoryProgress.errorBody")}
            </Text>
          </View>
        ) : null}

        {!isLoading && !isError && !activeCategories.length ? (
          <View style={[styles.emptyCard, styles.shadow]}>
            <Text style={styles.emptyTitle}>
              {t("categoryProgress.emptyTitle")}
            </Text>
            <Text style={styles.emptyBody}>
              {t("categoryProgress.emptyBody")}
            </Text>
          </View>
        ) : null}

        {!isLoading && !isError
          ? activeCategories.map((category) => (
              <SwipeableCategoryProgressCard
                key={category.categoryKey}
                category={category}
                onPress={() =>
                  router.push({
                    pathname: "/list",
                    params: { categoryKey: category.categoryKey },
                  })
                }
                onReset={() =>
                  resetProgressMutation.mutate({
                    categoryKey: category.categoryKey,
                    characterIds:
                      characterIdsByCategoryId.get(category.categoryId) ?? [],
                  })
                }
              />
            ))
          : null}
      </View>
    </Screen>
  );
}

function SwipeableCategoryProgressCard({
  category,
  onPress,
  onReset,
}: {
  category: ReturnType<typeof listActiveCategoryProgress>[number];
  onPress: () => void;
  onReset: () => void;
}) {
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const { t } = useI18n();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const translateX = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);
  const actionWidth = 92;

  const animateTo = (value: number) => {
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      bounciness: 0,
      speed: 22,
    }).start(() => {
      opened.current = value !== 0;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 10 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderMove: (_, gesture) => {
        const baseOffset = opened.current ? -actionWidth : 0;
        const next = Math.max(-actionWidth, Math.min(0, baseOffset + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldOpen = opened.current
          ? gesture.dx < 24
          : gesture.dx < -36;
        animateTo(shouldOpen ? -actionWidth : 0);
      },
      onPanResponderTerminate: () => {
        animateTo(opened.current ? -actionWidth : 0);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View style={[styles.swipeShell, styles.shadow]}>
      <View style={styles.swipeRow}>
        <View style={styles.deleteAction}>
          <Pressable
            style={styles.deleteButton}
            onPress={() => {
              animateTo(0);
              onReset();
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.inkOnDark} />
            <Text style={styles.deleteText}>{t("categoryProgress.reset")}</Text>
          </Pressable>
        </View>

        <Animated.View
          style={[styles.progressCard, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={onPress} style={styles.progressCardContent}>
            <View style={styles.progressCardTop}>
              <Text style={styles.progressCategoryLabel}>{category.label}</Text>
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
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles({ colors, surfaceStyles, textStyles, shadows }: any) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing[3],
    },
    swipeShell: {
      ...surfaceStyles.card,
      borderRadius: 24,
      backgroundColor: colors.bgSurface,
    },
    swipeRow: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 24,
      backgroundColor: colors.bgSurface,
    },
    deleteAction: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: 92,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButton: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: 92,
      backgroundColor: colors.danger,
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    deleteText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    progressCard: {
      backgroundColor: colors.bgSurface,
      borderRadius: 24,
      width: "100%",
    },
    progressCardContent: {
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
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[2],
    },
    emptyTitle: textStyles.titleSm,
    emptyBody: {
      ...textStyles.bodySm,
      color: colors.inkMuted,
    },
    shadow: shadows.card,
  });
}
