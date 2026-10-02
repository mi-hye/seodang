import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../common/Screen";
import { KanaText } from "../common/KanaText";
import { useAppState } from "../../state/AppStateProvider";
import { useI18n } from "../../i18n/useI18n";
import { useTheme } from "../../design/theme";
import { useReviewClock } from "../../domain/review/useReviewClock";
import { getTodayLesson } from "../../domain/learning/dailyLessonProgress";
import { buildGuidedLesson } from "../../domain/learning/buildGuidedLesson";
import { getTodayPetRewards } from "../../domain/pet/learningPet";
import { useKanjiCharacterQuery } from "../../queries/kanjiQueries";
import { getCharacterMeaning } from "../../data/characters";
import type { LessonQuiz } from "../../types/app-state";

export default function GuidedLessonScreen() {
  const router = useRouter();
  const now = useReviewClock();
  const { t, locale } = useI18n();
  const { colors, textStyles, surfaceStyles, buttonStyles } = useTheme();
  const { dailyLesson, learningStage, guidedProgress, hydrated, startDailyLesson, completeQuiz,
    learningPet, progressByCharacter, setOnboardingStep } = useAppState();
  const lesson = getTodayLesson(dailyLesson, now);
  useEffect(() => {
    if (hydrated && learningStage && !lesson) startDailyLesson(buildGuidedLesson(learningStage, guidedProgress, new Date()));
  }, [hydrated, learningStage, lesson, guidedProgress, startDailyLesson]);
  const completed = lesson?.items.filter((entry) => entry.completedAt).length ?? 0;
  const item = lesson?.items.find((entry) => !entry.completedAt);
  const { data: character, isLoading, refetch } = useKanjiCharacterQuery(item && !item.quiz ? item.characterId : undefined, "guided-writing");
  const styles = StyleSheet.create({
    content: { width: "100%", maxWidth: 620, alignSelf: "center", gap: 20 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    track: { height: 8, backgroundColor: colors.bgMuted, borderRadius: 4, overflow: "hidden" },
    card: { ...surfaceStyles.card, padding: 24, gap: 16, alignItems: "center" },
    primary: { ...buttonStyles.primary, minHeight: 52, justifyContent: "center" },
    primaryText: { ...textStyles.buttonLabel, color: colors.inkOnDark, textAlign: "center" },
    link: { minHeight: 44, alignItems: "center", justifyContent: "center" },
    center: { textAlign: "center" },
  });
  return <Screen><View style={styles.content}>
    <View style={styles.row}>
      <Text style={[textStyles.meta, { flex: 1 }]}>{t("stage." + learningStage + ".name")}</Text>
      <Text style={textStyles.caption}>{t("course.progress", { count: completed, total: lesson?.items.length ?? 4 })}</Text>
    </View>
    <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={t("lesson.title")}
      accessibilityValue={{ min: 0, max: lesson?.items.length ?? 4, now: completed }}>
      <View style={{ height: "100%", width: (lesson ? completed / lesson.items.length * 100 : 0) + "%" as `${number}%`, backgroundColor: colors.success }} />
    </View>
    {!lesson ? <ActivityIndicator color={colors.inkStrong} /> : !item ? <>
      <View style={styles.card}>
        <Ionicons name="paw" size={48} color={colors.accentWarm} />
        <Text style={[textStyles.titleMd, styles.center]}>{t("lesson.doneTitle")}</Text>
        <Text style={[textStyles.bodySm, styles.center]}>{t("course.doneBody", { count: completed })}</Text>
        <Text style={[textStyles.caption, styles.center]}>{t("course.food", { count: getTodayPetRewards(learningPet, now) })}</Text>
      </View>
      <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.dismissTo("/")}><Text style={styles.primaryText}>{t("lesson.visitDog")}</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.link} onPress={() => router.dismissTo("/learn")}><Text style={textStyles.meta}>{t("lesson.free")}</Text></Pressable>
    </> : item.quiz ? <QuizCard key={lesson.id + ":" + completed} quiz={item.quiz} onComplete={(answer) => completeQuiz({ lessonId: lesson.id, questionId: item.quiz!.id, answer })} /> : isLoading ? <ActivityIndicator color={colors.inkStrong} /> : character ? <>
      <View style={styles.card}>
        <Text style={textStyles.meta}>{t("course.writeHint")}</Text>
        <KanaText style={[textStyles.displaySm, { fontSize: 80, lineHeight: 104 }]}>{character.literal}</KanaText>
        <Text style={textStyles.titleMd}>{getCharacterMeaning(character, locale)}</Text>
      </View>
      <Pressable accessibilityRole="button" style={styles.primary} onPress={() => {
        if (Object.keys(progressByCharacter).length === 0) setOnboardingStep("practice_guide");
        router.push({ pathname: "/practice/[characterId]", params: { characterId: item.characterId, categoryKey: item.categoryKey, lessonId: lesson.id } });
      }}><Text style={styles.primaryText}>{t("course.write")}</Text></Pressable>
    </> : <View style={styles.card}>
      <Text style={textStyles.bodySm}>{t("lesson.error")}</Text>
      <Pressable accessibilityRole="button" style={styles.link} onPress={() => { void refetch(); }}><Text style={textStyles.meta}>{t("lesson.retry")}</Text></Pressable>
    </View>}
    {item ? <>
      <Text style={[textStyles.caption, styles.center]}>{t("course.rewardHint")}</Text>
      <Pressable accessibilityRole="button" style={styles.link} onPress={() => router.dismissTo("/learn")}><Text style={textStyles.caption}>{t("lesson.pause")}</Text></Pressable>
    </> : null}
  </View></Screen>;
}

function QuizCard({ quiz, onComplete }: { quiz: LessonQuiz; onComplete: (answer: string[]) => void }) {
  const { t, locale } = useI18n();
  const { colors, textStyles, surfaceStyles, buttonStyles } = useTheme();
  const [answer, setAnswer] = useState<string[]>([]);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const isPassage = quiz.cue.length > 55;
  const submitted = useRef(false);
  const check = (values: string[]) => {
    setAnswer(values);
    setCorrect(values.length === quiz.answer.length && values.every((value, index) => value === quiz.answer[index]));
  };
  const styles = StyleSheet.create({
    card: { ...surfaceStyles.card, padding: 22, gap: 18 },
    prompt: { ...textStyles.bodyMd, color: colors.inkStrong, fontWeight: "700" },
    cue: {
      ...textStyles.bodyMd,
      color: colors.inkStrong,
      textAlign: isPassage ? "left" : "center",
      fontSize: isPassage ? textStyles.titleSm.fontSize : quiz.cue.length > 15 ? textStyles.titleMd.fontSize : textStyles.bodyMd.fontSize * 1.6,
      lineHeight: isPassage ? textStyles.bodyMd.lineHeight + 3 : quiz.cue.length > 15 ? textStyles.bodyMd.lineHeight + 5 : textStyles.bodyMd.lineHeight + 11,
      fontWeight: isPassage ? "400" : "600",
      ...(isPassage ? { alignSelf: "stretch" as const } : {}),
    },
    answerText: { ...textStyles.bodyMd, color: colors.inkStrong, fontWeight: "600", textAlign: "center" },
    option: { ...surfaceStyles.card, padding: 16, minHeight: 52, alignItems: "center", justifyContent: "center" },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
    token: { padding: 12, borderRadius: 14, minHeight: 48, justifyContent: "center", backgroundColor: colors.bgMuted },
    feedback: { padding: 16, borderRadius: 18, backgroundColor: colors.bgMuted, gap: 8 },
    primary: { ...buttonStyles.primary, minHeight: 52, justifyContent: "center" },
    primaryText: { ...textStyles.buttonLabel, color: colors.inkOnDark, textAlign: "center" },
    link: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  });
  return <View style={{ gap: 16 }}>
    <View style={styles.card}>
      <Text style={styles.prompt}>{quiz.prompt[locale]}</Text>
      <KanaText style={styles.cue}>{locale === "ja" && quiz.id.startsWith("kana-") ? (quiz.cue.split(" · ").pop() ?? quiz.cue) : quiz.cue}</KanaText>
      {quiz.mode === "order" ? <View style={[styles.row, { minHeight: 60 }]} accessibilityLabel={t("course.yourSentence")}>
        {answer.length ? answer.map((token, index) => <Pressable key={token} accessibilityRole="button" disabled={correct === true}
          accessibilityLabel={t("course.remove", { token })} style={styles.token}
          onPress={() => { setAnswer(answer.filter((_, position) => position !== index)); setCorrect(null); }}>
          <Text style={styles.answerText}>{token}</Text>
        </Pressable>) : <Text style={textStyles.caption}>{t("course.orderHint")}</Text>}
      </View> : null}
    </View>
    <View style={quiz.mode === "order" ? styles.row : { gap: 10 }}>
      {quiz.choices.map((option) => {
        const selected = answer.includes(option);
        const disabled = correct === true || (quiz.mode === "order" && selected);
        return <Pressable key={option} accessibilityRole="button" accessibilityLabel={option}
          accessibilityState={{ disabled, selected }} disabled={disabled}
          style={[quiz.mode === "order" ? styles.token : styles.option,
            selected && { borderColor: correct === false ? colors.danger : colors.success, backgroundColor: colors.bgMuted },
            quiz.mode === "order" && selected && { opacity: 0.35 }]}
          onPress={() => { if (quiz.mode === "choice") check([option]); else { setAnswer([...answer, option]); setCorrect(null); } }}>
          <KanaText style={[styles.answerText, option.length === 1 && { fontSize: textStyles.titleSm.fontSize }, option.length > 14 && { textAlign: "left", fontWeight: "400", alignSelf: "stretch" }]}>{option}</KanaText>
        </Pressable>;
      })}
    </View>
    {correct !== null ? <View style={styles.feedback} accessibilityLiveRegion="polite">
      <Text style={[textStyles.titleSm, { color: correct ? colors.success : colors.inkStrong }]}>{t(correct ? "course.correct" : "course.tryAgain")}</Text>
      {!correct ? <Text style={textStyles.bodySm}>{quiz.hint[locale]}</Text> : null}
    </View> : null}
    {correct === true ? <Pressable accessibilityRole="button" style={styles.primary} onPress={() => {
      if (submitted.current) return;
      submitted.current = true;
      onComplete(answer);
    }}><Text style={styles.primaryText}>{t("course.next")}</Text></Pressable> : <>
      {quiz.mode === "order" ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: answer.length !== quiz.answer.length }}
        disabled={answer.length !== quiz.answer.length} style={[styles.primary, answer.length !== quiz.answer.length && { opacity: 0.45 }]} onPress={() => check(answer)}>
        <Text style={styles.primaryText}>{t("course.check")}</Text>
      </Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHint }} style={styles.link} onPress={() => setShowHint(!showHint)}><Text style={textStyles.caption}>{t("course.hint")}</Text></Pressable>
      {showHint && correct !== false ? <Text style={textStyles.bodySm}>{quiz.hint[locale]}</Text> : null}
    </>}
  </View>;
}
