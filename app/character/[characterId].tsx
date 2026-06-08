import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import { getCharacterMeaning } from "../../src/data/characters";
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
  const exampleKo = character?.exampleKo;
  const isReference = isReferenceExample(exampleJa);
  const hasExample =
    locale === "ja" ? Boolean(exampleJa) : Boolean(exampleJa || exampleKo);
  const showOnboarding = Boolean(character) && onboardingStep === "detail";

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
          <View style={styles.errorState}>
            <Text style={styles.errorStateTitle}>{t("detail.errorTitle")}</Text>
            <Pressable
              style={styles.errorRetryButton}
              onPress={() => {
                void refetch();
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
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>
                {t(isReference ? "detail.reference" : "detail.examples")}
              </Text>
              <View style={styles.exampleRow}>
                {exampleJa ? (
                  <Text style={styles.exampleWord}>{exampleJa}</Text>
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

function isReferenceExample(exampleJa?: string | null) {
  return Boolean(exampleJa?.includes("日常ではあまり使われず"));
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
    errorState: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing[3],
      paddingVertical: spacing[8],
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
    errorTitle: textStyles.displaySm,
  });
}
