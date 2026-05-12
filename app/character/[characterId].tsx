import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import { getCharacterById } from "../../src/data/characters";
import {
  buttonStyles,
  colors,
  spacing,
  surfaceStyles,
  textStyles,
} from "../../src/design/theme";

export default function CharacterDetailScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacterById(characterId);

  if (!character) {
    return (
      <Screen>
        <Text style={styles.errorTitle}>한자를 찾을 수 없습니다.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.heroCard}>
        <Text style={styles.literal}>{character.literal}</Text>
        <Text style={styles.meaning}>{character.meaningKo}</Text>
        <Text style={styles.meta}>
          JLPT {character.jlptLevel} · {character.strokeCount}획
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>읽기</Text>
        <Text style={styles.infoLine}>음독: {character.onyomi.join(", ")}</Text>
        <Text style={styles.infoLine}>
          훈독: {character.kunyomi.join(", ")}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>예문</Text>
        {character.examples.map((example) => (
          <View key={example.word} style={styles.exampleRow}>
            <Text style={styles.exampleWord}>{example.word}</Text>
            <Text style={styles.exampleMeta}>
              {example.reading} · {example.meaningKo}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>연습 준비</Text>
        <Text style={styles.infoLine}>
          획순 애니메이션과 쓰기 캔버스는 다음 단계에서 붙입니다.
        </Text>
        <Text style={styles.infoLine}>
          지금은 전체 학습 흐름과 기본 화면 구조를 먼저 확인합니다.
        </Text>
      </View>

      <Link href={`/practice/${character.id}`} asChild>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionLabel}>쓰기 연습 시작</Text>
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
