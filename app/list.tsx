import { Link, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FavoriteButton } from "../src/components/common/FavoriteButton";
import { KanjiLoadingScreen } from "../src/components/common/KanjiLoadingScreen";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning, KanjiCharacter } from "../src/data/characters";
import { layout, spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByCategoryQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function CharacterListScreen() {
  const { categoryKey } = useLocalSearchParams<{ categoryKey?: string }>();
  const normalizedCategoryKey = Array.isArray(categoryKey)
    ? categoryKey[0]
    : categoryKey;
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });
  const { getProgress } = useAppState();
  const [searchText, setSearchText] = useState("");
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useKanjiCharactersByCategoryQuery(normalizedCategoryKey, locale);

  const pages = data?.pages ?? [];
  const firstPage = pages[0] ?? null;
  const selectedCategory = firstPage?.category;
  const items = pages.flatMap((page) => page?.characters ?? []);
  const headerTitle = selectedCategory?.label ?? t("list.title");
  const categoryTotal = firstPage?.total ?? null;
  const subtitle =
    categoryTotal != null
      ? `${t("list.totalCharacters", { count: categoryTotal })} ${t(
          "list.subtitle",
        )}`
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

  if (isLoading) {
    return <KanjiLoadingScreen />;
  }

  if (isError) {
    return (
      <Screen contentStyle={styles.content} scrollContainer={false}>
        <View>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t("list.errorTitle")}</Text>
            <Text style={styles.emptyBody}>{t("list.errorBody")}</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screenContent} scrollContainer={false}>
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
    </Screen>
  );
}

function CharacterCard({
  categoryKey,
  character,
  index,
  getProgress,
}: {
  categoryKey?: string;
  character: KanjiCharacter;
  index: number;
  getProgress: ReturnType<typeof useAppState>["getProgress"];
}) {
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });
  const progress = getProgress(character.id);

  return (
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
      <Pressable style={styles.card}>
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
          <FavoriteButton
            characterId={character.id}
            iconSize={18}
            style={styles.favoriteButton}
            hitSlop={8}
          />
        </View>
      </Pressable>
    </Link>
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
      marginTop: spacing[4],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
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
    card: {
      ...surfaceStyles.card,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
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
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    favoriteButton: {
      width: 36,
      height: 36,
      borderRadius: 16,
    },
    footer: {
      paddingVertical: spacing[6],
      alignItems: "center",
    },
    footerText: textStyles.meta,
    footerSpacer: {
      height: spacing[6],
    },
  });
}
