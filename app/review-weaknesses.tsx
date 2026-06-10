import { StyleSheet, Text, View } from "react-native";

import { CharacterCardSkeleton } from "../src/components/common/CharacterCardSkeleton";
import { FocusedReviewActionCard } from "../src/components/common/FocusedReviewActionCard";
import { FocusedCharacterCard } from "../src/components/common/FocusedCharacterCard";
import { ProLockedCard } from "../src/components/common/ProLockedCard";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { canAccessProFeature } from "../src/domain/pro/proAccess";
import { buildReviewStats } from "../src/domain/review/reviewStats";
import { useCharacterListWindow } from "../src/hooks/useCharacterListWindow";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByIdsQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function ReviewWeaknessesScreen() {
  const { hydrated, isPro, progressByCharacter } = useAppState();
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const stats = buildReviewStats(progressByCharacter);
  const {
    handleListScroll,
    visibleCharacterIds: visibleWeakCharacterIds,
  } = useCharacterListWindow(stats.weakCharacterIds);
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
    <Screen onScroll={handleListScroll} scrollEventThrottle={16}>
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

      {hydrated &&
      !isPreparingList &&
      stats.weakCharacterIds.length > visibleWeakCharacterIds.length ? (
        <Text style={styles.listCountMeta}>
          {t("reviewStats.listCount", {
            visible: visibleWeakCharacterIds.length,
            total: stats.weakCharacterIds.length,
          })}
        </Text>
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
            <FocusedCharacterCard
              characterId={character.id}
              key={character.id}
              literal={character.literal}
              meaning={getCharacterMeaning(character, locale)}
              meta={character.jlptLevel ? `JLPT ${character.jlptLevel}` : "-"}
            />
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
    listCountMeta: {
      ...textStyles.meta,
      marginBottom: spacing[3],
      textAlign: "right",
    },
    emptyTitle: textStyles.titleSm,
    shadow: shadows.card,
  });
}
