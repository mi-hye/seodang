import { StyleSheet, Text, View } from "react-native";

import { CharacterCardSkeleton } from "../src/components/common/CharacterCardSkeleton";
import { EmptyState } from "../src/components/common/EmptyState";
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

export default function ReviewProgressingScreen() {
  const { hydrated, isPro, progressByCharacter } = useAppState();
  const { locale, t } = useI18n();
  const { textStyles } = useTheme();
  const styles = createStyles({ textStyles });
  const stats = buildReviewStats(progressByCharacter);
  const {
    handleListScroll,
    visibleCharacterIds: visibleProgressingCharacterIds,
  } = useCharacterListWindow(stats.inProgressCharacterIds);
  const { data: progressingCharacters = [], isFetching, isLoading } =
    useKanjiCharactersByIdsQuery(visibleProgressingCharacterIds);
  const isPreparingList =
    !hydrated ||
    (visibleProgressingCharacterIds.length > 0 &&
      progressingCharacters.length === 0 &&
      (isLoading || isFetching));
  const canViewFocusedReview = canAccessProFeature({
    feature: "focused_review",
    isPro,
  });

  if (!canViewFocusedReview) {
    return (
      <Screen>
        <Text style={styles.title}>{t("reviewStats.progressingListTitle")}</Text>
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
      <Text style={styles.title}>{t("reviewStats.progressingListTitle")}</Text>

      {isPreparingList ? <CharacterCardSkeleton /> : null}

      {hydrated && !isPreparingList ? (
        <FocusedReviewActionCard
          body={t("reviewStats.progressingFocusBody", {
            count: stats.inProgressCharacters,
          })}
          characterIds={stats.inProgressCharacterIds}
          icon="play-outline"
          isPro={isPro}
          title={t("reviewStats.progressingFocusTitle")}
        />
      ) : null}

      {hydrated &&
      !isPreparingList &&
      stats.inProgressCharacterIds.length >
        visibleProgressingCharacterIds.length ? (
        <Text style={styles.listCountMeta}>
          {t("reviewStats.listCount", {
            visible: visibleProgressingCharacterIds.length,
            total: stats.inProgressCharacterIds.length,
          })}
        </Text>
      ) : null}

      {hydrated && !isPreparingList && progressingCharacters.length === 0 ? (
        <EmptyState title={t("reviewStats.progressingListEmpty")} />
      ) : null}

      {!isPreparingList
        ? progressingCharacters.map((character) => {
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
                subMeta={t("reviewStats.progressingReason", {
                  average: progress?.averageScore ?? 0,
                })}
              />
            );
          })
        : null}
    </Screen>
  );
}

function createStyles({ textStyles }: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[6],
    },
    listCountMeta: {
      ...textStyles.meta,
      marginBottom: spacing[3],
      textAlign: "right",
    },
  });
}
