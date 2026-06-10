import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { KanjiLoadingScreen } from "../../src/components/common/KanjiLoadingScreen";
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
import { useAppState } from "../../src/state/AppStateProvider";
import { CanvasSize, InputStroke } from "../../src/types/practice";

const SCROLL_RESTORE_DELAY_MS = 1200;

export default function PracticeScreen() {
  const router = useRouter();
  const { characterId, categoryKey, reviewIds } = useLocalSearchParams<{
    characterId: string;
    categoryKey?: string;
    reviewIds?: string;
  }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const normalizedReviewIds = Array.isArray(reviewIds) ? reviewIds[0] : reviewIds;
  const {
    data: character,
    isLoading: isCharacterLoading,
    isError: isCharacterError,
    refetch: refetchCharacter,
  } = useKanjiCharacterQuery(characterId, "practice");
  const { locale, t } = useI18n();
  const { onboardingStep, setOnboardingStep } = useAppState();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && width >= 700;
  const isCompactLandscape = isLandscape && height < 520;
  const screenScrollEnabled = !isLandscape;
  const { buttonStyles, chipStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({
    buttonStyles,
    chipStyles,
    colors,
    isCompactLandscape,
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
    refetch: refetchGuide,
  } = useKanjiStrokeDataQuery(character?.literal, "practice");
  const showGuideOnboarding =
    Boolean(character) && onboardingStep === "practice_guide";
  const showSubmitOnboarding =
    Boolean(character) && onboardingStep === "practice_submit";

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
    return <KanjiLoadingScreen />;
  }

  if (!character) {
    return (
      <Screen>
        {isCharacterError ? (
          <View style={styles.errorState}>
            <Text style={styles.errorStateTitle}>{t("practice.missing")}</Text>
            <Pressable
              style={styles.errorRetryButton}
              onPress={() => {
                void refetchCharacter();
              }}
              hitSlop={8}
            >
              <MaterialIcons
                name="refresh"
                size={22}
                color={colors.accentWarmMuted}
              />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.errorTitle}>{t("practice.missing")}</Text>
        )}
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
        reviewIds: normalizedReviewIds,
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
        <View style={styles.guideChipWrap}>
          {showGuideOnboarding ? (
            <View pointerEvents="none" style={styles.onboardingHint}>
              <View style={styles.onboardingBubble}>
                <Text style={styles.onboardingHintText}>
                  {t("practice.onboardingAction")}
                </Text>
              </View>
              <View style={styles.onboardingTail} />
            </View>
          ) : null}
          <Pressable
            style={[styles.toolChip, showGuide && styles.toolChipActive]}
            onPress={() => {
              if (showGuideOnboarding) {
                setOnboardingStep("practice_submit");
              }
              setShowGuide((current) => !current);
            }}
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
        </View>
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
    <View style={styles.canvasStack}>
      <View style={styles.canvasCard}>
        <WritingCanvas
          fillMode={isLandscape}
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
          <View style={styles.canvasErrorState}>
            <Text style={styles.canvasErrorTitle}>{t("practice.loadGuideError")}</Text>
            <Pressable
              style={styles.errorRetryButton}
              onPress={() => {
                void refetchGuide();
              }}
              hitSlop={8}
            >
              <MaterialIcons
                name="refresh"
                size={22}
                color={colors.accentWarmMuted}
              />
            </Pressable>
          </View>
        ) : null}
        {!isGuideLoading && !isGuideLoadError && !kanjiStrokeData ? (
          <Text style={styles.canvasSubHint}>{t("practice.missingGuide")}</Text>
        ) : null}
      </View>
    </View>
  );

  const actionPanel = (
    <View style={styles.actions}>
      <Pressable
        style={[
          styles.secondaryButton,
          showGuideOnboarding || showSubmitOnboarding
            ? styles.dimmedSection
            : null,
        ]}
        onPress={() => setStrokes([])}
        disabled={showGuideOnboarding || showSubmitOnboarding}
      >
        <Text style={styles.secondaryLabel}>{t("practice.reset")}</Text>
      </Pressable>
      <View style={styles.submitWrap}>
        {showSubmitOnboarding ? (
          <View pointerEvents="none" style={styles.submitHint}>
            <View style={styles.submitHintBubble}>
              <Text style={styles.submitHintText}>
                {t("practice.submitHint")}
              </Text>
            </View>
            <View style={styles.submitHintTail} />
          </View>
        ) : null}
        <Pressable
          style={[
            styles.primaryButton,
            strokes.length === 0 && styles.primaryButtonDisabled,
          ]}
          onPress={() => {
            if (showSubmitOnboarding) {
              setOnboardingStep("result");
            }
            handleSubmit();
          }}
          disabled={strokes.length === 0}
        >
          <Text style={styles.primaryLabel}>{t("practice.submit")}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen
      scrollContainer={!isLandscape}
      scrollEnabled={screenScrollEnabled && !isCanvasInteracting}
    >
      {isLandscape ? (
        <View style={styles.landscapeLayout}>
          <View style={styles.landscapeSide}>
            {headerPanel}
          </View>
          <View style={styles.landscapeCanvas}>
            {canvasPanel}
          </View>
          <View>{actionPanel}</View>
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
  isCompactLandscape,
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
      flex: isCompactLandscape ? 0.72 : 0.9,
      minWidth: isCompactLandscape ? 236 : 280,
      maxWidth: isCompactLandscape ? 300 : 380,
    },
    landscapeCanvas: {
      flex: 1.2,
      minWidth: 360,
    },
    dimmedSection: {
      opacity: 0.32,
    },
    headerCard: {
      ...surfaceStyles.card,
      borderRadius: 28,
      padding: isCompactLandscape ? spacing[4] : isLandscape ? spacing[5] : spacing[7],
      alignItems: "center",
      marginBottom: isCompactLandscape ? spacing[3] : spacing[4],
    },
    caption: {
      ...textStyles.eyebrow,
      marginBottom: 10,
    },
    literal: {
      ...textStyles.glyphLg,
      fontSize: isCompactLandscape ? 42 : isLandscape ? 54 : textStyles.glyphLg.fontSize,
      marginBottom: 6,
    },
    meaning: {
      fontSize: isCompactLandscape ? 14 : 17,
      color: colors.inkBody,
      fontWeight: "700",
    },
    errorState: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing[3],
      paddingVertical: spacing[8],
    },
    errorStateTitle: {
      ...textStyles.titleMd,
      textAlign: "center",
    },
    errorRetryButton: {
      width: 44,
      height: 44,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    toolbar: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: isCompactLandscape ? spacing[2] : spacing[2] + 2,
      marginBottom: isCompactLandscape ? spacing[3] : spacing[4],
    },
    toolChip: {
      ...chipStyles.base,
      paddingHorizontal: isCompactLandscape ? 10 : chipStyles.base.paddingHorizontal,
      paddingVertical: isCompactLandscape ? 7 : chipStyles.base.paddingVertical,
    },
    toolChipActive: {
      ...chipStyles.active,
      backgroundColor: colors.accentWarm,
    },
    guideChipWrap: {
      position: "relative",
      alignSelf: "flex-start",
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
      flex: isLandscape ? 1 : undefined,
      maxHeight: isLandscape ? "100%" : undefined,
    },
    canvasStack: {
      position: "relative",
      width: "100%",
      flex: isLandscape ? 1 : undefined,
    },
    onboardingHint: {
      position: "absolute",
      left: -78,
      right: -78,
      bottom: isLandscape ? 44 : 42,
      alignItems: "center",
      zIndex: 20,
      maxWidth: isLandscape ? 320 : 260,
    },
    onboardingBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 16,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      alignSelf: "center",
    },
    onboardingTail: {
      marginLeft: 0,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 12,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.accentWarm,
      marginTop: -2,
    },
    onboardingHintText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
      fontWeight: "800",
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
    canvasErrorState: {
      display: isLandscape ? "none" : "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing[3],
      marginTop: spacing[3],
    },
    canvasErrorTitle: {
      ...textStyles.titleSm,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: isCompactLandscape ? spacing[2] : spacing[3],
      marginTop: isLandscape ? "auto" : 0,
      marginBottom: isLandscape ? 0 : 20,
      width: "100%",
    },
    submitWrap: {
      flex: 1,
      position: "relative",
    },
    secondaryButton: {
      ...buttonStyles.secondary,
      paddingVertical: isCompactLandscape ? 10 : buttonStyles.secondary.paddingVertical,
      flex: 1,
    },
    secondaryLabel: {
      ...textStyles.buttonLabel,
      color: colors.accentWarmMuted,
    },
    primaryButton: {
      ...buttonStyles.primary,
      backgroundColor: colors.accentWarm,
      paddingVertical: isCompactLandscape ? 10 : buttonStyles.primary.paddingVertical,
      flex: 1,
    },
    primaryButtonDisabled: {
      opacity: 0.45,
    },
    primaryLabel: {
      ...textStyles.buttonLabel,
      color: colors.inkOnDark,
    },
    submitHint: {
      position: "absolute",
      right: 0,
      bottom: 58,
      alignItems: "flex-end",
      zIndex: 20,
      maxWidth: isLandscape ? 340 : 300,
    },
    submitHintBubble: {
      backgroundColor: colors.accentWarm,
      borderRadius: 16,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      alignSelf: "flex-end",
    },
    submitHintTail: {
      marginRight: 18,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 12,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.accentWarm,
      marginTop: -2,
    },
    submitHintText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
      fontWeight: "800",
    },
    errorTitle: textStyles.displaySm,
  });
}
