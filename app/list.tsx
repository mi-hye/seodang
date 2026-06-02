import { Link, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FavoriteButton } from "../src/components/common/FavoriteButton";
import { KanjiLoadingScreen } from "../src/components/common/KanjiLoadingScreen";
import { ErrorState } from "../src/components/common/ErrorState";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning, KanjiCharacter } from "../src/data/characters";
import { layout, spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { buildCategoryProgressMap } from "../src/lib/categoryProgress";
import {
  useKanjiCategoryGroupsQuery,
  useKanjiCategoryProgressMappingsQuery,
  useKanjiCharactersByCategoryQuery,
} from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function CharacterListScreen() {
  const { categoryKey } = useLocalSearchParams<{ categoryKey?: string }>();
  const normalizedCategoryKey = Array.isArray(categoryKey)
    ? categoryKey[0]
    : categoryKey;
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });
  const {
    getProgress,
    progressByCharacter,
    resetProgressByCategoryKey,
    onboardingStep,
    setOnboardingStep,
  } = useAppState();
  const [searchText, setSearchText] = useState("");
  const [firstCardLayout, setFirstCardLayout] = useState<{
    x: number;
    y: number;
    height: number;
  } | null>(null);
  const { data: categoryGroups = [] } = useKanjiCategoryGroupsQuery(locale);
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
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useKanjiCharactersByCategoryQuery(normalizedCategoryKey, locale);

  const pages = data?.pages ?? [];
  const firstPage = pages[0] ?? null;
  const selectedCategory = firstPage?.category;
  const items = pages.flatMap((page) => page?.characters ?? []);
  const headerTitle = selectedCategory?.label ?? t("list.title");
  const categoryProgressMap = useMemo(
    () =>
      buildCategoryProgressMap(
        categoryGroups,
        categoryProgressMappings,
        new Map(),
        resetProgressByCategoryKey,
      ),
    [categoryGroups, categoryProgressMappings, resetProgressByCategoryKey],
  );
  const currentCategoryProgress = normalizedCategoryKey
    ? categoryProgressMap.get(normalizedCategoryKey)
    : undefined;
  const categoryTotal = firstPage?.total ?? null;
  const completedCount = currentCategoryProgress?.completed ?? 0;
  const subtitle =
    categoryTotal != null
      ? `${t("list.progressSummary", {
          completed: completedCount,
          total: categoryTotal,
        })}`
      : t("list.subtitle");
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter((character) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          character.literal,
          character.meaningKo,
          character.meaningJa,
          character.exampleKo,
          character.exampleJa,
          ...character.onyomi,
          ...character.kunyomi,
          ...(character.metadata?.meaningEn ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      }),
    [items, normalizedSearch],
  );
  const firstCharacterId = filteredItems[0]?.id;

  const showFavoriteOnboarding = onboardingStep === "list_favorite";
  const showItemOnboarding = onboardingStep === "list_item";
  const itemHintStyle = firstCardLayout
    ? {
        top: firstCardLayout.y + firstCardLayout.height + 180,
        left: firstCardLayout.x + 14,
      }
    : styles.itemHint;

  if (isLoading) {
    return <KanjiLoadingScreen />;
  }

  if (isError) {
    return (
      <Screen contentStyle={styles.content} scrollContainer={false}>
        <View>
          <ErrorState
            title={t("list.errorTitle")}
            body={t("list.errorBody")}
            onRetry={() => {
              void refetch();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screenContent} scrollContainer={false}>
      <View style={styles.screenStack}>
        <FlatList
          data={filteredItems}
          keyExtractor={(character) => character.id}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>{headerTitle}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            <View
              pointerEvents={firstCharacterId ? "none" : "auto"}
              style={styles.searchRowWrap}
            >
                <View style={styles.searchRow}>
                  <TextInput
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder={t("list.searchPlaceholder")}
                    placeholderTextColor={colors.inkMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                  {searchText ? (
                    <Pressable
                      style={styles.searchClearButton}
                      onPress={() => setSearchText("")}
                      hitSlop={8}
                    >
                      <Text style={styles.searchClearText}>×</Text>
                    </Pressable>
                  ) : null}
                </View>
                {firstCharacterId ? (
                  <View pointerEvents="none" style={styles.searchOverlay} />
                ) : null}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t("list.emptyTitle")}</Text>
              <Text style={styles.emptyBody}>{t("list.emptyBody")}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <CharacterCard
              categoryKey={normalizedCategoryKey}
              character={item}
              index={index}
              getProgress={getProgress}
              showFavoriteHint={index === 0 && showFavoriteOnboarding}
              onFirstCardLayout={
                index === 0
                  ? (layout) => setFirstCardLayout(layout)
                  : undefined
              }
              isDimmed={
                Boolean(firstCharacterId) &&
                item.id !== firstCharacterId &&
                (showFavoriteOnboarding || showItemOnboarding)
              }
              onAdvanceItemOnboarding={
                index === 0 && showItemOnboarding
                  ? () => setOnboardingStep("detail")
                  : undefined
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t("common.loading")}</Text>
              </View>
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
        />

        {firstCharacterId && showFavoriteOnboarding ? (
          <Pressable
            style={styles.tapAnywhereOverlay}
            onPress={() => setOnboardingStep("list_item")}
          />
        ) : null}

        {firstCharacterId && showItemOnboarding ? (
          <View pointerEvents="none" style={[styles.itemHint, itemHintStyle]}>
            <View style={styles.itemHintTail} />
            <View style={styles.itemHintBubble}>
              <Text style={styles.itemHintText}>{t("list.itemHint")}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function CharacterCard({
  categoryKey,
  character,
  index,
  getProgress,
  showFavoriteHint,
  onFirstCardLayout,
  isDimmed,
  onAdvanceItemOnboarding,
}: {
  categoryKey?: string;
  character: KanjiCharacter;
  index: number;
  getProgress: ReturnType<typeof useAppState>["getProgress"];
  showFavoriteHint?: boolean;
  onFirstCardLayout?: (layout: {
    x: number;
    y: number;
    height: number;
  }) => void;
  isDimmed?: boolean;
  onAdvanceItemOnboarding?: () => void;
}) {
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });
  const progress = getProgress(character.id);

  return (
    <View style={styles.cardStack}>
      <Link
        href={{
          pathname: "/character/[characterId]",
          params: {
            characterId: character.id,
            categoryKey,
          },
        }}
        asChild
      >
        <Pressable
          disabled={isDimmed}
          style={styles.card}
          onLayout={
            onFirstCardLayout
              ? (event: LayoutChangeEvent) => {
                  const { x, y, height } = event.nativeEvent.layout;
                  onFirstCardLayout({ x, y, height });
                }
              : undefined
          }
          onPress={onAdvanceItemOnboarding}
        >
          <View style={styles.left}>
            <Text style={styles.literal}>{character.literal}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.meaning}>
                {getCharacterMeaning(character, locale)}
              </Text>
              <Text style={styles.meta}>
                {t("list.rank", { rank: index + 1 })}
                {character.jlptLevel
                  ? ` · ${t("common.jlpt")} ${character.jlptLevel}`
                  : ""}
                {character.strokeCount != null
                  ? ` · ${t("common.strokes", { count: character.strokeCount })}`
                  : ""}
              </Text>
              {progress ? (
                <Text style={styles.meta}>
                  {t("list.recentScore", {
                    score: progress.lastScore,
                    attempts: progress.attempts,
                  })}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.actions}>
            {showFavoriteHint ? (
              <View pointerEvents="none" style={styles.favoriteHint}>
                <View style={styles.favoriteHintBubble}>
                  <Text style={styles.favoriteHintText}>
                    {t("list.favoriteHint")}
                  </Text>
                </View>
                <View style={styles.favoriteHintTail} />
              </View>
            ) : null}
            <FavoriteButton
              characterId={character.id}
              iconSize={18}
              style={styles.favoriteButton}
              hitSlop={8}
            />
          </View>
          {isDimmed ? (
            <View pointerEvents="none" style={styles.cardOverlay} />
          ) : null}
        </Pressable>
      </Link>

    </View>
  );
}

function createStyles({ colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bgCanvas,
    },
    screenContent: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },
    screenStack: {
      flex: 1,
      position: "relative",
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: spacing[2],
      paddingBottom: layout.screenPaddingBottom,
    },
    header: {
      marginBottom: spacing[6],
    },
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[2],
    },
    subtitle: textStyles.bodySm,
    searchRow: {
      ...surfaceStyles.card,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    searchRowWrap: {
      position: "relative",
      marginTop: spacing[4],
      borderRadius: 20,
      overflow: "hidden",
    },
    searchOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bgCanvas,
      opacity: 0.56,
    },
    searchInput: {
      ...textStyles.bodySm,
      flex: 1,
      alignItems: "center",
      color: colors.inkStrong,
      height: 28,
      lineHeight: 16,
      textAlignVertical: "center",
      includeFontPadding: false,
      paddingVertical: 0,
      paddingHorizontal: 4,
    },
    searchClearButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgMuted,
    },
    searchClearText: {
      color: colors.inkMuted,
      fontSize: 18,
      lineHeight: 20,
    },
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: 6,
    },
    emptyTitle: textStyles.titleSm,
    emptyBody: textStyles.bodySm,
    separator: {
      height: 12,
    },
    cardStack: {
      position: "relative",
    },
    card: {
      ...surfaceStyles.card,
      position: "relative",
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    cardOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bgCanvas,
      opacity: 0.56,
      borderRadius: 20,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flex: 1,
    },
    literal: {
      ...textStyles.glyphSm,
      width: 42,
      textAlign: "center",
    },
    cardContent: {
      flex: 1,
      gap: 3,
    },
    meaning: textStyles.titleSm,
    meta: {
      ...textStyles.meta,
      marginTop: 3,
    },
    actions: {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    favoriteButton: {
      width: 36,
      height: 36,
      borderRadius: 16,
    },
    favoriteHint: {
      position: "absolute",
      right: -4,
      bottom: 36,
      alignItems: "flex-end",
      zIndex: 20,
      elevation: 20,
      maxWidth: 280,
    },
    favoriteHintBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 16,
      paddingHorizontal: spacing[3],
      paddingVertical: 10,
      alignSelf: "flex-end",
    },
    favoriteHintTail: {
      marginRight: 12,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 12,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.accentWarm,
      marginTop: -2,
    },
    favoriteHintText: {
      ...textStyles.meta,
      lineHeight: 18,
      color: colors.inkOnDark,
      fontWeight: "800",
    },
    itemHint: {
      position: "absolute",
      top: "100%",
      left: 14,
      alignItems: "flex-start",
      zIndex: 50,
      elevation: 50,
      maxWidth: 280,
    },
    itemHintBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 16,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      alignSelf: "flex-start",
    },
    itemHintTail: {
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderBottomWidth: 12,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderBottomColor: colors.accentWarm,
      marginLeft: 18,
      marginBottom: -2,
    },
    itemHintText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
      fontWeight: "800",
    },
    footer: {
      paddingVertical: spacing[6],
      alignItems: "center",
    },
    footerText: textStyles.meta,
    footerSpacer: {
      height: spacing[6],
    },
    tapAnywhereOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "transparent",
      zIndex: 5,
    },
  });
}
