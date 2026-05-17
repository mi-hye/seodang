import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { WritingCanvas } from "../../src/components/practice/WritingCanvas";
import { Screen } from "../../src/components/common/Screen";
import { getCharacterMeaning } from "../../src/data/characters";
import { spacing, useTheme } from "../../src/design/theme";
import { useI18n } from "../../src/i18n/useI18n";
import { evaluatePractice } from "../../src/domain/practice/evaluatePractice";
import {
  useKanjiCharacterQuery,
  useKanjiStrokeDataQuery,
} from "../../src/queries/kanjiQueries";
import { CanvasSize, InputStroke } from "../../src/types/practice";

const SCROLL_RESTORE_DELAY_MS = 1200;

export default function PracticeScreen() {
  const router = useRouter();
  const { characterId, categoryKey } = useLocalSearchParams<{
    characterId: string;
    categoryKey?: string;
  }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const { data: character, isLoading: isCharacterLoading } = useKanjiCharacterQuery(characterId);
  const { locale, t } = useI18n();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && width >= 700;
  const screenScrollEnabled = !isLandscape;
  const { buttonStyles, chipStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({
    buttonStyles,
    chipStyles,
    colors,
    isLandscape,
    surfaceStyles,
    textStyles,
  });
  const scrollRestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isCanvasInteracting, setIsCanvasInteracting] = useState(false);
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

  useEffect(() => {
    return () => {
      if (scrollRestoreTimerRef.current) {
        clearTimeout(scrollRestoreTimerRef.current);
      }
    };
  }, []);

  const handleCanvasInteractionStart = () => {
    if (scrollRestoreTimerRef.current) {
      clearTimeout(scrollRestoreTimerRef.current);
      scrollRestoreTimerRef.current = null;
    }

    setIsCanvasInteracting(true);
  };

  const handleCanvasInteractionEnd = () => {
    if (scrollRestoreTimerRef.current) {
      clearTimeout(scrollRestoreTimerRef.current);
    }

    scrollRestoreTimerRef.current = setTimeout(() => {
      setIsCanvasInteracting(false);
      scrollRestoreTimerRef.current = null;
    }, SCROLL_RESTORE_DELAY_MS);
  };

  if (isCharacterLoading) {
    return (
      <Screen>
        <Text style={styles.errorTitle}>{t("common.loading")}</Text>
      </Screen>
    );
  }

  if (!character) {
    return (
      <Screen>
        <Text style={styles.errorTitle}>{t("practice.missing")}</Text>
      </Screen>
    );
  }

  const handleSubmit = () => {
    const evaluation = evaluatePractice({
      strokes,
      template: kanjiStrokeData?.strokes,
      canvasSize,
      t,
    });

    router.replace({
      pathname: "/practice/result",
      params: {
        characterId: character.id,
        categoryKey: normalizedCategoryKey,
        literal: character.literal,
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

  const headerPanel = (
    <>
      <View style={styles.headerCard}>
        <Text style={styles.caption}>{t("practice.target")}</Text>
        <Text style={styles.literal}>{character.literal}</Text>
        <Text style={styles.meaning}>{getCharacterMeaning(character, locale)}</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.toolChip}>
          <Text style={styles.toolChipText}>
            {t("practice.currentStrokes", {
              count: strokes.length,
              total: character.strokeCount ?? "-",
            })}
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
            {showGuide ? t("practice.hideGuide") : t("practice.showGuide")}
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
          <Text style={styles.toolChipText}>{t("practice.undoStroke")}</Text>
        </Pressable>
      </View>
    </>
  );

  const canvasPanel = (
    <View style={styles.canvasCard}>
      <WritingCanvas
        showGuide={showGuide}
        guideData={kanjiStrokeData}
        strokes={strokes}
        onChange={setStrokes}
        onCanvasLayout={setCanvasSize}
        onInteractionStart={handleCanvasInteractionStart}
        onInteractionEnd={handleCanvasInteractionEnd}
      />
      <Text style={styles.canvasHint}>{t("practice.canvasHint")}</Text>
      {isGuideLoadError ? (
        <Text style={styles.canvasSubHint}>{t("practice.loadGuideError")}</Text>
      ) : null}
      {!isGuideLoading && !isGuideLoadError && !kanjiStrokeData ? (
        <Text style={styles.canvasSubHint}>{t("practice.missingGuide")}</Text>
      ) : null}
    </View>
  );

  const actionPanel = (
    <View style={styles.actions}>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => setStrokes([])}
      >
        <Text style={styles.secondaryLabel}>{t("practice.reset")}</Text>
      </Pressable>
      <Pressable
        style={[
          styles.primaryButton,
          strokes.length === 0 && styles.primaryButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={strokes.length === 0}
      >
        <Text style={styles.primaryLabel}>{t("practice.submit")}</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen scrollEnabled={screenScrollEnabled && !isCanvasInteracting}>
      {isLandscape ? (
        <View style={styles.landscapeLayout}>
          <View style={styles.landscapeSide}>
            {headerPanel}
            {actionPanel}
          </View>
          <View style={styles.landscapeCanvas}>
            {canvasPanel}
          </View>
        </View>
      ) : (
        <>
          {headerPanel}
          {canvasPanel}
          {actionPanel}
        </>
      )}
    </Screen>
  );
}

function createStyles({
  buttonStyles,
  chipStyles,
  colors,
  isLandscape,
  surfaceStyles,
  textStyles,
}: any) {
  return StyleSheet.create({
    landscapeLayout: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing[5],
      flex: 1,
      width: "100%",
    },
    landscapeSide: {
      flex: 0.9,
      justifyContent: "space-between",
      minWidth: 280,
      maxWidth: 380,
    },
    landscapeCanvas: {
      flex: 1.2,
      justifyContent: "center",
      minWidth: 360,
    },
    headerCard: {
      ...surfaceStyles.card,
      borderRadius: 28,
      padding: isLandscape ? spacing[5] : spacing[7],
      alignItems: "center",
      marginBottom: spacing[4],
    },
    caption: {
      ...textStyles.eyebrow,
      marginBottom: 10,
    },
    literal: {
      ...textStyles.glyphLg,
      fontSize: isLandscape ? 54 : textStyles.glyphLg.fontSize,
      marginBottom: 6,
    },
    meaning: {
      fontSize: 17,
      color: colors.inkBody,
      fontWeight: "700",
    },
    toolbar: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2] + 2,
      marginBottom: spacing[4],
    },
    toolChip: chipStyles.base,
    toolChipActive: {
      ...chipStyles.active,
      backgroundColor: colors.accentWarm,
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
      padding: isLandscape ? 10 : 18,
      marginBottom: isLandscape ? 0 : 16,
      width: "100%",
      maxHeight: isLandscape ? "100%" : undefined,
    },
    canvasHint: {
      ...textStyles.bodySm,
      display: isLandscape ? "none" : "flex",
      marginTop: 14,
    },
    canvasSubHint: {
      display: isLandscape ? "none" : "flex",
      fontSize: 12,
      lineHeight: 18,
      color: colors.accentWarmMuted,
      marginTop: 6,
      fontWeight: "700",
    },
    actions: {
      flexDirection: "row",
      gap: spacing[3],
      marginBottom: isLandscape ? 0 : 20,
      width: "100%",
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
      backgroundColor: colors.accentWarm,
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
}
