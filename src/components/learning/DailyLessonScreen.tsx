import { useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../common/Screen";
import { KanaText } from "../common/KanaText";
import { useTheme } from "../../design/theme";
import { useI18n } from "../../i18n/useI18n";
import { useAppState } from "../../state/AppStateProvider";
import { useReviewClock } from "../../domain/review/useReviewClock";
import { getTodayLesson } from "../../domain/learning/dailyLessonProgress";
import { getDailyLessonView } from "../../domain/learning/dailyLessonView";
import { buildDailyLesson, DAILY_LESSON_SIZE } from "../../domain/learning/buildDailyLesson";
import { getKanaCategoryKeyById, getKanaCharacterId, KANA_LESSONS } from "../../data/kanaCatalog";
import { getCharacterMeaning } from "../../data/characters";
import { useKanjiCharacterQuery, useKanjiCharactersByCategoryQuery } from "../../queries/kanjiQueries";

export default function DailyLessonScreen() {
  const router = useRouter();
  const now = useReviewClock();
  const { locale, t } = useI18n();
  const { colors, textStyles, surfaceStyles, buttonStyles } = useTheme();
  const { hydrated, dailyLesson, startDailyLesson, progressByCharacter, dismissedReviewCharacterIds,
    recentCategoryKeys, onboardingStep, setOnboardingStep } = useAppState();
  const lesson = getTodayLesson(dailyLesson, now);
  const categoryKey = useMemo(() => {
    const recent = recentCategoryKeys[0] ?? "kana_hiragana";
    const index = KANA_LESSONS.findIndex((item) => item.key === recent);
    if (index < 0) return recent;
    // Continue through the kana curriculum once a whole set has been learned.
    return KANA_LESSONS.slice(index).find((item) => item.literals.some((literal) => !progressByCharacter[getKanaCharacterId(literal)]?.successes))?.key ?? recent;
  }, [recentCategoryKeys, progressByCharacter]);
  const category = useKanjiCharactersByCategoryQuery(hydrated && !lesson ? categoryKey : undefined, locale, "lesson");
  const candidates = useMemo(() => category.data?.pages.flatMap((page) => page?.characters ?? []) ?? [], [category.data]);
  const newCount = candidates.filter((item) => !progressByCharacter[item.id]?.successes).length;
  const needsMore = !lesson && newCount < DAILY_LESSON_SIZE && Boolean(category.hasNextPage);
  useEffect(() => {
    if (needsMore && !category.isFetching && !category.isError) void category.fetchNextPage();
  }, [needsMore, category.isFetching, category.isError, category.fetchNextPage]);
  useEffect(() => {
    if (!hydrated || lesson || category.isFetching || category.isError || needsMore || candidates.length === 0) return;
    startDailyLesson(buildDailyLesson({ now: new Date(), candidates, categoryKey, progress: progressByCharacter, dismissed: dismissedReviewCharacterIds }));
  }, [hydrated, lesson, category.isFetching, category.isError, needsMore, candidates, categoryKey, progressByCharacter, dismissedReviewCharacterIds, startDailyLesson]);
  const completed = lesson?.items.filter((item) => item.completedAt).length ?? 0;
  const item = lesson?.items.find((entry) => !entry.completedAt);
  const { data: character, isLoading, refetch } = useKanjiCharacterQuery(item?.characterId, "lesson");
  const finished = Boolean(lesson && !item);
  const view = getDailyLessonView({
    hydrated, hasLesson: Boolean(lesson), finished,
    categoryPending: category.isPending, categoryFetching: category.isFetching,
    categoryError: category.isError, needsMore, candidateCount: candidates.length,
    hasItem: Boolean(item), characterLoading: isLoading, hasCharacter: Boolean(character),
  });
  const styles = StyleSheet.create({
    content: { width: "100%", maxWidth: 620, alignSelf: "center", gap: 20 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    step: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.bgMuted },
    card: { ...surfaceStyles.card, padding: 24, alignItems: "center", gap: 16 },
    literal: { ...textStyles.displaySm, fontSize: 88, lineHeight: 112, textAlign: "center" },
    center: { textAlign: "center" },
    primary: { ...buttonStyles.primary, minHeight: 52, justifyContent: "center" },
    secondary: { ...buttonStyles.secondary, minHeight: 48, justifyContent: "center" },
    buttonText: { ...textStyles.buttonLabel, textAlign: "center", color: colors.inkOnDark },
    link: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  });
  const leave = () => router.dismissTo("/learn");
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={textStyles.titleMd}>{t("lesson.title")}</Text>
          <Text style={textStyles.meta}>{t("lesson.progress", { count: completed, total: lesson?.items.length ?? DAILY_LESSON_SIZE })}</Text>
        </View>
        <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={t("lesson.title")}
          accessibilityValue={{ min: 0, max: lesson?.items.length ?? DAILY_LESSON_SIZE, now: completed }}>
          {Array.from({ length: lesson?.items.length ?? DAILY_LESSON_SIZE }, (_, index) => <View key={index} style={[styles.step, index < completed && { backgroundColor: colors.success }]} />)}
        </View>
        {view === "complete" ? <>
          <View style={styles.card}>
            <Ionicons name="paw" size={48} color={colors.accentWarm} />
            <Text style={[textStyles.titleMd, styles.center]}>{t("lesson.doneTitle")}</Text>
            <Text style={[textStyles.bodySm, styles.center]}>{t("lesson.doneBody", { count: completed })}</Text>
            <Text style={[textStyles.caption, styles.center]}>{t("lesson.doneHint")}</Text>
          </View>
          <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.dismissTo("/")}>
            <Text style={styles.buttonText}>{t("lesson.visitDog")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={leave}><Text style={[textStyles.buttonLabel, styles.center]}>{t("lesson.free")}</Text></Pressable>
        </> : view === "loading" ? (
          <View style={styles.card}><ActivityIndicator color={colors.inkStrong} /><Text style={textStyles.bodySm}>{t("lesson.loading")}</Text></View>
        ) : character && item && lesson ? <>
          <View style={styles.card}>
            <Text style={textStyles.meta}>{t(item.kind === "review" ? "lesson.review" : "lesson.new")}</Text>
            <KanaText style={styles.literal}>{character.literal}</KanaText>
            <Text style={[textStyles.titleMd, styles.center]}>{getCharacterMeaning(character, locale)}</Text>
            {!character.kana ? <Text style={[textStyles.bodySm, styles.center]}>{[...character.onyomi, ...character.kunyomi].slice(0, 4).join(" · ")}</Text> : null}
            {character.kana?.memory?.word ? <View style={{ alignItems: "center", gap: 4 }}>
              <KanaText style={textStyles.titleSm}>{character.kana.memory.word}</KanaText>
              {locale === "ko" ? <Text style={textStyles.caption}>{character.kana.memory.wordMeaningKo}</Text> : null}
            </View> : null}
          </View>
          <Pressable accessibilityRole="button" style={styles.primary} onPress={() => {
            if (onboardingStep !== "done") setOnboardingStep("practice_guide");
            router.push({ pathname: "/practice/[characterId]", params: { characterId: item.characterId, categoryKey: item.categoryKey ?? getKanaCategoryKeyById(item.characterId), lessonId: lesson.id } });
          }}><Text style={styles.buttonText}>{t("lesson.write")}</Text></Pressable>
          <Text style={[textStyles.caption, styles.center]}>{t("lesson.rewardHint")}</Text>
        </> : <View style={styles.card}>
          <Text style={textStyles.bodySm}>{t("lesson.error")}</Text>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => { if (item) void refetch(); else if (category.isFetchNextPageError) void category.fetchNextPage(); else void category.refetch(); }}><Text style={textStyles.buttonLabel}>{t("lesson.retry")}</Text></Pressable>
        </View>}
        {!finished ? <Pressable accessibilityRole="button" style={styles.link} onPress={leave}><Text style={textStyles.caption}>{t("lesson.pause")}</Text></Pressable> : null}
      </View>
    </Screen>
  );
}
