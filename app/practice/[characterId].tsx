import { useRouter, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { WritingCanvas } from "../../src/components/practice/WritingCanvas";
import { Screen, ScreenHandle } from "../../src/components/common/Screen";
import { getCharacterById } from "../../src/data/characters";
import {
  buttonStyles,
  chipStyles,
  colors,
  spacing,
  surfaceStyles,
  textStyles,
} from "../../src/design/theme";
import { evaluatePractice } from "../../src/domain/practice/evaluatePractice";
import { useKanjiStrokeDataQuery } from "../../src/queries/useKanjiStrokeDataQuery";
import { CanvasSize, InputStroke } from "../../src/types/practice";

export default function PracticeScreen() {
  const router = useRouter();
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacterById(characterId);
  const screenRef = useRef<ScreenHandle>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [strokes, setStrokes] = useState<InputStroke[]>([]);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const {
    data: kanjiStrokeData,
    isLoading: isGuideLoading,
    isError: isGuideLoadError,
  } = useKanjiStrokeDataQuery(character?.literal);

  if (!character) {
    return (
      <Screen>
        <Text style={styles.errorTitle}>연습 대상을 불러오지 못했습니다.</Text>
      </Screen>
    );
  }

  const handleSubmit = () => {
    const evaluation = evaluatePractice({
      strokes,
      template: kanjiStrokeData?.strokes,
      canvasSize,
    });

    router.push({
      pathname: "/practice/result",
      params: {
        characterId: character.id,
        score: String(evaluation.score),
        passed: String(evaluation.passed),
        attemptId: `${character.id}-${Date.now()}`,
        practicedAt: new Date().toISOString(),
        drawnStrokes: String(evaluation.drawnStrokes),
        expectedStrokes: String(evaluation.expectedStrokes),
        summary: evaluation.summary,
        feedback: evaluation.feedback.join("\n"),
      },
    });
  };

  return (
    <Screen ref={screenRef}>
      <View style={styles.headerCard}>
        <Text style={styles.caption}>목표 한자</Text>
        <Text style={styles.literal}>{character.literal}</Text>
        <Text style={styles.meaning}>{character.meaningKo}</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.toolChip}>
          <Text style={styles.toolChipText}>
            현재 획 {strokes.length} / {character.strokeCount}
          </Text>
        </View>
        <Pressable
          style={[styles.toolChip, showGuide && styles.toolChipActive]}
          onPress={() => setShowGuide((current) => !current)}
        >
          <Text
            style={[
              styles.toolChipText,
              showGuide && styles.toolChipTextActive,
            ]}
          >
            {showGuide ? "획 숨기기" : "획 보기"}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toolChip,
            strokes.length === 0 && styles.toolChipDisabled,
          ]}
          onPress={() => setStrokes((current) => current.slice(0, -1))}
          disabled={strokes.length === 0}
        >
          <Text style={styles.toolChipText}>한 획 지우기</Text>
        </Pressable>
      </View>

      <View style={styles.canvasCard}>
        <WritingCanvas
          showGuide={showGuide}
          guideData={kanjiStrokeData}
          strokes={strokes}
          onChange={setStrokes}
          onCanvasLayout={setCanvasSize}
          onInteractionStart={() => screenRef.current?.setScrollEnabled(false)}
          onInteractionEnd={() => screenRef.current?.setScrollEnabled(true)}
        />
        <Text style={styles.canvasHint}>
          한 획을 쓸 때마다 손을 떼면 다음 획으로 기록됩니다. 지금은 획 수,
          방향, 시작/끝 위치를 기준 데이터와 비교합니다.
        </Text>
        {isGuideLoading ? (
          <Text style={styles.canvasSubHint}>기준 획 데이터를 불러오는 중입니다.</Text>
        ) : null}
        {isGuideLoadError ? (
          <Text style={styles.canvasSubHint}>획 데이터를 아직 불러오지 못했습니다.</Text>
        ) : null}
        {!isGuideLoading && !isGuideLoadError && !kanjiStrokeData ? (
          <Text style={styles.canvasSubHint}>
            이 한자는 아직 Supabase 기준 획 데이터가 연결되지 않았습니다.
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setStrokes([])}
        >
          <Text style={styles.secondaryLabel}>다시 쓰기</Text>
        </Pressable>
        <Pressable
          style={[
            styles.primaryButton,
            strokes.length === 0 && styles.primaryButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={strokes.length === 0}
        >
          <Text style={styles.primaryLabel}>제출</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    ...surfaceStyles.card,
    borderRadius: 28,
    padding: spacing[7],
    alignItems: "center",
    marginBottom: spacing[4],
  },
  caption: {
    ...textStyles.eyebrow,
    marginBottom: 10,
  },
  literal: {
    ...textStyles.glyphLg,
    marginBottom: 6,
  },
  meaning: {
    fontSize: 17,
    color: colors.inkBody,
    fontWeight: "700",
  },
  toolbar: {
    flexDirection: "row",
    gap: spacing[2] + 2,
    marginBottom: spacing[4],
  },
  toolChip: chipStyles.base,
  toolChipActive: {
    ...chipStyles.active,
  },
  toolChipText: {
    ...textStyles.meta,
    color: colors.accentWarmMuted,
  },
  toolChipDisabled: {
    opacity: 0.45,
  },
  toolChipTextActive: {
    color: colors.inkOnDark,
  },
  canvasCard: {
    ...surfaceStyles.card,
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
  },
  canvasHint: {
    ...textStyles.bodySm,
    marginTop: 14,
  },
  canvasSubHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.accentWarmMuted,
    marginTop: 6,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: 20,
  },
  secondaryButton: {
    ...buttonStyles.secondary,
    flex: 1,
  },
  secondaryLabel: {
    ...textStyles.buttonLabel,
    color: colors.accentWarmMuted,
  },
  primaryButton: {
    ...buttonStyles.primary,
    flex: 1,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    ...textStyles.buttonLabel,
    color: colors.inkOnDark,
  },
  errorTitle: textStyles.displaySm,
});
