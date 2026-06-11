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

export default function ReviewMasteredScreen() {
  const { hydrated, isPro, progressByCharacter } = useAppState();
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const stats = buildReviewStats(progressByCharacter);
  const {
    handleListScroll,
    visibleCharacterIds: visibleMasteredCharacterIds,
  } = useCharacterListWindow(stats.masteredCharacterIds);
  const { data: masteredCharacters = [], isFetching, isLoading } =
    useKanjiCharactersByIdsQuery(visibleMasteredCharacterIds);
  const isPreparingList =
    !hydrated ||
    (visibleMasteredCharacterIds.length > 0 &&
      masteredCharacters.length === 0 &&
      (isLoading || isFetching));
  const canViewFocusedReview = canAccessProFeature({
    feature: "focused_review",
    isPro,
  });

  if (!canViewFocusedReview) {
    return (
      <Screen>
        <Text style={styles.title}>{t("reviewStats.masteredListTitle")}</Text>
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
      <Text style={styles.title}>{t("reviewStats.masteredListTitle")}</Text>

      {isPreparingList ? <CharacterCardSkeleton /> : null}

      {hydrated && !isPreparingList ? (
        <FocusedReviewActionCard
          body={t("reviewStats.masteredFocusBody", {
            count: stats.masteredCharacters,
          })}
          characterIds={stats.masteredCharacterIds}
          icon="shield-checkmark-outline"
          isPro={isPro}
          title={t("reviewStats.masteredFocusTitle")}
        />
      ) : null}

      {hydrated &&
      !isPreparingList &&
      stats.masteredCharacterIds.length > visibleMasteredCharacterIds.length ? (
        <Text style={styles.listCountMeta}>
          {t("reviewStats.listCount", {
            visible: visibleMasteredCharacterIds.length,
            total: stats.masteredCharacterIds.length,
          })}
        </Text>
      ) : null}

      {hydrated && !isPreparingList && masteredCharacters.length === 0 ? (
        <View style={[styles.emptyCard, styles.shadow]}>
          <Text style={styles.emptyTitle}>
            {t("reviewStats.masteredListEmpty")}
          </Text>
        </View>
      ) : null}

      {!isPreparingList
        ? masteredCharacters.map((character) => {
            const progress = progressByCharacter[character.id];

            return (
              <FocusedCharacterCard
                characterId={character.id}
                key={character.id}
                literal={character.literal}
                meaning={getCharacterMeaning(character, locale)}
                meta={t("review.scoreSummary", {
                  attempts: progress?.attempts ?? 0,
                  score: progress?.lastScore ?? 0,
                })}
                subMeta={t("reviewStats.masteredReason", {
                  average: progress?.averageScore ?? 0,
                  successes: progress?.successes ?? 0,
                })}
              />
            );
          })
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
