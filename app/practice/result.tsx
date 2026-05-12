import { useEffect } from "react";
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
import { useI18n } from "../../src/i18n/useI18n";
import { useAppState } from "../../src/state/AppStateProvider";

export default function PracticeResultScreen() {
  const { characterId, score, passed, attemptId, practicedAt, drawnStrokes, expectedStrokes, summary, feedback } = useLocalSearchParams<{
    characterId: string;
    score: string;
    passed: string;
    attemptId: string;
    practicedAt: string;
    drawnStrokes: string;
    expectedStrokes: string;
    summary: string;
    feedback: string;
  }>();
  const character = getCharacterById(characterId);
  const didPass = passed === "true";
  const numericScore = Number(score ?? 0);
  const { recordAttempt } = useAppState();
  const { t } = useI18n();
  const feedbackLines = feedback ? feedback.split("\n").filter(Boolean) : [];

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
        <Text style={styles.status}>{didPass ? t("result.success") : t("result.retry")}</Text>
        <Text style={styles.score}>{t("result.score", { score })}</Text>
        <Text style={styles.summary}>
          {summary || t("result.fallbackSummary", { literal: character?.literal ?? "-" })}
        </Text>
      </View>

      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>{t("result.feedback")}</Text>
        <Text style={styles.feedbackLine}>
          - {t("result.strokeInput", {
            drawn: drawnStrokes ?? "-",
            expected: expectedStrokes ?? "-",
          })}
        </Text>
        <Text style={styles.feedbackLine}>- {t("result.rubric")}</Text>
        {feedbackLines.map((line) => (
          <Text key={line} style={styles.feedbackLine}>
            - {line}
          </Text>
        ))}
      </View>

      <Link href={characterId ? `/practice/${characterId}` : "/list"} asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>{t("result.practiceAgain")}</Text>
        </Pressable>
      </Link>

      <Link href="/list" asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryLabel}>{t("result.nextCharacter")}</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 28,
    padding: spacing[7],
    marginBottom: 14,
  },
  passCard: {
    backgroundColor: colors.success,
  },
  failCard: {
    backgroundColor: colors.danger,
  },
  status: {
    color: colors.inkOnDark,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  score: {
    color: colors.inkOnDark,
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
    ...surfaceStyles.card,
    padding: 18,
    marginBottom: 16,
    gap: 8,
  },
  feedbackTitle: textStyles.titleMd,
  feedbackLine: textStyles.bodySm,
  secondaryButton: {
    ...buttonStyles.secondary,
    marginBottom: 10,
  },
  secondaryLabel: {
    ...textStyles.buttonLabel,
    color: colors.accentWarmMuted,
  },
  primaryButton: {
    ...buttonStyles.warm,
    marginBottom: 20,
  },
  primaryLabel: {
    ...textStyles.buttonLabel,
    color: colors.inkOnDark,
  },
});
