import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import {
  getCharacterById,
  getCharacterMeaning,
  getExampleMeaning,
} from "../../src/data/characters";
import {
  buttonStyles,
  colors,
  spacing,
  surfaceStyles,
  textStyles,
} from "../../src/design/theme";
import { useI18n } from "../../src/i18n/useI18n";

export default function CharacterDetailScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacterById(characterId);
  const { locale, t } = useI18n();

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
          {t("common.jlpt")} {character.jlptLevel} · {t("common.strokes", { count: character.strokeCount })}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{t("detail.reading")}</Text>
        <Text style={styles.infoLine}>{t("detail.onyomi", { value: character.onyomi.join(", ") })}</Text>
        <Text style={styles.infoLine}>
          {t("detail.kunyomi", { value: character.kunyomi.join(", ") })}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{t("detail.examples")}</Text>
        {character.examples.map((example) => (
          <View key={example.word} style={styles.exampleRow}>
            <Text style={styles.exampleWord}>{example.word}</Text>
            <Text style={styles.exampleMeta}>
              {example.reading} · {getExampleMeaning(example, locale)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{t("detail.ready")}</Text>
        <Text style={styles.infoLine}>{t("detail.readyBody1")}</Text>
        <Text style={styles.infoLine}>{t("detail.readyBody2")}</Text>
      </View>

      <Link href={`/practice/${character.id}`} asChild>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionLabel}>{t("detail.startPractice")}</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    color: "#c9d4cb",
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
