import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import {
  getCharacterExample,
  getCharacterMeaning,
} from "../../src/data/characters";
import { spacing, useTheme } from "../../src/design/theme";
import { useI18n } from "../../src/i18n/useI18n";
import { useKanjiCharacterQuery } from "../../src/queries/kanjiQueries";
import { useAppState } from "../../src/state/AppStateProvider";

export default function CharacterDetailScreen() {
  const router = useRouter();
  const { characterId, categoryKey } = useLocalSearchParams<{
    characterId: string;
    categoryKey?: string;
  }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const { data: character, isLoading } = useKanjiCharacterQuery(characterId);
  const { locale, t } = useI18n();
  const { onboardingStep, setOnboardingStep } = useAppState();
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ buttonStyles, colors, surfaceStyles, textStyles });
  const example = character ? getCharacterExample(character, locale) : null;
  const showOnboarding = Boolean(character) && onboardingStep === "detail";

  if (isLoading) {
    return (
      <Screen>
        <Text style={styles.infoLine}>{t("common.loading")}</Text>
      </Screen>
    );
  }

  if (!character) {
    return (
      <Screen>
        <Text style={styles.errorTitle}>{t("detail.missing")}</Text>
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

          {example ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>{t("detail.examples")}</Text>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleWord}>{character.exampleJa ?? character.literal}</Text>
                <Text style={styles.exampleMeta}>{example}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t("detail.examples")}</Text>
            <Text style={styles.infoLine}>{t("detail.examplesPending")}</Text>
          </View>
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
    infoCard: {
      ...surfaceStyles.card,
      padding: 18,
      marginBottom: 12,
      gap: 8,
    },
    sectionTitle: textStyles.titleSm,
    infoLine: textStyles.bodySm,
    exampleRow: {
      paddingTop: 4,
      gap: 2,
    },
    exampleWord: textStyles.titleSm,
    exampleMeta: textStyles.caption,
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
    errorTitle: textStyles.displaySm,
  });
}
