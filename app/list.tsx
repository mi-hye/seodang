import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning, sampleCharacters } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function CharacterListScreen() {
  const { getProgress } = useAppState();
  const { locale, t } = useI18n();
  const { chipStyles, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ chipStyles, surfaceStyles, textStyles });

  return (
    <Screen>
      <Text style={styles.title}>{t("list.title")}</Text>
      <Text style={styles.subtitle}>{t("list.subtitle")}</Text>

      <View style={styles.filters}>
        {[t("list.filterJlpt"), t("list.filterGrade"), t("list.filterCommon")].map((filter) => (
          <View key={filter} style={styles.filterChip}>
            <Text style={styles.filterText}>{filter}</Text>
          </View>
        ))}
      </View>

      {sampleCharacters.map((character) => (
        <Link key={character.id} href={`/character/${character.id}`} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.literal}>{character.literal}</Text>
            <View style={styles.content}>
              <Text style={styles.meaning}>{getCharacterMeaning(character, locale)}</Text>
              <Text style={styles.reading}>
                {t("list.onyomi")} {character.onyomi.join(", ")} · {t("list.kunyomi")} {character.kunyomi.join(", ")}
              </Text>
              <Text style={styles.meta}>
                {t("common.strokes", { count: character.strokeCount })} · {t("common.jlpt")} {character.jlptLevel}
              </Text>
              {getProgress(character.id) ? (
                <Text style={styles.progressMeta}>
                  {t("list.recentScore", {
                    score: getProgress(character.id)?.lastScore,
                    attempts: getProgress(character.id)?.attempts,
                  })}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

function createStyles({
  chipStyles,
  surfaceStyles,
  textStyles,
}: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[2],
    },
    subtitle: {
      ...textStyles.bodySm,
      marginBottom: 18,
    },
    filters: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
      marginBottom: spacing[6],
    },
    filterChip: chipStyles.base,
    filterText: {
      ...textStyles.meta,
      fontWeight: "700",
    },
    card: {
      ...surfaceStyles.card,
      padding: 18,
      marginBottom: 12,
      flexDirection: "row",
      gap: 16,
      alignItems: "center",
    },
    literal: {
      width: 52,
      textAlign: "center",
      ...textStyles.glyphSm,
      fontSize: 30,
    },
    content: {
      flex: 1,
      gap: 5,
    },
    meaning: {
      ...textStyles.titleSm,
    },
    reading: textStyles.caption,
    meta: textStyles.meta,
    progressMeta: textStyles.meta,
  });
}
