import { Link, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { FavoriteButton } from "../src/components/common/FavoriteButton";
import { KanjiLoadingScreen } from "../src/components/common/KanjiLoadingScreen";
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

  if (isLoading) {
    return <KanjiLoadingScreen />;
  }

  if (isError) {
    return (
      <View style={[styles.screen, styles.content]}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("list.errorTitle")}</Text>
          <Text style={styles.emptyBody}>{t("list.errorBody")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
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
            <Text style={styles.subtitle}>{t("list.subtitle")}</Text>
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
    </View>
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
    content: {
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: layout.screenPaddingTop,
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
