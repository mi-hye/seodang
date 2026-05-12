import { useEffect } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/Screen";
import { getCharacterById } from "../../src/data/characters";
import { useAppState } from "../../src/state/AppStateProvider";

export default function PracticeResultScreen() {
  const { characterId, score, passed, attemptId, practicedAt } = useLocalSearchParams<{
    characterId: string;
    score: string;
    passed: string;
    attemptId: string;
    practicedAt: string;
  }>();
  const character = getCharacterById(characterId);
  const didPass = passed === "true";
  const numericScore = Number(score ?? 0);
  const { recordAttempt } = useAppState();

  useEffect(() => {
    if (!characterId || !attemptId) return;

    recordAttempt({
      attemptId,
      characterId,
      score: numericScore,
      passed: didPass,
      practicedAt: practicedAt ?? new Date().toISOString(),
    });
  }, [attemptId, characterId, didPass, numericScore, practicedAt, recordAttempt]);

  return (
    <Screen>
      <View style={[styles.heroCard, didPass ? styles.passCard : styles.failCard]}>
        <Text style={styles.status}>{didPass ? "성공!" : "다시 연습"}</Text>
        <Text style={styles.score}>{score}점</Text>
        <Text style={styles.summary}>
          {character?.literal ?? "이 한자"}의 연습 결과를 기록할 자리입니다.
        </Text>
      </View>

      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>피드백</Text>
        <Text style={styles.feedbackLine}>- 획순 피드백과 시작점 비교는 다음 단계에서 연결합니다.</Text>
        <Text style={styles.feedbackLine}>- 현재는 라우팅과 학습 흐름 검증을 위한 임시 결과 화면입니다.</Text>
      </View>

      <Link href={characterId ? `/practice/${characterId}` : "/list"} asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>다시 연습</Text>
        </Pressable>
      </Link>

      <Link href="/list" asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryLabel}>다음 한자 보기</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 14,
  },
  passCard: {
    backgroundColor: "#1d3b2a",
  },
  failCard: {
    backgroundColor: "#8f3f2c",
  },
  status: {
    color: "#f7f1e8",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  score: {
    color: "#f7f1e8",
    fontSize: 52,
    fontWeight: "800",
    marginBottom: 8,
  },
  summary: {
    color: "#dbe4dc",
    fontSize: 14,
    lineHeight: 21,
  },
  feedbackCard: {
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    gap: 8,
  },
  feedbackTitle: {
    color: "#173221",
    fontSize: 18,
    fontWeight: "800",
  },
  feedbackLine: {
    color: "#626a61",
    fontSize: 14,
    lineHeight: 21,
  },
  secondaryButton: {
    backgroundColor: "#efe4d3",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryLabel: {
    color: "#6d583f",
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: "#c66d3d",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryLabel: {
    color: "#fffaf3",
    fontSize: 15,
    fontWeight: "800",
  },
});
