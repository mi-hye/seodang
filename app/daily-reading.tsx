import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { usePreventRemove } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Screen } from "../src/components/common/Screen";
import { radius, spacing, useTheme } from "../src/design/theme";
import {
  DAILY_READINGS,
  ReadingLevel,
  ReadingWord,
  findReadingWord,
} from "../src/domain/reading/dailyReading";
import {
  canUnlockWithRewardedAd,
  getReadingAccess,
} from "../src/domain/reading/readingAccess";
import { getExampleKanjiIds } from "../src/domain/kanji/exampleFurigana";
import { useI18n } from "../src/i18n/useI18n";
import { useDailyReadingsQuery } from "../src/queries/dailyReadingQueries";
import { useKanjiCharactersByIdsQuery } from "../src/queries/kanjiQueries";
import { useReadingAccess } from "../src/state/ReadingAccessProvider";

const FIRST_READING_DATE = "2026-08-01";

const LEVELS: Array<{
  id: ReadingLevel;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: "beginner", icon: "leaf-outline" },
  { id: "intermediate", icon: "book-outline" },
  { id: "advanced", icon: "sparkles-outline" },
];

export default function DailyReadingScreen() {
  const { locale, t } = useI18n();
  const { colors, shadows, textStyles, surfaceStyles } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, shadows, textStyles, surfaceStyles }),
    [colors, shadows, surfaceStyles, textStyles],
  );
  const [level, setLevel] = useState<ReadingLevel>("beginner");
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [wordPopover, setWordPopover] = useState<{
    segmentIndex: number;
    tappedSurface: string;
    word: ReadingWord;
  } | null>(null);
  const [readingFlowWidth, setReadingFlowWidth] = useState(0);
  const wordLayoutsRef = useRef(
    new Map<number, { width: number; x: number }>(),
  );
  const lastTapRef = useRef<{ surface: string; tappedAt: number } | null>(null);
  const readingsQuery = useDailyReadingsQuery(selectedDate);
  const {
    isSubscribed,
    monthlyPrice,
    purchaseMonthly,
    restoreSubscription,
    rewardedLevelsForDate,
    unlockLevelWithAd,
  } = useReadingAccess();
  const rewardedLevels = rewardedLevelsForDate(selectedDate);
  const readingAccess = getReadingAccess({
    isSubscribed,
    level,
    rewardedLevels,
    selectedDate,
    today,
  });
  const canWatchAd = canUnlockWithRewardedAd({
    isSubscribed,
    level,
    rewardedLevels,
    selectedDate,
    today,
  });
  const reading = readingsQuery.data?.[level] ?? (selectedDate === today ? DAILY_READINGS[level] : undefined);
  const readingKanjiIds = useMemo(
    () => getExampleKanjiIds(reading?.body),
    [reading?.body],
  );
  const readingKanjiQuery = useKanjiCharactersByIdsQuery(readingKanjiIds);
  const readingVocabulary = useMemo(
    () => mergeKanjiDictionaryWords(
      reading?.body ?? "",
      reading?.vocabulary ?? [],
      readingKanjiQuery.data ?? [],
    ),
    [reading?.body, reading?.vocabulary, readingKanjiQuery.data],
  );
  const readingSegments = useMemo(
    () => reading ? segmentJapaneseText(reading.body, readingVocabulary) : [],
    [reading, readingVocabulary],
  );
  const dateLabel = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseLocalDate(selectedDate));

  const returnToLevelSelection = useCallback(() => {
    setHasStarted(false);
    setWordPopover(null);
    wordLayoutsRef.current.clear();
  }, []);

  usePreventRemove(hasStarted, returnToLevelSelection);

  useEffect(() => {
    setHasStarted(false);
    setWordPopover(null);
    wordLayoutsRef.current.clear();
  }, [selectedDate]);

  const selectLevel = (nextLevel: ReadingLevel) => {
    setLevel(nextLevel);
    setHasStarted(false);
    setWordPopover(null);
  };

  const startReading = () => {
    if (!reading) return;
    if (!readingAccess.allowed) {
      setShowPaywall(true);
      return;
    }
    setWordPopover(null);
    setHasStarted(true);
  };

  const watchRewardedAd = async () => {
    if (!reading || !canWatchAd || isAdLoading) return;
    setIsAdLoading(true);
    const result = await unlockLevelWithAd(selectedDate, level);
    setIsAdLoading(false);

    if (result === "earned") {
      setShowPaywall(false);
      setWordPopover(null);
      setHasStarted(true);
      return;
    }
    if (result === "dismissed") return;
    Alert.alert(
      t("dailyReading.adUnavailableTitle"),
      t(result === "unavailable" ? "dailyReading.adUnavailableBody" : "dailyReading.adErrorBody"),
    );
  };

  const purchaseSubscription = async () => {
    if (isPurchaseLoading) return;
    setIsPurchaseLoading(true);
    const result = await purchaseMonthly();
    setIsPurchaseLoading(false);
    if (result === "purchased") {
      setShowPaywall(false);
      if (reading) setHasStarted(true);
      Alert.alert(t("dailyReading.purchaseSuccessTitle"), t("dailyReading.purchaseSuccessBody"));
      return;
    }
    if (result === "cancelled") return;
    Alert.alert(
      t("dailyReading.purchaseErrorTitle"),
      t(result === "unavailable" ? "dailyReading.storeSetupBody" : "dailyReading.purchaseErrorBody"),
    );
  };

  const restoreReadingSubscription = async () => {
    if (isRestoreLoading) return;
    setIsRestoreLoading(true);
    const result = await restoreSubscription();
    setIsRestoreLoading(false);
    if (result === "restored") {
      setShowPaywall(false);
      Alert.alert(t("dailyReading.restoreSuccessTitle"), t("dailyReading.restoreSuccessBody"));
      return;
    }
    Alert.alert(
      t("dailyReading.restoreErrorTitle"),
      t(result === "empty" ? "dailyReading.restoreEmptyBody" : result === "unavailable" ? "dailyReading.storeSetupBody" : "dailyReading.purchaseErrorBody"),
    );
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) setSelectedDate(formatLocalDate(date));
  };

  const handleWordPress = (surface: string, segmentIndex: number) => {
    const tappedAt = Date.now();
    const lastTap = lastTapRef.current;
    lastTapRef.current = { surface, tappedAt };

    if (!lastTap || lastTap.surface !== surface || tappedAt - lastTap.tappedAt > 360) {
      setWordPopover(null);
      return;
    }

    if (!reading) return;
    const word = findReadingWord({ ...reading, vocabulary: readingVocabulary }, surface);
    if (word) {
      setWordPopover({
        segmentIndex,
        tappedSurface: surface,
        word,
      });
    }
  };

  const handleWordLayout = (segmentIndex: number, event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    wordLayoutsRef.current.set(segmentIndex, { width, x });
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <Text style={styles.eyebrow}>{t("dailyReading.eyebrow")}</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color={colors.accentWarm} />
            <Text style={styles.streakText}>{t("dailyReading.streak", { count: 1 })}</Text>
          </View>
        </View>
        <Text style={styles.title}>{t("dailyReading.title")}</Text>
        <Text style={styles.subtitle}>{t("dailyReading.subtitle")}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dailyReading.openCalendar")}
          onPress={() => setShowDatePicker((visible) => !visible)}
          style={({ pressed }) => [styles.dateButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.accentWarmMuted} />
          <Text style={styles.date}>{dateLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.inkFaint} />
        </Pressable>
        {showDatePicker ? (
          <View style={styles.datePickerWrap}>
            <DateTimePicker
              display={Platform.OS === "ios" ? "inline" : "calendar"}
              maximumDate={parseLocalDate(today)}
              minimumDate={parseLocalDate(FIRST_READING_DATE)}
              mode="date"
              onChange={handleDateChange}
              value={parseLocalDate(selectedDate)}
            />
            {Platform.OS === "ios" ? (
              <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDone}>
                <Text style={styles.datePickerDoneText}>{t("dailyReading.calendarDone")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {!hasStarted ? (
        <>
          <Text style={styles.sectionTitle}>{t("dailyReading.levelPrompt")}</Text>
          <View style={styles.levelList}>
            {LEVELS.map((item) => {
              const selected = level === item.id;
              const itemAccess = getReadingAccess({
                isSubscribed,
                level: item.id,
                rewardedLevels,
                selectedDate,
                today,
              });
              const itemCanWatchAd = canUnlockWithRewardedAd({
                isSubscribed,
                level: item.id,
                rewardedLevels,
                selectedDate,
                today,
              });

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => selectLevel(item.id)}
                  style={({ pressed }) => [
                    styles.levelCard,
                    selected ? styles.levelCardSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={[styles.levelIcon, selected ? styles.levelIconSelected : null]}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={selected ? colors.inkOnDark : colors.accentWarmMuted}
                    />
                  </View>
                  <View style={styles.levelContent}>
                    <View style={styles.levelTitleRow}>
                      <Text style={[styles.levelTitle, selected ? styles.levelTitleSelected : null]}>
                        {t(`dailyReading.level.${item.id}`)}
                      </Text>
                      {item.id === "beginner" ? (
                        <View style={[styles.recommendedBadge, selected ? styles.recommendedBadgeSelected : null]}>
                          <Text style={[styles.recommendedText, selected ? styles.recommendedTextSelected : null]}>
                            {t("dailyReading.recommended")}
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.accessBadge, selected ? styles.accessBadgeSelected : null]}>
                        <Ionicons
                          name={itemAccess.allowed ? "lock-open-outline" : itemCanWatchAd ? "play-circle-outline" : "lock-closed-outline"}
                          size={11}
                          color={selected ? colors.inkOnDark : colors.accentWarmMuted}
                        />
                        <Text style={[styles.accessBadgeText, selected ? styles.accessBadgeTextSelected : null]}>
                          {t(
                            itemAccess.reason === "subscription"
                              ? "dailyReading.access.subscribed"
                              : itemAccess.reason === "today_beginner"
                                ? "dailyReading.access.free"
                                : itemAccess.reason === "rewarded_ad"
                                  ? "dailyReading.access.unlocked"
                                  : itemCanWatchAd
                                    ? "dailyReading.access.ad"
                                    : "dailyReading.access.subscription",
                          )}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.levelDescription, selected ? styles.levelDescriptionSelected : null]}>
                      {t(`dailyReading.level.${item.id}Description`)}
                    </Text>
                  </View>
                  <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {readingsQuery.isLoading && selectedDate !== today ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.accentWarmMuted} />
              <Text style={styles.noticeText}>{t("dailyReading.loading")}</Text>
            </View>
          ) : reading ? <View style={[styles.previewCard, styles.shadow]}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewLabel}>{t("dailyReading.selectedDateLabel")}</Text>
                <Text style={styles.previewTitle}>{reading.title}</Text>
              </View>
              <Ionicons name="bookmark-outline" size={20} color={colors.accentWarmMuted} />
            </View>
            <Text style={styles.previewMeta}>
              {t("dailyReading.meta", {
                max: reading.maxCharacters.toLocaleString(locale === "ja" ? "ja-JP" : "ko-KR"),
                minutes: reading.minutes,
              })}
            </Text>
            <View style={styles.divider} />
            <Text numberOfLines={3} style={styles.previewBody}>
              {reading.body}
            </Text>
            {readingAccess.allowed ? (
              <Pressable
                accessibilityRole="button"
                onPress={startReading}
                style={({ pressed }) => [styles.startButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.startButtonText}>{t("dailyReading.start")}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.inkOnDark} />
              </Pressable>
            ) : (
              <View style={styles.lockedActions}>
                <View style={styles.lockedNotice}>
                  <Ionicons name="lock-closed-outline" size={17} color={colors.accentWarmMuted} />
                  <Text style={styles.lockedNoticeText}>
                    {t(
                      readingAccess.reason === "past_reading_locked"
                        ? "dailyReading.archiveLocked"
                        : "dailyReading.levelLocked",
                    )}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowPaywall(true)}
                  style={({ pressed }) => [styles.startButton, pressed ? styles.pressed : null]}
                >
                  <Ionicons name="sparkles-outline" size={17} color={colors.inkOnDark} />
                  <Text style={styles.startButtonText}>
                    {t("dailyReading.subscribeAction", { price: monthlyPrice })}
                  </Text>
                </Pressable>
                {canWatchAd ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isAdLoading}
                    onPress={watchRewardedAd}
                    style={({ pressed }) => [styles.adButton, pressed ? styles.pressed : null]}
                  >
                    {isAdLoading ? (
                      <ActivityIndicator size="small" color={colors.accentWarmMuted} />
                    ) : (
                      <Ionicons name="play-circle-outline" size={18} color={colors.accentWarmMuted} />
                    )}
                    <Text style={styles.adButtonText}>
                      {t(isAdLoading ? "dailyReading.adLoading" : "dailyReading.watchAdAction")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
            <View style={styles.noticeRow}>
              <Ionicons name="sparkles-outline" size={13} color={colors.inkFaint} />
              <Text style={styles.noticeText}>{t("dailyReading.generatedNotice")}</Text>
            </View>
          </View> : (
            <View style={styles.loadingCard}>
              <Ionicons name="document-text-outline" size={24} color={colors.inkFaint} />
              <Text style={styles.noticeText}>{t("dailyReading.notReady")}</Text>
            </View>
          )}
        </>
      ) : reading ? (
        <View style={[styles.sessionCard, styles.shadow]}>
          <View style={styles.sessionTopRow}>
            <View style={styles.sessionLevelBadge}>
              <Text style={styles.sessionLevelText}>{t(`dailyReading.level.${level}`)}</Text>
            </View>
            <Text style={styles.previewMeta}>
              {t("dailyReading.meta", {
                max: reading.maxCharacters.toLocaleString(locale === "ja" ? "ja-JP" : "ko-KR"),
                minutes: reading.minutes,
              })}
            </Text>
          </View>
          <Text style={styles.previewLabel}>{t("dailyReading.readingLabel")}</Text>
          <Text style={styles.sessionTitle}>{reading.title}</Text>
          <Text style={styles.wordHint}>{t("dailyReading.wordHint")}</Text>
          <View
            onLayout={(event) => setReadingFlowWidth(event.nativeEvent.layout.width)}
            style={styles.readingFlow}
          >
            {readingSegments.map((segment, index) =>
              segment.isWordLike ? (
                <View
                  key={`${segment.surface}-${index}`}
                  onLayout={(event) => handleWordLayout(index, event)}
                  style={[
                    styles.wordAnchor,
                    wordPopover?.segmentIndex === index ? styles.wordAnchorSelected : null,
                  ]}
                >
                  <Text
                    onPress={() => handleWordPress(segment.surface, index)}
                    style={[
                      styles.sessionBody,
                      styles.readingWord,
                      wordPopover?.segmentIndex === index ? styles.readingWordSelected : null,
                    ]}
                  >
                    {segment.surface}
                  </Text>
                  {wordPopover?.segmentIndex === index ? (
                    <InlineWordPopover
                      flowWidth={readingFlowWidth}
                      layout={wordLayoutsRef.current.get(index)}
                      styles={styles}
                      t={t}
                      tappedSurface={wordPopover.tappedSurface}
                      word={wordPopover.word}
                    />
                  ) : null}
                </View>
              ) : (
                segment.surface === "\n" ? (
                  <View key={`break-${index}`} style={styles.lineBreak} />
                ) : (
                  <Text key={`${segment.surface}-${index}`} style={styles.sessionBody}>
                    {segment.surface}
                  </Text>
                )
              ),
            )}
          </View>
          <View style={styles.translationCard}>
            <View style={styles.translationHeader}>
              <Ionicons name="language-outline" size={18} color={colors.accentWarmMuted} />
              <Text style={styles.translationTitle}>{t("dailyReading.translationTitle")}</Text>
            </View>
            <Text style={styles.translationBody}>{reading.translationKo}</Text>
          </View>
          <Pressable onPress={returnToLevelSelection} style={styles.changeLevelButton}>
            <Ionicons name="chevron-back" size={16} color={colors.accentWarmMuted} />
            <Text style={styles.changeLevelText}>{t("dailyReading.changeLevel")}</Text>
          </Pressable>
        </View>
      ) : null}

      <ReadingPaywall
        isPurchaseLoading={isPurchaseLoading}
        isRestoreLoading={isRestoreLoading}
        monthlyPrice={monthlyPrice}
        onClose={() => setShowPaywall(false)}
        onOpenPrivacy={() => {
          setShowPaywall(false);
          router.push("/privacy-policy");
        }}
        onOpenTerms={() => void Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}
        onPurchase={purchaseSubscription}
        onRestore={restoreReadingSubscription}
        styles={styles}
        t={t}
        visible={showPaywall}
      />

    </Screen>
  );
}

function ReadingPaywall({
  isPurchaseLoading,
  isRestoreLoading,
  monthlyPrice,
  onClose,
  onOpenPrivacy,
  onOpenTerms,
  onPurchase,
  onRestore,
  styles,
  t,
  visible,
}: {
  isPurchaseLoading: boolean;
  isRestoreLoading: boolean;
  monthlyPrice: string;
  onClose: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onPurchase: () => void;
  onRestore: () => void;
  styles: ReturnType<typeof createStyles>;
  t: ReturnType<typeof useI18n>["t"];
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent={Platform.OS === "android"}
      visible={visible}
    >
      <View style={styles.paywallBackdrop}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.paywallSheet}
          style={styles.paywallScroll}
        >
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.paywallClose}>
            <Ionicons name="close" size={22} color={styles.paywallCloseIcon.color} />
          </Pressable>
          <View style={styles.paywallIcon}>
            <Ionicons name="book-outline" size={30} color={styles.paywallIconGlyph.color} />
          </View>
          <Text style={styles.paywallEyebrow}>{t("dailyReading.paywallEyebrow")}</Text>
          <Text style={styles.paywallTitle}>{t("dailyReading.paywallTitle")}</Text>
          <Text style={styles.paywallBody}>{t("dailyReading.paywallBody")}</Text>
          <View style={styles.paywallBenefits}>
            {["levels", "archive", "adFree", "words"].map((benefit) => (
              <View key={benefit} style={styles.paywallBenefitRow}>
                <Ionicons name="checkmark-circle" size={18} color={styles.paywallBenefitIcon.color} />
                <Text style={styles.paywallBenefitText}>
                  {t(`dailyReading.paywallBenefit.${benefit}`)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.paywallPriceRow}>
            <Text style={styles.paywallPrice}>{monthlyPrice}</Text>
            <Text style={styles.paywallPeriod}>{t("dailyReading.perMonth")}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isPurchaseLoading}
            onPress={onPurchase}
            style={({ pressed }) => [styles.paywallPurchase, pressed ? styles.pressed : null]}
          >
            {isPurchaseLoading ? <ActivityIndicator color="#fff" /> : null}
            <Text style={styles.paywallPurchaseText}>
              {t(isPurchaseLoading ? "dailyReading.purchaseLoading" : "dailyReading.purchaseAction")}
            </Text>
          </Pressable>
          <Text style={styles.paywallRenewal}>{t("dailyReading.renewalNotice")}</Text>
          <Pressable accessibilityRole="button" disabled={isRestoreLoading} onPress={onRestore}>
            <Text style={styles.paywallRestore}>
              {t(isRestoreLoading ? "dailyReading.restoreLoading" : "dailyReading.restoreAction")}
            </Text>
          </Pressable>
          <View style={styles.paywallLegalRow}>
            <Pressable accessibilityRole="link" onPress={onOpenPrivacy}>
              <Text style={styles.paywallLegal}>{t("dailyReading.privacy")}</Text>
            </Pressable>
            <Text style={styles.paywallLegalDivider}>·</Text>
            <Pressable accessibilityRole="link" onPress={onOpenTerms}>
              <Text style={styles.paywallLegal}>{t("dailyReading.terms")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles({ colors, shadows, textStyles, surfaceStyles }: any) {
  return StyleSheet.create({
    screenContent: { paddingTop: spacing[3] },
    hero: { marginBottom: spacing[8], gap: spacing[2] },
    heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    eyebrow: textStyles.eyebrow,
    streakBadge: { flexDirection: "row", alignItems: "center", gap: spacing[1], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.pill, backgroundColor: colors.bgMuted },
    streakText: { ...textStyles.meta, color: colors.accentWarmMuted },
    title: textStyles.displayLg,
    subtitle: textStyles.bodyMd,
    dateButton: { alignSelf: "flex-start", marginTop: spacing[1], flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.bgSurface },
    date: { ...textStyles.meta, color: colors.inkStrong },
    datePickerWrap: { marginTop: spacing[2], borderRadius: radius.md, padding: spacing[2], backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSoft, overflow: "hidden" },
    datePickerDone: { alignSelf: "flex-end", paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
    datePickerDoneText: { ...textStyles.buttonLabel, color: colors.accentWarmMuted },
    sectionTitle: { ...textStyles.titleMd, marginBottom: spacing[3] },
    levelList: { gap: spacing[2], marginBottom: spacing[6] },
    levelCard: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: 76, padding: spacing[4], borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.bgSurface },
    levelCardSelected: { backgroundColor: colors.inkStrongAlt, borderColor: colors.inkStrongAlt },
    levelIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgMuted },
    levelIconSelected: { backgroundColor: colors.accentWarm },
    levelContent: { flex: 1, gap: spacing[1] },
    levelTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], flexWrap: "wrap" },
    levelTitle: textStyles.titleSm,
    levelTitleSelected: { color: colors.inkOnDark },
    levelDescription: textStyles.caption,
    levelDescriptionSelected: { color: colors.inkOnDarkMuted },
    recommendedBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.bgMuted },
    recommendedBadgeSelected: { backgroundColor: colors.accentWarm },
    recommendedText: { ...textStyles.meta, fontSize: 10, color: colors.accentWarmMuted },
    recommendedTextSelected: { color: colors.inkOnDark },
    accessBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.bgMuted },
    accessBadgeSelected: { backgroundColor: colors.inkStrong },
    accessBadgeText: { ...textStyles.meta, fontSize: 10, color: colors.accentWarmMuted },
    accessBadgeTextSelected: { color: colors.inkOnDark },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "center" },
    radioSelected: { borderColor: colors.accentWarm },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentWarm },
    previewCard: { ...surfaceStyles.card, padding: spacing[6], gap: spacing[3] },
    loadingCard: { ...surfaceStyles.mutedCard, minHeight: 140, alignItems: "center", justifyContent: "center", gap: spacing[3], padding: spacing[6] },
    previewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing[3] },
    previewLabel: { ...textStyles.meta, color: colors.accentWarmMuted, marginBottom: spacing[1] },
    previewTitle: textStyles.titleMd,
    previewMeta: textStyles.meta,
    divider: { height: 1, backgroundColor: colors.borderSoft },
    previewBody: textStyles.bodyMd,
    startButton: { marginTop: spacing[1], paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: radius.pill, backgroundColor: colors.accentWarm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2] },
    startButtonText: { ...textStyles.buttonLabel, color: colors.inkOnDark },
    lockedActions: { gap: spacing[2] },
    lockedNotice: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2], padding: spacing[3], borderRadius: radius.sm, backgroundColor: colors.bgMuted },
    lockedNoticeText: { ...textStyles.bodySm, color: colors.inkBody, flex: 1 },
    adButton: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.accentWarmMuted, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2] },
    adButtonText: { ...textStyles.buttonLabel, color: colors.accentWarmMuted },
    noticeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[1] },
    noticeText: textStyles.meta,
    sessionCard: { ...surfaceStyles.card, padding: spacing[6], gap: spacing[4] },
    sessionTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[3] },
    sessionLevelBadge: { backgroundColor: colors.inkStrongAlt, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.pill },
    sessionLevelText: { ...textStyles.meta, color: colors.inkOnDark },
    sessionTitle: textStyles.displaySm,
    sessionBody: { ...textStyles.bodyMd, lineHeight: 28 },
    readingFlow: { position: "relative", flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" },
    wordAnchor: { position: "relative", zIndex: 2, overflow: "visible", borderBottomWidth: 1, borderBottomColor: colors.accentWarmMuted },
    wordAnchorSelected: { zIndex: 1000, elevation: 12, borderBottomColor: colors.accentWarm },
    lineBreak: { width: "100%", height: spacing[2] },
    wordHint: { ...textStyles.meta, color: colors.accentWarmMuted },
    readingWord: {},
    readingWordSelected: { color: colors.accentWarmMuted, backgroundColor: colors.bgMuted },
    wordPopover: { position: "absolute", top: -113, left: 0, width: 220, height: 112, zIndex: 1000, elevation: 12, overflow: "visible" },
    wordPopoverContent: { height: "100%", justifyContent: "center", backgroundColor: colors.accentWarm, borderRadius: radius.sm, paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[1], ...shadows.card },
    wordPopoverHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing[2] },
    wordPopoverTail: { position: "absolute", top: "100%", transform: [{ translateY: -3 }], width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: colors.accentWarm },
    wordSurface: { ...textStyles.titleMd, color: colors.inkOnDark, flexShrink: 1 },
    wordReading: { ...textStyles.bodyMd, color: colors.inkOnDark, fontWeight: "700" },
    wordMeaning: { ...textStyles.bodySm, color: colors.inkOnDarkMuted },
    dictionaryBadge: { flexShrink: 0, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: colors.inkStrongAlt, paddingHorizontal: spacing[2], paddingVertical: 2 },
    dictionaryBadgeText: { ...textStyles.meta, color: colors.inkOnDark, fontSize: 10 },
    translationCard: { ...surfaceStyles.mutedCard, padding: spacing[5], gap: spacing[3] },
    translationHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
    translationTitle: textStyles.titleSm,
    translationBody: { ...textStyles.bodyMd, lineHeight: 26 },
    changeLevelButton: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing[1], padding: spacing[2] },
    changeLevelText: { ...textStyles.buttonLabel, color: colors.accentWarmMuted },
    paywallBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: Platform.OS === "android" ? "rgba(0,0,0,0.45)" : colors.bgCanvas },
    paywallScroll: { width: "100%", maxHeight: Platform.OS === "android" ? "92%" : "100%", backgroundColor: colors.bgCanvas, borderTopLeftRadius: Platform.OS === "android" ? radius.lg : 0, borderTopRightRadius: Platform.OS === "android" ? radius.lg : 0 },
    paywallSheet: { flexGrow: 1, minHeight: Platform.OS === "android" ? 620 : "100%", justifyContent: "center", paddingHorizontal: spacing[7], paddingVertical: spacing[8], gap: spacing[3] },
    paywallClose: { position: "absolute", top: spacing[5], right: spacing[5], width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgMuted },
    paywallCloseIcon: { color: colors.inkStrong },
    paywallIcon: { width: 64, height: 64, alignSelf: "center", borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgMuted },
    paywallIconGlyph: { color: colors.accentWarmMuted },
    paywallEyebrow: { ...textStyles.eyebrow, textAlign: "center", color: colors.accentWarmMuted },
    paywallTitle: { ...textStyles.displayMd, textAlign: "center" },
    paywallBody: { ...textStyles.bodyMd, textAlign: "center", color: colors.inkBody },
    paywallBenefits: { gap: spacing[2], marginVertical: spacing[2] },
    paywallBenefitRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
    paywallBenefitIcon: { color: colors.accentWarmMuted },
    paywallBenefitText: { ...textStyles.bodySm, color: colors.inkStrong },
    paywallPriceRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: spacing[1], marginTop: spacing[1] },
    paywallPrice: { ...textStyles.displayMd, color: colors.inkStrong },
    paywallPeriod: { ...textStyles.bodySm, color: colors.inkMuted, paddingBottom: 3 },
    paywallPurchase: { minHeight: 52, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2], backgroundColor: colors.accentWarm, paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
    paywallPurchaseText: { ...textStyles.buttonLabel, color: colors.inkOnDark },
    paywallRenewal: { ...textStyles.caption, textAlign: "center", color: colors.inkMuted },
    paywallRestore: { ...textStyles.buttonLabel, textAlign: "center", color: colors.accentWarmMuted, padding: spacing[2] },
    paywallLegalRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2] },
    paywallLegal: { ...textStyles.caption, color: colors.inkMuted, textDecorationLine: "underline" },
    paywallLegalDivider: { ...textStyles.caption, color: colors.inkFaint },
    shadow: shadows.card,
    pressed: { opacity: 0.72 },
  });
}

function InlineWordPopover({
  flowWidth,
  layout,
  styles,
  t,
  tappedSurface,
  word,
}: {
  flowWidth: number;
  layout?: { width: number; x: number };
  styles: ReturnType<typeof createStyles>;
  t: ReturnType<typeof useI18n>["t"];
  tappedSurface: string;
  word: ReadingWord;
}) {
  const width = getWordPopoverWidth(word);
  const anchorX = layout?.x ?? 0;
  const anchorWidth = layout?.width ?? 0;
  const availableRight = flowWidth - anchorX;
  const left = Math.max(-anchorX, Math.min(0, availableRight - width));
  const tailLeft = Math.min(
    width - 30,
    Math.max(10, -left + anchorWidth / 2 - 10),
  );

  return (
    <View style={[styles.wordPopover, { left, width }]}>
      <View style={styles.wordPopoverContent}>
        <View style={styles.wordPopoverHeader}>
          <Text numberOfLines={1} style={styles.wordSurface}>{word.surface}</Text>
          {word.forms?.includes(tappedSurface) ? (
            <View style={styles.dictionaryBadge}>
              <Text style={styles.dictionaryBadgeText}>
                {t("dailyReading.dictionaryForm")}
              </Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.wordReading}>{word.reading}</Text>
        <Text numberOfLines={2} style={styles.wordMeaning}>{word.meaningKo}</Text>
      </View>
      <View style={[styles.wordPopoverTail, { left: tailLeft }]} />
    </View>
  );
}

function getWordPopoverWidth(word: ReadingWord) {
  const headerWidth =
    word.surface.length * 24 + (word.forms?.length ? 54 + spacing[2] : 0);
  const contentWidth = Math.max(
    headerWidth,
    word.reading.length * 17,
    word.meaningKo.length * 15,
  );

  return Math.min(220, Math.max(84, contentWidth + spacing[8]));
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

type JapaneseSegment = { surface: string; isWordLike: boolean };

function mergeKanjiDictionaryWords(
  body: string,
  vocabulary: ReadingWord[],
  characters: Array<{
    metadata: {
      words?: Array<{
        meaningKo?: string | null;
        reading: string;
        word: string;
      }>;
    } | null;
  }>,
) {
  const standaloneTokens = getJapaneseWordTokens(body);
  const filteredVocabulary = vocabulary.filter(
    (word) =>
      !/^\p{Script=Han}$/u.test(word.surface) ||
      standaloneTokens.has(word.surface),
  );
  const existingSurfaces = new Set(filteredVocabulary.map((word) => word.surface));
  const dictionaryWords = characters
    .flatMap((character) => character.metadata?.words ?? [])
    .filter((word) =>
      Boolean(
        word.word &&
        word.reading &&
        word.meaningKo &&
        body.includes(word.word) &&
        standaloneTokens.has(word.word),
      ),
    )
    .sort((left, right) => right.word.length - left.word.length);
  const additions: ReadingWord[] = [];

  for (const word of dictionaryWords) {
    if (existingSurfaces.has(word.word)) continue;
    existingSurfaces.add(word.word);
    additions.push({
      surface: word.word,
      reading: word.reading,
      meaningKo: word.meaningKo ?? "",
    });
  }

  return [...filteredVocabulary, ...additions];
}

function getJapaneseWordTokens(text: string) {
  type Segment = { segment: string; isWordLike?: boolean };
  type SegmenterConstructor = new (
    locale: string,
    options: { granularity: "word" },
  ) => { segment(value: string): Iterable<Segment> };
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  if (!Segmenter) return new Set<string>();

  return new Set(
    Array.from(new Segmenter("ja", { granularity: "word" }).segment(text))
      .filter((part) => part.isWordLike)
      .map((part) => part.segment),
  );
}

function segmentJapaneseText(text: string, vocabulary: ReadingWord[]): JapaneseSegment[] {
  const surfaces = [
    ...new Set(
      vocabulary.flatMap((word) => [word.surface, ...(word.forms ?? [])]),
    ),
  ].sort(
    (left, right) => right.length - left.length,
  );
  const segments: JapaneseSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchedSurface = surfaces.find((surface) => text.startsWith(surface, cursor));
    if (matchedSurface) {
      segments.push({ surface: matchedSurface, isWordLike: true });
      cursor += matchedSurface.length;
      continue;
    }

    segments.push({ surface: text[cursor], isWordLike: false });
    cursor += 1;
  }

  return segments;
}
