import { Link } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FavoriteButton } from "../src/components/common/FavoriteButton";
import { ErrorState } from "../src/components/common/ErrorState";
import { getCharacterMeaning } from "../src/data/characters";
import { KanjiCharacter } from "../src/data/characters";
import { layout, spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAllKanjiCharactersQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function SearchScreen() {
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });
  const { getProgress } = useAppState();
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());
  const { data: allCharacters = [], isLoading, isError, refetch } =
    useAllKanjiCharactersQuery();

  const filteredItems = useMemo(() => {
    if (!deferredSearch) {
      return [];
    }

    return allCharacters
      .filter((character) => {
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

        return haystack.includes(deferredSearch);
      })
      .slice(0, 80);
  }, [allCharacters, deferredSearch]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredItems}
        keyExtractor={(character) => character.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchRow}>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={t("search.placeholder")}
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
          isLoading && deferredSearch ? (
            <SearchResultsSkeleton />
          ) : isError ? (
            <ErrorState
              title={t("search.errorTitle")}
              body={t("search.errorBody")}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {deferredSearch
                  ? t("search.emptyTitle")
                  : t("search.idleTitle")}
              </Text>
              <Text style={styles.emptyBody}>
                {deferredSearch
                  ? t("search.emptyBody")
                  : t("search.idleBody")}
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <SearchResultCard
            character={item}
            index={index}
            locale={locale}
            getProgress={getProgress}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={<View style={styles.footerSpacer} />}
      />
    </View>
  );
}

function SearchResultsSkeleton() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;
  const styles = useMemo(() => createSkeletonStyles(colors), [colors]);

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

  return (
    <View style={styles.wrapper}>
      {[0, 1, 2, 3].map((index) => (
        <Animated.View key={index} style={[styles.card, skeletonStyle]}>
          <View style={styles.left}>
            <Animated.View style={[styles.literal, skeletonStyle]} />
            <View style={styles.content}>
              <Animated.View style={[styles.title, skeletonStyle]} />
              <Animated.View style={[styles.meta, skeletonStyle]} />
            </View>
          </View>
          <Animated.View style={[styles.star, skeletonStyle]} />
        </Animated.View>
      ))}
    </View>
  );
}

function SearchResultCard({
  character,
  index,
  locale,
  getProgress,
}: {
  character: KanjiCharacter;
  index: number;
  locale: "ko" | "ja";
  getProgress: ReturnType<typeof useAppState>["getProgress"];
}) {
  const { colors, surfaceStyles, textStyles } = useTheme();
  const { t } = useI18n();
  const styles = createStyles({ colors, surfaceStyles, textStyles });
  const progress = getProgress(character.id);

  return (
    <Link
      href={{
        pathname: "/character/[characterId]",
        params: { characterId: character.id },
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
        <FavoriteButton
          characterId={character.id}
          iconSize={18}
          style={styles.favoriteButton}
          hitSlop={8}
        />
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
    searchRow: {
      ...surfaceStyles.card,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    searchInput: {
      ...textStyles.bodySm,
      flex: 1,
      color: colors.inkStrong,
      height: 28,
      lineHeight: 20,
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
    favoriteButton: {
      width: 36,
      height: 36,
      borderRadius: 16,
    },
    footerSpacer: {
      height: spacing[6],
    },
  });
}

function createSkeletonStyles(colors: any) {
  return StyleSheet.create({
    wrapper: {
      gap: 12,
    },
    card: {
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
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
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.bgMutedStrong,
    },
    content: {
      flex: 1,
      gap: 8,
    },
    title: {
      width: "42%",
      height: 16,
      borderRadius: 999,
      backgroundColor: colors.bgMutedStrong,
    },
    meta: {
      width: "58%",
      height: 12,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
    },
    star: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.bgMutedStrong,
    },
  });
}
