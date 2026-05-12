import { useRouter, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import { getCharacterById } from "../../src/data/characters";

export default function PracticeScreen() {
  const router = useRouter();
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacterById(characterId);

  if (!character) {
    return (
      <Screen>
        <Text style={styles.errorTitle}>연습 대상을 불러오지 못했습니다.</Text>
      </Screen>
    );
  }

  const handleSubmit = () => {
    const generatedScore = Math.floor(Math.random() * 26) + 70;

    router.push({
      pathname: "/practice/result",
      params: {
        characterId: character.id,
        score: String(generatedScore),
        passed: String(generatedScore >= 80),
        attemptId: `${character.id}-${Date.now()}`,
        practicedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <Screen>
      <View style={styles.headerCard}>
        <Text style={styles.caption}>목표 한자</Text>
        <Text style={styles.literal}>{character.literal}</Text>
        <Text style={styles.meaning}>{character.meaningKo}</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.toolChip}>
          <Text style={styles.toolChipText}>
            현재 획 3 / {character.strokeCount}
          </Text>
        </View>
        <View style={styles.toolChip}>
          <Text style={styles.toolChipText}>획순 힌트</Text>
        </View>
      </View>

      <View style={styles.canvasCard}>
        <View style={styles.canvasGrid}>
          <Text style={styles.canvasGuide}>{character.literal}</Text>
        </View>
        <Text style={styles.canvasHint}>
          실제 쓰기 캔버스와 stroke 판정 로직은 다음 구현 단계에서 이 영역에
          들어갑니다.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>다시 쓰기</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryLabel}>제출</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: "#fffaf3",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  caption: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#8b5e34",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  literal: {
    fontSize: 64,
    fontWeight: "800",
    color: "#173221",
    marginBottom: 6,
  },
  meaning: {
    fontSize: 17,
    color: "#4e6153",
    fontWeight: "700",
  },
  toolbar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  toolChip: {
    backgroundColor: "#efe4d3",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toolChipText: {
    color: "#6d583f",
    fontSize: 12,
    fontWeight: "800",
  },
  canvasCard: {
    backgroundColor: "#fffaf3",
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
  },
  canvasGrid: {
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddcfbc",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fcf7ef",
    marginBottom: 14,
  },
  canvasGuide: {
    fontSize: 120,
    color: "#d9c8b1",
    fontWeight: "700",
  },
  canvasHint: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7168",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#efe4d3",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
  },
  secondaryLabel: {
    color: "#6d583f",
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1d3b2a",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#f7f1e8",
    fontSize: 15,
    fontWeight: "800",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#173221",
  },
});
