import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { sampleCharacters } from "../src/data/characters";
import {
  chipStyles,
  spacing,
  surfaceStyles,
  textStyles,
} from "../src/design/theme";
import { useAppState } from "../src/state/AppStateProvider";

export default function CharacterListScreen() {
  const { getProgress } = useAppState();

  return (
    <Screen>
      <Text style={styles.title}>기초 한자 세트</Text>
      <Text style={styles.subtitle}>
        MVP 단계에서는 샘플 데이터로 흐름을 먼저 검증합니다.
      </Text>

      <View style={styles.filters}>
        {["JLPT N5", "초등 1학년", "자주 쓰는 한자"].map((filter) => (
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
              <Text style={styles.meaning}>{character.meaningKo}</Text>
              <Text style={styles.reading}>
                음독 {character.onyomi.join(", ")} · 훈독 {character.kunyomi.join(", ")}
              </Text>
              <Text style={styles.meta}>
                {character.strokeCount}획 · JLPT {character.jlptLevel}
              </Text>
              {getProgress(character.id) ? (
                <Text style={styles.progressMeta}>
                  최근 점수 {getProgress(character.id)?.lastScore} · 시도 {getProgress(character.id)?.attempts}회
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
