import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FavoriteButton } from "../../src/components/common/FavoriteButton";
import { Screen } from "../../src/components/common/Screen";
import { spacing, useTheme } from "../../src/design/theme";
import { buildReviewSession } from "../../src/domain/review/reviewSession";
import { useI18n } from "../../src/i18n/useI18n";
import { useKanjiCharactersByCategoryQuery } from "../../src/queries/kanjiQueries";
import { useAppState } from "../../src/state/AppStateProvider";

export default function PracticeResultScreen() {
  const router = useRouter();
  const {
    characterId,
    categoryKey,
    reviewIds,
    literal,
    score,
    passed,
    attemptId,
    practicedAt,
    drawnStrokes,
    expectedStrokes,
    summary,
    feedback,
  } = useLocalSearchParams<{
    characterId: string;
    categoryKey?: string;
    reviewIds?: string;
    literal?: string;
    score: string;
    passed: string;
    attemptId: string;
    practicedAt: string;
    drawnStrokes: string;
    expectedStrokes: string;
    summary: string;
    feedback: string;
  }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const normalizedReviewIds = Array.isArray(reviewIds) ? reviewIds[0] : reviewIds;
  const reviewSession = buildReviewSession({
    currentCharacterId: characterId,
    encodedReviewIds: normalizedReviewIds,
  });
  const normalizedLiteral = Array.isArray(literal) ? literal[0] : literal;
  const didPass = passed === "true";
  const numericScore = Number(score ?? 0);
  const {
    dismissReviewCharacters,
    recordAttempt,
    onboardingStep,
    setOnboardingStep,
  } = useAppState();
  const { locale, t } = useI18n();
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ buttonStyles, colors, surfaceStyles, textStyles });
  const feedbackLines = feedback ? feedback.split("\n").filter(Boolean) : [];
  const {
    data,
    isError: isCategoryLoadError,
    refetch: refetchCategoryCharacters,
  } = useKanjiCharactersByCategoryQuery(normalizedCategoryKey, locale, "result");
  const characters = data?.pages.flatMap((page) => page?.characters ?? []) ?? [];
  const currentIndex = characters.findIndex((item) => item.id === characterId);
  const nextCharacter = currentIndex >= 0 ? characters[currentIndex + 1] : undefined;
  const showOnboarding = onboardingStep === "result";
  useEffect(() => {
    if (!characterId || !attemptId) return;

    recordAttempt({
      attemptId,
      characterId,
      categoryKey: normalizedCategoryKey,
      score: numericScore,
      passed: didPass,
      practicedAt: practicedAt ?? new Date().toISOString(),
    });
  }, [attemptId, characterId, didPass, numericScore, practicedAt, recordAttempt]);

  return (
    <Screen>
      <View style={styles.screenStack}>
        <View
          pointerEvents={showOnboarding ? "none" : "auto"}
          style={showOnboarding ? styles.dimmedSection : null}
        >
          <View style={[styles.heroCard, didPass ? styles.passCard : styles.failCard]}>
            <Text style={styles.status}>{didPass ? t("result.success") : t("result.retry")}</Text>
            <Text style={styles.score}>{t("result.score", { score })}</Text>
            {reviewSession.isReviewSession && reviewSession.position > 0 ? (
              <Text style={styles.reviewProgress}>
                {t("result.reviewProgress", {
                  current: reviewSession.position,
                  total: reviewSession.total,
                })}
              </Text>
            ) : null}
            <Text style={styles.summary}>
              {summary || t("result.fallbackSummary", { literal: normalizedLiteral ?? "-" })}
            </Text>
          </View>

          <View style={styles.feedbackCard}>
            {characterId ? (
              <FavoriteButton characterId={characterId} showLabel style={styles.favoriteButton} />
            ) : null}
            <Text style={styles.feedbackTitle}>{t("result.feedback")}</Text>
            <Text style={styles.feedbackLine}>
              - {t("result.strokeInput", {
                drawn: drawnStrokes ?? "-",
                expected: expectedStrokes ?? "-",
              })}
            </Text>
            <Text style={styles.feedbackLine}>- {t("result.rubric")}</Text>
            {feedbackLines.map((line) => (
              <Text key={line} style={styles.feedbackLine}>
                - {line}
              </Text>
            ))}
          </View>

          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              characterId
                ? router.replace({
                    pathname: "/practice/[characterId]",
                    params: {
                      characterId,
                      categoryKey: normalizedCategoryKey,
                      reviewIds: normalizedReviewIds,
                    },
                  })
                : router.replace("/list")
            }
          >
            <Text style={styles.secondaryLabel}>{t("result.practiceAgain")}</Text>
          </Pressable>
        </View>

        <View style={styles.nextActionWrap}>
          {showOnboarding && !isCategoryLoadError ? (
            <View pointerEvents="none" style={styles.onboardingHint}>
              <View style={styles.onboardingBubble}>
                <Text style={styles.onboardingHintText}>
                  {t("result.onboardingAction")}
                </Text>
              </View>
              <View style={styles.onboardingTail} />
            </View>
          ) : null}

          {isCategoryLoadError ? (
            <View style={styles.errorState}>
              <Text style={styles.errorStateTitle}>{t("result.errorTitle")}</Text>
              <Pressable
                style={styles.errorRetryButton}
                onPress={() => {
                  void refetchCategoryCharacters();
                }}
                hitSlop={8}
              >
                <MaterialIcons
                  name="refresh"
                  size={22}
                  color={colors.accentWarmMuted}
                />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                if (showOnboarding) {
                  setOnboardingStep("done");
                }
                if (reviewSession.isReviewSession) {
                  if (reviewSession.nextCharacterId) {
                    router.replace({
                      pathname: "/practice/[characterId]",
                      params: {
                        characterId: reviewSession.nextCharacterId,
                        reviewIds: normalizedReviewIds,
                      },
                    });
                    return;
                  }

                  dismissReviewCharacters(reviewSession.characterIds);
                  router.dismissTo("/review");
                  return;
                }
                if (nextCharacter) {
                  router.replace({
                    pathname: "/character/[characterId]",
                    params: {
                      characterId: nextCharacter.id,
                      categoryKey: normalizedCategoryKey,
                    },
                  });
                  return;
                }

                router.dismissTo({
                  pathname: "/list",
                  params: {
                    categoryKey: normalizedCategoryKey,
                  },
                });
              }}
            >
              <Text style={styles.primaryLabel}>
                {reviewSession.isReviewSession
                  ? reviewSession.nextCharacterId
                    ? t("result.nextReview")
                    : t("result.finishReview")
                  : t("result.nextCharacter")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Screen>
  );
}

function createStyles({
  buttonStyles,
  colors,
  surfaceStyles,
  textStyles,
}: any) {
  return StyleSheet.create({
    screenStack: {
      position: "relative",
    },
    dimmedSection: {
      opacity: 0.32,
    },
    heroCard: {
      borderRadius: 28,
      padding: spacing[7],
      marginBottom: 14,
    },
    passCard: {
      backgroundColor: colors.success,
    },
    failCard: {
      backgroundColor: colors.danger,
    },
    status: {
      color: colors.inkOnDark,
      fontSize: 24,
      fontWeight: "800",
      marginBottom: 8,
    },
    score: {
      color: colors.inkOnDark,
      fontSize: 52,
      fontWeight: "800",
      marginBottom: 8,
    },
    summary: {
      color: colors.inkOnDarkMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    reviewProgress: {
      color: colors.inkOnDarkMuted,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 8,
    },
    feedbackCard: {
      ...surfaceStyles.card,
      padding: 18,
      marginBottom: 16,
      gap: 8,
    },
    favoriteButton: {
      alignSelf: "flex-start",
      marginBottom: 4,
    },
    feedbackTitle: textStyles.titleMd,
    feedbackLine: textStyles.bodySm,
    secondaryButton: {
      ...buttonStyles.secondary,
      marginBottom: 10,
    },
    secondaryLabel: {
      ...textStyles.buttonLabel,
      color: colors.accentWarmMuted,
    },
    primaryButton: {
      ...buttonStyles.warm,
      marginBottom: 20,
    },
    nextActionWrap: {
      position: "relative",
    },
    errorState: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing[3],
      paddingVertical: spacing[4],
      marginBottom: 20,
    },
    errorStateTitle: {
      ...textStyles.titleMd,
      textAlign: "center",
    },
    errorRetryButton: {
      width: 44,
      height: 44,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    onboardingHint: {
      position: "absolute",
      right: 0,
      bottom: 84,
      alignItems: "flex-end",
      zIndex: 20,
      maxWidth: 280,
    },
    onboardingBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 16,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      alignSelf: "flex-end",
    },
    onboardingTail: {
      marginRight: 18,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 12,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.accentWarm,
      marginTop: -2,
    },
    onboardingHintText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
      fontWeight: "800",
    },
    primaryLabel: {
      ...textStyles.buttonLabel,
      color: colors.inkOnDark,
    },
  });
}
