import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ErrorState } from "../../src/components/common/ErrorState";
import { Screen } from "../../src/components/common/Screen";
import { getCharacterMeaning } from "../../src/data/characters";
import { spacing, useTheme } from "../../src/design/theme";
import {
  getReviewedExampleFuriganaPartsForDisplay,
  normalizeReviewedFuriganaParts,
} from "../../src/domain/kanji/exampleFurigana";
import {
  getExampleWordBody,
  getVisibleExampleWords,
  normalizeExampleWords,
} from "../../src/domain/kanji/exampleWords";
import type { ExampleWord } from "../../src/domain/kanji/exampleWords";
import { getKoreanHanjaReadingLabel } from "../../src/domain/kanji/koreanHanjaReading";
import { getDevCharacterIdLabel } from "../../src/domain/kanji/devCharacterLabel";
import {
  getSpecialReadingBody,
  hasSpecialReadings,
  normalizeSpecialReadings,
} from "../../src/domain/kanji/specialReadings";
import type { SpecialReading } from "../../src/domain/kanji/specialReadings";
import { useI18n } from "../../src/i18n/useI18n";
import { useKanjiCharacterQuery } from "../../src/queries/kanjiQueries";
import { useAppState } from "../../src/state/AppStateProvider";

export default function CharacterDetailScreen() {
  const router = useRouter();
  const { characterId, categoryKey, reviewIds } = useLocalSearchParams<{
    characterId: string;
    categoryKey?: string;
    reviewIds?: string;
  }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const normalizedReviewIds = Array.isArray(reviewIds) ? reviewIds[0] : reviewIds;
  const {
    data: character,
    isLoading,
    isError,
    refetch,
  } = useKanjiCharacterQuery(characterId, "detail");
  const { locale, t } = useI18n();
  const { onboardingStep, setOnboardingStep } = useAppState();
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ buttonStyles, colors, surfaceStyles, textStyles });
  const exampleJa = character?.exampleJa;
  const reviewedExampleFuriganaParts = useMemo(
    () =>
      normalizeReviewedFuriganaParts(
        character?.metadata?.exampleJaFurigana,
        exampleJa,
      ),
    [character?.metadata?.exampleJaFurigana, exampleJa],
  );
  const displayFuriganaParts =
    exampleJa != null
      ? getReviewedExampleFuriganaPartsForDisplay({
          example: exampleJa,
          reviewedParts: reviewedExampleFuriganaParts,
        })
      : null;
  const exampleKo = character?.exampleKo;
  const specialReadings = useMemo(
    () => normalizeSpecialReadings(character?.metadata?.specialReadings),
    [character?.metadata?.specialReadings],
  );
  const exampleWords = useMemo(
    () =>
      getVisibleExampleWords({
        words: normalizeExampleWords(character?.metadata?.words),
        exampleJa,
      }),
    [character?.metadata?.words, exampleJa],
  );
  const devCharacterIdLabel = character
    ? getDevCharacterIdLabel({
        characterId: character.id,
        isDevelopment: __DEV__,
      })
    : null;
  const isReference = isReferenceExample(exampleJa);
  const hasExample =
    locale === "ja" ? Boolean(exampleJa) : Boolean(exampleJa || exampleKo);
  const hasSpecialReadingCard = hasSpecialReadings(specialReadings);
  const hasExampleWords = exampleWords.length > 0;
  const showOnboarding = Boolean(character) && onboardingStep === "detail";
  const koreanHanjaReadingLabel =
    character && locale === "ko" ? getKoreanHanjaReadingLabel(character) : null;

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingState}>
          <Text style={styles.loadingStateTitle}>{t("common.loading")}</Text>
        </View>
      </Screen>
    );
  }

  if (!character) {
    return (
      <Screen>
        {isError ? (
          <ErrorState
            title={t("detail.errorTitle")}
            body={t("detail.errorBody")}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : (
          <Text style={styles.errorTitle}>{t("detail.missing")}</Text>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.screenStack}>
        <View style={showOnboarding ? styles.dimmedSection : null}>
          <View style={styles.heroCard}>
            <Text style={styles.literal}>{character.literal}</Text>
            <Text style={styles.meaning}>{getCharacterMeaning(character, locale)}</Text>
            <Text style={styles.meta}>
              {character.jlptLevel ? `${t("common.jlpt")} ${character.jlptLevel} · ` : ""}
              {character.strokeCount != null
                ? t("common.strokes", { count: character.strokeCount })
                : "-"}
            </Text>
            {koreanHanjaReadingLabel ? (
              <Text style={styles.devCharacterId}>{koreanHanjaReadingLabel}</Text>
            ) : null}
            {devCharacterIdLabel ? (
              <Text style={styles.devCharacterId}>{devCharacterIdLabel}</Text>
            ) : null}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t("detail.reading")}</Text>
            <Text style={styles.infoLine}>
              {t("detail.onyomi", { value: character.onyomi.join(", ") || "-" })}
            </Text>
            <Text style={styles.infoLine}>
              {t("detail.kunyomi", { value: character.kunyomi.join(", ") || "-" })}
            </Text>
          </View>

          {hasExample ? (
            <View style={[styles.infoCard, styles.exampleCard]}>
              <Text style={styles.sectionTitle}>
                {t(isReference ? "detail.reference" : "detail.examples")}
              </Text>
              <View style={styles.exampleRow}>
                {exampleJa ? (
                  displayFuriganaParts ? (
                    <FuriganaExample parts={displayFuriganaParts} styles={styles} />
                  ) : (
                    <Text style={styles.exampleWord}>{exampleJa}</Text>
                  )
                ) : null}
                {locale === "ko" && exampleKo ? (
                  <Text style={styles.exampleMeta}>{exampleKo}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>{t("detail.examples")}</Text>
              <Text style={styles.infoLine}>{t("detail.examplesPending")}</Text>
            </View>
          )}

          {hasExampleWords ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>{t("detail.words")}</Text>
              <View style={styles.wordList}>
                {exampleWords.map((word) => (
                  <ExampleWordItem
                    key={`${word.word}-${word.reading}`}
                    locale={locale}
                    styles={styles}
                    word={word}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {hasSpecialReadingCard ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>{t("detail.specialReadings")}</Text>
              <Text style={styles.specialReadingDescription}>
                {t("detail.specialReadingsDescription")}
              </Text>
              <View style={styles.specialReadingList}>
                {specialReadings.map((specialReading) => (
                  <SpecialReadingItem
                    key={`${specialReading.word}-${specialReading.reading}`}
                    locale={locale}
                    specialReading={specialReading}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {showOnboarding ? (
          <View pointerEvents="none" style={styles.onboardingHint}>
            <View style={styles.onboardingBubble}>
              <Text style={styles.onboardingHintText}>
                {t("detail.onboardingAction")}
              </Text>
            </View>
            <View style={styles.onboardingTail} />
          </View>
        ) : null}

        <Pressable
          style={styles.actionButton}
          onPress={() => {
            if (showOnboarding) {
              setOnboardingStep("practice_guide");
            }

            router.replace({
              pathname: "/practice/[characterId]",
              params: {
                characterId: character.id,
                categoryKey: normalizedCategoryKey,
                reviewIds: normalizedReviewIds,
              },
            });
          }}
        >
          <Text style={styles.actionLabel}>{t("detail.startPractice")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function isReferenceExample(exampleJa?: string | null) {
  return Boolean(exampleJa?.includes("日常ではあまり使われず"));
}

function FuriganaExample({
  parts,
  styles,
}: {
  parts: NonNullable<ReturnType<typeof getReviewedExampleFuriganaPartsForDisplay>>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.furiganaLine}>
      {parts.map((part, index) => (
        <View key={`${part.text}-${index}`} style={styles.furiganaPart}>
          <Text style={styles.furiganaReading}>{part.reading ?? " "}</Text>
          <Text style={styles.exampleWord}>{part.text}</Text>
        </View>
      ))}
    </View>
  );
}

function ExampleWordItem({
  locale,
  styles,
  word,
}: {
  locale: "ko" | "ja";
  styles: ReturnType<typeof createStyles>;
  word: ExampleWord;
}) {
  const body = getExampleWordBody(word, locale);

  return (
    <View style={styles.exampleWordItem}>
      <Text style={styles.exampleWordText}>{word.word}</Text>
      <Text style={styles.exampleWordMeta}>
        {word.reading}
        {body ? ` ${body}` : ""}
      </Text>
    </View>
  );
}

function SpecialReadingItem({
  locale,
  specialReading,
  styles,
}: {
  locale: "ko" | "ja";
  specialReading: SpecialReading;
  styles: ReturnType<typeof createStyles>;
}) {
  const body = getSpecialReadingBody(specialReading, locale);

  return (
    <View style={styles.specialReadingItem}>
      <Text style={styles.specialReadingWord}>{specialReading.word}</Text>
      <Text style={styles.specialReadingMeta}>
        {specialReading.reading}
        {body ? ` ${body}` : ""}
      </Text>
    </View>
  );
}

function createStyles({ buttonStyles, colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    screenStack: {
      position: "relative",
    },
    dimmedSection: {
      opacity: 0.32,
    },
    heroCard: {
      ...surfaceStyles.heroDark,
      borderRadius: 30,
      padding: spacing[8],
      alignItems: "center",
      marginBottom: spacing[4],
    },
    literal: {
      ...textStyles.heroGlyph,
      marginBottom: spacing[2],
    },
    meaning: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.inkOnDark,
      marginBottom: 6,
    },
    meta: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.inkOnDarkMuted,
    },
    devCharacterId: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.inkOnDarkMuted,
      marginTop: spacing[1],
    },
    infoCard: {
      ...surfaceStyles.card,
      padding: 18,
      marginBottom: 12,
      gap: 8,
    },
    exampleCard: {
      gap: 4,
    },
    sectionTitle: textStyles.titleSm,
    infoLine: textStyles.bodySm,
    exampleRow: {
      gap: 2,
    },
    furiganaLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
    },
    furiganaPart: {
      alignItems: "center",
      justifyContent: "flex-end",
    },
    furiganaReading: {
      ...textStyles.caption,
      color: colors.inkMuted,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "700",
    },
    exampleWord: textStyles.titleSm,
    exampleMeta: textStyles.caption,
    wordList: {
      gap: 10,
    },
    exampleWordItem: {
      gap: 3,
    },
    exampleWordText: textStyles.titleSm,
    exampleWordMeta: {
      ...textStyles.caption,
      color: colors.inkMuted,
    },
    specialReadingList: {
      gap: 10,
    },
    specialReadingDescription: {
      ...textStyles.caption,
      color: colors.inkMuted,
    },
    specialReadingItem: {
      gap: 3,
    },
    specialReadingWord: textStyles.titleSm,
    specialReadingMeta: {
      ...textStyles.caption,
      color: colors.inkMuted,
    },
    actionButton: {
      ...buttonStyles.secondary,
      marginTop: 8,
      marginBottom: 20,
    },
    onboardingHint: {
      position: "absolute",
      right: 12,
      bottom: 84,
      alignItems: "flex-end",
      maxWidth: 260,
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
    actionLabel: {
      ...textStyles.buttonLabel,
      color: colors.accentWarmMuted,
      fontSize: 16,
    },
    loadingState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing[8],
    },
    loadingStateTitle: {
      ...textStyles.titleMd,
      textAlign: "center",
    },
    errorTitle: textStyles.displaySm,
  });
}
