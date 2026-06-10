import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CharacterCardSkeleton } from "../src/components/common/CharacterCardSkeleton";
import { FocusedReviewActionCard } from "../src/components/common/FocusedReviewActionCard";
import { ProLockedCard } from "../src/components/common/ProLockedCard";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { getDefaultCharacterListWindow } from "../src/domain/characters/listWindow";
import { canAccessProFeature } from "../src/domain/pro/proAccess";
import { buildReviewStats } from "../src/domain/review/reviewStats";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByIdsQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function ReviewWeaknessesScreen() {
  const { hydrated, isPro, progressByCharacter } = useAppState();
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const stats = buildReviewStats(progressByCharacter);
  const visibleWeakCharacterIds = getDefaultCharacterListWindow(
    stats.weakCharacterIds,
  );
  const { data: weakCharacters = [], isFetching, isLoading } =
    useKanjiCharactersByIdsQuery(visibleWeakCharacterIds);
  const isPreparingList =
    !hydrated ||
    (visibleWeakCharacterIds.length > 0 &&
      weakCharacters.length === 0 &&
      (isLoading || isFetching));
  const canViewFocusedReview = canAccessProFeature({
    feature: "focused_review",
    isPro,
  });

  if (!canViewFocusedReview) {
    return (
      <Screen>
        <Text style={styles.title}>{t("reviewStats.weakListTitle")}</Text>
        <ProLockedCard
          body={t("reviewStats.focusedReviewLockedBody")}
          title={t("reviewStats.focusedReviewLockedTitle")}
          viewProLabel={t("reviewStats.viewPro")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{t("reviewStats.weakListTitle")}</Text>

      {isPreparingList ? <CharacterCardSkeleton /> : null}

      {hydrated && !isPreparingList ? (
        <FocusedReviewActionCard
          body={t("reviewStats.weakFocusBody", {
            count: stats.weakCharacters,
          })}
          characterIds={stats.weakCharacterIds}
          icon="flash-outline"
          isPro={isPro}
          title={t("reviewStats.weakFocusTitle")}
        />
      ) : null}

      {hydrated && !isPreparingList && weakCharacters.length === 0 ? (
        <View style={[styles.emptyCard, styles.shadow]}>
          <Text style={styles.emptyTitle}>
            {t("reviewStats.weakListEmpty")}
          </Text>
        </View>
      ) : null}

      {!isPreparingList
        ? weakCharacters.map((character) => (
            <Pressable
              key={character.id}
              style={[styles.weakCard, styles.shadow]}
              onPress={() =>
                router.push({
                  pathname: "/character/[characterId]",
                  params: { characterId: character.id },
                })
              }
            >
              <Text style={styles.weakLiteral}>{character.literal}</Text>
              <View style={styles.weakContent}>
                <Text style={styles.weakMeaning}>
                  {getCharacterMeaning(character, locale)}
                </Text>
                <Text style={styles.weakMeta}>
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
    weakCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    weakLiteral: {
      ...textStyles.glyphSm,
      width: 40,
      textAlign: "center",
    },
    weakContent: {
      flex: 1,
      gap: spacing[1],
    },
    weakMeaning: textStyles.titleSm,
    weakMeta: textStyles.meta,
    shadow: shadows.card,
  });
}
