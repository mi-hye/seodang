import { useEffect, useMemo, useRef } from "react";
import { Link, useRouter } from "expo-router";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "../src/components/common/EmptyState";
import { FavoriteButton } from "../src/components/common/FavoriteButton";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning, KanjiCharacter } from "../src/data/characters";
import { isForcedEmptyState } from "../src/data/debugFetchFailure";
import { spacing, useTheme } from "../src/design/theme";
import {
  buildReviewQueue,
  findNextScheduledReviewAt,
  isDismissedForDate,
} from "../src/domain/review/buildReviewQueue";
import type { ReviewReason } from "../src/domain/review/buildReviewQueue";
import { formatReviewDateLabel } from "../src/domain/review/reviewDateLabel";
import { encodeReviewIds } from "../src/domain/review/reviewSession";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByIdsQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function ReviewScreen() {
  const router = useRouter();
  const {
    dismissedReviewCharacterIds,
    hydrated,
    isFavorite,
    progressByCharacter,
  } = useAppState();
  const reviewQueue = useMemo(
    () =>
      buildReviewQueue(progressByCharacter, {
        dismissedCharacterIds: dismissedReviewCharacterIds,
      }),
    [dismissedReviewCharacterIds, progressByCharacter],
  );
  const characterIds = reviewQueue.map((item) => item.characterId);
  const reviewByCharacterId = useMemo(
    () => new Map(reviewQueue.map((item) => [item.characterId, item])),
    [reviewQueue],
  );
  const { data: fetchedItems = [], isLoading } =
    useKanjiCharactersByIdsQuery(characterIds);
  const orderedItems = useMemo(
    () =>
      characterIds
        .map((characterId) =>
          fetchedItems.find((character) => character.id === characterId),
        )
        .filter((character): character is KanjiCharacter => Boolean(character)),
    [characterIds, fetchedItems],
  );
  const items = isForcedEmptyState("review") ? [] : orderedItems;
  const firstReviewCharacterId = items[0]?.id;
  const reviewSessionIds = encodeReviewIds(
    items.map((character) => character.id),
  );
  const hasAnyProgress = Object.keys(progressByCharacter).length > 0;
  const hasDismissedToday = Object.values(dismissedReviewCharacterIds).some(
    (dismissedReviewCharacter) =>
      isDismissedForDate(dismissedReviewCharacter, new Date()),
  );
  const completedToday = hasAnyProgress && hasDismissedToday && items.length === 0;
  const nextScheduledReviewAt = useMemo(
    () => findNextScheduledReviewAt(progressByCharacter),
    [progressByCharacter],
  );
  const { locale, t } = useI18n();
  const reviewEmptyBody = nextScheduledReviewAt
    ? t("review.nextScheduled", {
        date: formatReviewDateLabel({
          locale,
          reviewAt: nextScheduledReviewAt,
        }),
      })
    : completedToday
      ? undefined
      : t("review.emptyBody");
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({
    buttonStyles,
    colors,
    surfaceStyles,
    textStyles,
  });

  return (
    <Screen>
      <Text style={styles.title}>{t("review.title")}</Text>
      <Text style={styles.subtitle}>{t("review.subtitle")}</Text>

      {isLoading && characterIds.length > 0 ? <ReviewSkeleton /> : null}

      {!isLoading && firstReviewCharacterId ? (
        <Pressable
          style={styles.startButton}
          onPress={() =>
            router.push({
              pathname: "/practice/[characterId]",
              params: {
                characterId: firstReviewCharacterId,
                reviewIds: reviewSessionIds,
              },
            })
          }
        >
          <Text style={styles.startButtonLabel}>{t("review.startPractice")}</Text>
        </Pressable>
      ) : null}

      {hydrated && !isLoading && items.length === 0 ? (
        <EmptyState
          title={
            completedToday ? t("review.completedTitle") : t("review.emptyTitle")
          }
          body={reviewEmptyBody}
          actionLabel={!completedToday ? t("review.emptyAction") : undefined}
          onActionPress={
            !completedToday ? () => router.push("/categories") : undefined
          }
        />
      ) : null}

      {!isLoading &&
        items.map((character) => {
          const progress = progressByCharacter[character.id];
          const reviewItem = reviewByCharacterId.get(character.id);
          const reason = reviewItem?.reason ?? "due_again";

          return (
            <Link
              key={character.id}
              href={{
                pathname: "/character/[characterId]",
                params: {
                  characterId: character.id,
                  reviewIds: reviewSessionIds,
                },
              }}
              asChild
            >
              <Pressable style={styles.card}>
                <View style={styles.left}>
                  <Text style={styles.literal}>{character.literal}</Text>
                  <View style={styles.content}>
                    <Text style={styles.meaning}>
                      {getCharacterMeaning(character, locale)}
                    </Text>
                    <View
                      style={[
                        styles.reasonBadge,
                        getReasonBadgeStyle(styles, reason),
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasonBadgeText,
                          getReasonBadgeTextStyle(styles, reason),
                        ]}
                      >
                        {t(`review.reason.${reason}`)}
                      </Text>
                    </View>
                    <Text style={styles.score}>
                      {t("review.scoreSummary", {
                        score: progress?.lastScore ?? "-",
                        attempts: progress?.attempts ?? 0,
                      })}
                    </Text>
                  </View>
                </View>
                <FavoriteButton
                  characterId={character.id}
                  favorited={isFavorite(character.id)}
                  style={styles.favoriteButton}
                  hitSlop={8}
                />
              </Pressable>
            </Link>
          );
        })}
    </Screen>
  );
}

function ReviewSkeleton() {
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

  return (
    <View style={styles.wrapper}>
      {[0, 1, 2].map((index) => (
        <Animated.View key={index} style={[styles.card, { opacity }]}>
          <View style={styles.left}>
            <View style={styles.literal} />
            <View style={styles.content}>
              <View style={styles.title} />
              <View style={styles.meta} />
              <View style={styles.score} />
            </View>
          </View>
          <View style={styles.star} />
        </Animated.View>
      ))}
    </View>
  );
}

function getReasonBadgeStyle(
  styles: ReturnType<typeof createStyles>,
  reason: ReviewReason,
) {
  switch (reason) {
    case "failed_recently":
      return styles.reasonFailedBadge;
    case "low_score":
      return styles.reasonLowScoreBadge;
    case "due_again":
      return styles.reasonDueBadge;
  }
}

function getReasonBadgeTextStyle(
  styles: ReturnType<typeof createStyles>,
  reason: ReviewReason,
) {
  switch (reason) {
    case "failed_recently":
      return styles.reasonFailedText;
    case "low_score":
      return styles.reasonLowScoreText;
    case "due_again":
      return styles.reasonDueText;
  }
}

function createStyles({ buttonStyles, colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[2],
    },
    subtitle: {
      ...textStyles.bodySm,
      marginBottom: spacing[6],
    },
    startButton: {
      ...buttonStyles.warm,
      marginBottom: spacing[4],
    },
    startButtonLabel: {
      ...textStyles.buttonLabel,
      color: colors.inkOnDark,
    },
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
    content: {
      flex: 1,
    },
    literal: {
      ...textStyles.glyphSm,
      width: 42,
      textAlign: "center",
    },
    meaning: textStyles.titleSm,
    reasonBadge: {
      alignSelf: "flex-start",
      marginTop: 5,
      borderRadius: 999,
      paddingHorizontal: spacing[2],
      paddingVertical: 3,
      backgroundColor: colors.bgMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    reasonBadgeText: {
      ...textStyles.meta,
      fontSize: 11,
      lineHeight: 14,
    },
    reasonFailedBadge: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
    },
    reasonFailedText: {
      color: colors.inkOnDark,
    },
    reasonLowScoreBadge: {
      backgroundColor: colors.bgMutedStrong,
      borderColor: colors.accentWarmMuted,
    },
    reasonLowScoreText: {
      color: colors.accentWarmMuted,
    },
    reasonDueBadge: {
      backgroundColor: colors.bgMuted,
      borderColor: colors.borderSoft,
    },
    reasonDueText: {
      color: colors.inkFaint,
    },
    score: {
      ...textStyles.meta,
      marginTop: 2,
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
      width: "44%",
      height: 16,
      borderRadius: 999,
      backgroundColor: colors.bgMutedStrong,
    },
    meta: {
      width: "64%",
      height: 12,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
    },
    score: {
      width: "52%",
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
