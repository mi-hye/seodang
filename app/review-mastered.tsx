import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CharacterCardSkeleton } from "../src/components/common/CharacterCardSkeleton";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { buildReviewStats } from "../src/domain/review/reviewStats";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByIdsQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function ReviewMasteredScreen() {
  const { hydrated, progressByCharacter } = useAppState();
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const stats = buildReviewStats(progressByCharacter);
  const { data: masteredCharacters = [], isFetching, isLoading } =
    useKanjiCharactersByIdsQuery(stats.masteredCharacterIds);
  const isPreparingList =
    !hydrated ||
    (stats.masteredCharacterIds.length > 0 &&
      masteredCharacters.length === 0 &&
      (isLoading || isFetching));

  return (
    <Screen>
      <Text style={styles.title}>{t("reviewStats.masteredListTitle")}</Text>

      {isPreparingList ? <CharacterCardSkeleton /> : null}

      {hydrated && !isPreparingList && masteredCharacters.length === 0 ? (
        <View style={[styles.emptyCard, styles.shadow]}>
          <Text style={styles.emptyTitle}>
            {t("reviewStats.masteredListEmpty")}
          </Text>
        </View>
      ) : null}

      {!isPreparingList
        ? masteredCharacters.map((character) => (
            <Pressable
              key={character.id}
              style={[styles.characterCard, styles.shadow]}
              onPress={() =>
                router.push({
                  pathname: "/character/[characterId]",
                  params: { characterId: character.id },
                })
              }
            >
              <Text style={styles.literal}>{character.literal}</Text>
              <View style={styles.content}>
                <Text style={styles.meaning}>
                  {getCharacterMeaning(character, locale)}
                </Text>
                <Text style={styles.meta}>
                  {character.jlptLevel ? `JLPT ${character.jlptLevel}` : "-"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.accentWarmMuted}
              />
            </Pressable>
          ))
        : null}
    </Screen>
  );
}

function createStyles({ surfaceStyles, textStyles, shadows }: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[6],
    },
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
    },
    emptyTitle: textStyles.titleSm,
    characterCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    literal: {
      ...textStyles.glyphSm,
      width: 40,
      textAlign: "center",
    },
    content: {
      flex: 1,
      gap: spacing[1],
    },
    meaning: textStyles.titleSm,
    meta: textStyles.meta,
    shadow: shadows.card,
  });
}
