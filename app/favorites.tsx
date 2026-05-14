import { useEffect, useMemo, useRef } from "react";
import { Link } from "expo-router";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { FavoriteButton } from "../src/components/common/FavoriteButton";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useFavoriteKanjiCharactersQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";
import { KanjiCharacter } from "../src/data/characters";

export default function FavoritesScreen() {
  const { getFavoriteCharacterIds, hydrated, isFavorite, toggleFavorite } =
    useAppState();
  const characterIds = getFavoriteCharacterIds();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } =
    useFavoriteKanjiCharactersQuery(characterIds);
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({
    colors,
    surfaceStyles,
    textStyles,
  });
  const favoritesQueryKey = [
    "kanji-characters",
    "favorites",
    ...characterIds,
  ] as const;
  const unfavoriteMutation = useMutation({
    mutationFn: async (characterId: string) => characterId,
    onMutate: async (characterId) => {
      await queryClient.cancelQueries({
        queryKey: ["kanji-characters", "favorites"],
      });

      const previousItems =
        queryClient.getQueryData<KanjiCharacter[]>(favoritesQueryKey) ?? [];
      const nextIds = characterIds.filter((id) => id !== characterId);
      const nextQueryKey = [
        "kanji-characters",
        "favorites",
        ...nextIds,
      ] as const;
      const nextItems = previousItems.filter(
        (character) => character.id !== characterId,
      );

      queryClient.setQueryData<KanjiCharacter[]>(nextQueryKey, nextItems);
      toggleFavorite(characterId);

      return { previousItems, previousQueryKey: favoritesQueryKey };
    },
    onError: (_error, characterId, context) => {
      queryClient.setQueryData(
        context?.previousQueryKey ?? favoritesQueryKey,
        context?.previousItems ?? [],
      );
      if (!isFavorite(characterId)) {
        toggleFavorite(characterId);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["kanji-characters", "favorites"],
      });
    },
  });

  useEffect(() => {
    if (characterIds.length === 0) {
      queryClient.setQueryData(["kanji-characters", "favorites"], []);
    }
  }, [characterIds.length, queryClient]);

  return (
    <Screen>
      <Text style={styles.title}>{t("favorites.title")}</Text>

      {isLoading && characterIds.length > 0 ? <FavoritesSkeleton /> : null}

      {hydrated && !isLoading && items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("favorites.emptyTitle")}</Text>
        </View>
      ) : null}

      {!isLoading &&
        items.map((character) => (
          <Link
            key={character.id}
            href={{
              pathname: "/character/[characterId]",
              params: {
                characterId: character.id,
              },
            }}
            asChild
          >
            <Pressable style={styles.card}>
              <View style={styles.left}>
                <Text style={styles.literal}>{character.literal}</Text>
                <View>
                  <Text style={styles.meaning}>
                    {getCharacterMeaning(character, locale)}
                  </Text>
                  <Text style={styles.meta}>
                    {character.jlptLevel
                      ? `${t("common.jlpt")} ${character.jlptLevel} · `
                      : ""}
                    {character.strokeCount != null
                      ? t("common.strokes", { count: character.strokeCount })
                      : "-"}
                  </Text>
                </View>
              </View>
              <FavoriteButton
                characterId={character.id}
                favorited={isFavorite(character.id)}
                style={styles.favoriteButton}
                hitSlop={8}
                onPress={() => unfavoriteMutation.mutate(character.id)}
              />
            </Pressable>
          </Link>
        ))}
    </Screen>
  );
}

function FavoritesSkeleton() {
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
      {[0, 1, 2].map((index) => (
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

function createStyles({ colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[6],
    },
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      marginBottom: 12,
      gap: 6,
    },
    emptyTitle: textStyles.titleSm,
    emptyBody: textStyles.bodySm,
    card: {
      ...surfaceStyles.card,
      padding: 18,
      marginBottom: 12,
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
    meaning: textStyles.titleSm,
    meta: {
      ...textStyles.meta,
      marginTop: 3,
    },
    favoriteButton: {
      width: 36,
      height: 36,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
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
