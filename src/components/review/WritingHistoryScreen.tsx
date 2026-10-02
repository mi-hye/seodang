import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../common/Screen";
import { useTheme } from "../../design/theme";
import { useAppState } from "../../state/AppStateProvider";
import { useI18n } from "../../i18n/useI18n";
import { localDateKey } from "../../domain/review/writingActivity";
import { buildActivityMonth, buildReviewForecast } from "../../domain/review/writingInsights";
import { useReviewClock } from "../../domain/review/useReviewClock";

export default function WritingHistoryScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const theme = useTheme();
  const { colors, textStyles, surfaceStyles, buttonStyles } = theme;
  const { hydrated, writingActivity, progressByCharacter, dismissedReviewCharacterIds } = useAppState();
  const now = useReviewClock();
  const today = localDateKey(now);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthKey = localDateKey(month);
  const activityMonth = useMemo(() => buildActivityMonth(writingActivity, month), [writingActivity, monthKey]);
  const forecast = useMemo(() => buildReviewForecast(progressByCharacter, dismissedReviewCharacterIds, now), [progressByCharacter, dismissedReviewCharacterIds, now]);
  const selected = activityMonth.days.find((day) => day.key === (selectedKey ?? today));
  const maxAttempts = Math.max(1, ...activityMonth.days.map((day) => day.activity?.attempts ?? 0));
  const maxReviews = Math.max(1, ...forecast.days.map((day) => day.count));
  const dateLocale = locale === "ko" ? "ko-KR" : "ja-JP";
  const monthLabel = month.toLocaleDateString(dateLocale, { year: "numeric", month: "long" });
  const dateLabel = (date: Date) => date.toLocaleDateString(dateLocale, { month: "long", day: "numeric" });
  const weekdays = locale === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["日", "月", "火", "水", "木", "金", "土"];
  const styles = StyleSheet.create({
    page: { gap: 20, width: "100%", maxWidth: 680, alignSelf: "center" },
    card: { ...surfaceStyles.card, padding: 18, gap: 14 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    flowItem: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, backgroundColor: colors.bgMuted, borderRadius: 16 },
    bars: { flexDirection: "row", gap: 6 },
    barColumn: { flex: 1, alignItems: "center", gap: 6 },
    barTrack: { height: 60, width: 16, justifyContent: "flex-end", backgroundColor: colors.bgMuted, borderRadius: 5, overflow: "hidden" },
    calendar: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: "14.285714%", padding: 3 },
    day: { aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 2 },
    control: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
    summary: { flex: 1, gap: 4, alignItems: "center" },
    dot: { height: 12, width: 12, borderRadius: 3 },
  });

  if (!hydrated) return <Screen><Text style={textStyles.bodyMd}>{t("writingHistory.loading")}</Text></Screen>;

  return (
    <Screen contentStyle={styles.page}>
      <Text style={textStyles.displayMd}>{t("writingHistory.title")}</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={textStyles.sectionTitle}>{t("writingHistory.reviewNow")}</Text>
          <Text style={textStyles.displaySm}>{t("writingHistory.characters", { count: forecast.dueNow.length })}</Text>
        </View>
        <Pressable accessibilityRole="button" style={buttonStyles.primary} onPress={() => router.push(forecast.dueNow.length ? "/review" : "/categories")}>
          <Text style={[textStyles.buttonLabel, { color: colors.inkOnDark }]}>{t(forecast.dueNow.length ? "review.startPractice" : "review.emptyAction")}</Text>
        </Pressable>
        <Text style={textStyles.titleSm}>{t("writingHistory.upcoming")}</Text>
        <View style={styles.bars}>
          {forecast.days.map((day, index) => (
            <View key={day.key} style={styles.barColumn} accessible accessibilityLabel={`${dateLabel(day.date)}, ${t("writingHistory.characters", { count: day.count })}`}>
              <Text style={textStyles.meta}>{day.count}</Text>
              <View style={styles.barTrack}><View style={{ height: `${day.count / maxReviews * 100}%`, backgroundColor: colors.accentWarm }} /></View>
              <Text style={textStyles.meta}>{index === 0 ? t("writingHistory.laterToday") : `${day.date.getMonth() + 1}/${day.date.getDate()}`}</Text>
            </View>
          ))}
        </View>
        <Text style={textStyles.caption}>{t("writingHistory.forecastNote", { count: forecast.laterCount })}</Text>
      </View>

      <View style={styles.card}>
        <Text style={textStyles.sectionTitle}>{t("writingHistory.flow")}</Text>
        <Text style={textStyles.bodySm}>{t("writingHistory.flowLead")}</Text>
        <View style={styles.row}>
          {([1, 3, 7] as const).map((days) => (
            <View key={days} style={styles.flowItem}>
              <Text style={textStyles.meta}>{t(`writingHistory.condition${days}`)}</Text>
              <Text style={[textStyles.displaySm, { color: colors.accentWarmMuted }]}>{t("writingHistory.daysLater", { days })}</Text>
            </View>
          ))}
        </View>
        <Text style={textStyles.caption}>{t("writingHistory.flowNote")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={textStyles.sectionTitle}>{t("writingHistory.activity")}</Text>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("writingHistory.previousMonth")} style={styles.control} onPress={() => { setMonthOffset((value) => value - 1); setSelectedKey(null); }}><Text style={textStyles.displaySm}>‹</Text></Pressable>
          <Text style={textStyles.titleMd}>{monthLabel}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("writingHistory.nextMonth")} accessibilityState={{ disabled: monthOffset === 0 }} disabled={monthOffset === 0} style={[styles.control, { opacity: monthOffset === 0 ? 0.3 : 1 }]} onPress={() => { setMonthOffset((value) => value + 1); setSelectedKey(null); }}><Text style={textStyles.displaySm}>›</Text></Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.summary}><Text style={textStyles.displaySm}>{activityMonth.activeDays}</Text><Text style={textStyles.caption}>{t("writingHistory.activeDays")}</Text></View>
          <View style={styles.summary}><Text style={textStyles.displaySm}>{activityMonth.attempts}</Text><Text style={textStyles.caption}>{t("writingHistory.attempts")}</Text></View>
          <View style={styles.summary}><Text style={textStyles.displaySm}>{activityMonth.averageScore ?? "—"}</Text><Text style={textStyles.caption}>{t("reviewStats.averageScore")}</Text></View>
        </View>
        <View style={styles.calendar}>
          {weekdays.map((day) => <View key={day} style={styles.cell}><Text style={[textStyles.caption, { textAlign: "center" }]}>{day}</Text></View>)}
          {Array.from({ length: activityMonth.leadingBlanks }, (_, index) => <View key={`blank-${index}`} style={styles.cell} />)}
          {activityMonth.days.map((day) => {
            const count = day.activity?.attempts ?? 0;
            const future = day.key > today;
            const untracked = !writingActivity || day.key < localDateKey(new Date(writingActivity.startedAt));
            const active = day.key === selected?.key;
            const color = count === 0 ? colors.bgMuted : count / maxAttempts < 0.5 ? colors.accentWarm : colors.inkStrongAlt;
            return (
              <Pressable key={day.key} accessibilityRole="button" accessibilityState={{ selected: active, disabled: future }} accessibilityLabel={`${dateLabel(day.date)}, ${t(untracked && !count ? "writingHistory.untrackedDay" : "writingHistory.dayCount", { count })}`} disabled={future} onPress={() => setSelectedKey(day.key)} style={styles.cell}>
                <View style={[styles.day, { backgroundColor: color, borderColor: active ? colors.accentWarmMuted : "transparent", opacity: future ? 0.25 : 1 }]}>
                  <Text style={[textStyles.meta, { color: count ? colors.inkOnDark : colors.inkMuted, textDecorationLine: day.key === today ? "underline" : "none" }]}>{day.date.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.row, { justifyContent: "flex-end" }]}>
          <Text style={textStyles.caption}>{t("writingHistory.less")}</Text>
          {[colors.bgMuted, colors.accentWarm, colors.inkStrongAlt].map((color) => <View key={color} style={[styles.dot, { backgroundColor: color }]} />)}
          <Text style={textStyles.caption}>{t("writingHistory.more")}</Text>
        </View>
        <Text accessibilityLiveRegion="polite" style={textStyles.bodySm}>
          {selected ? `${dateLabel(selected.date)} · ${selected.activity
            ? t("writingHistory.dayDetails", { count: selected.activity.attempts, score: Math.round(selected.activity.totalScore / selected.activity.attempts), time: new Date(selected.activity.lastPracticedAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }) })
            : t(!writingActivity || selected.key < localDateKey(new Date(writingActivity.startedAt)) ? "writingHistory.untrackedDay" : "writingHistory.noActivity")}` : t("writingHistory.selectDay")}
        </Text>
        <Text style={textStyles.caption}>{t("writingHistory.historyNote")}</Text>
      </View>
    </Screen>
  );
}
