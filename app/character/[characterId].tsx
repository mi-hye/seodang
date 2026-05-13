import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import {
  getCharacterExample,
  getCharacterMeaning,
} from "../../src/data/characters";
import { spacing, useTheme } from "../../src/design/theme";
import { useI18n } from "../../src/i18n/useI18n";
import { useKanjiCharacterQuery } from "../../src/queries/useKanjiCharacterQuery";

export default function CharacterDetailScreen() {
  const { characterId, categoryKey } = useLocalSearchParams<{
    characterId: string;
    categoryKey?: string;
  }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const { data: character, isLoading } = useKanjiCharacterQuery(characterId);
  const { locale, t } = useI18n();
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ buttonStyles, colors, surfaceStyles, textStyles });
  const example = character ? getCharacterExample(character, locale) : null;

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
        <Text style={styles.sectionTitle}>{t("detail.ready")}</Text>
        <Text style={styles.infoLine}>{t("detail.readyBody1")}</Text>
        <Text style={styles.infoLine}>{t("detail.readyBody2")}</Text>
      </View>

      <Link
        href={{
          pathname: "/practice/[characterId]",
          params: {
            characterId: character.id,
            categoryKey: normalizedCategoryKey,
          },
        }}
        asChild
      >
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionLabel}>{t("detail.startPractice")}</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

function createStyles({ buttonStyles, colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
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
    actionLabel: {
      ...textStyles.buttonLabel,
      color: colors.accentWarmMuted,
      fontSize: 16,
    },
    errorTitle: textStyles.displaySm,
  });
}
