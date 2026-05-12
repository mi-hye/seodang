import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import { getCharacterById } from "../../src/data/characters";

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
    backgroundColor: "#1d3b2a",
    borderRadius: 30,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
  },
  literal: {
    fontSize: 72,
    fontWeight: "800",
    color: "#f7f1e8",
    marginBottom: 8,
  },
  meaning: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f7f1e8",
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c9d4cb",
  },
  infoCard: {
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#173221",
  },
  infoLine: {
    fontSize: 14,
    lineHeight: 21,
    color: "#5d665e",
  },
  exampleRow: {
    paddingTop: 4,
    gap: 2,
  },
  exampleWord: {
    fontSize: 16,
    fontWeight: "700",
    color: "#173221",
  },
  exampleMeta: {
    fontSize: 13,
    color: "#6e746d",
  },
  actionButton: {
    backgroundColor: "#efe4d3",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  actionLabel: {
    color: "#6d583f",
    fontSize: 16,
    fontWeight: "800",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#173221",
  },
});
