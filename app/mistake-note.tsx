import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CharacterCardSkeleton } from "../src/components/common/CharacterCardSkeleton";
import { FocusedCharacterCard } from "../src/components/common/FocusedCharacterCard";
import { FocusedReviewActionCard } from "../src/components/common/FocusedReviewActionCard";
import { ProLockedCard } from "../src/components/common/ProLockedCard";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { canAccessProFeature } from "../src/domain/pro/proAccess";
import {
  buildMistakeNote,
  buildMistakeNoteBadges,
  buildMistakeNoteRank,
  getMistakeNoteTabCharacterIds,
  MISTAKE_CONQUERED_SCORE_THRESHOLD,
  type MistakeNoteTab,
} from "../src/domain/review/mistakeNote";
import { useCharacterListWindow } from "../src/hooks/useCharacterListWindow";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByIdsQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function MistakeNoteScreen() {
  const { hydrated, isPro, progressByCharacter } = useAppState();
  const [activeTab, setActiveTab] = useState<MistakeNoteTab>("all");
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const note = buildMistakeNote(progressByCharacter);
  const tabItems = useMemo(
    () => [
      {
        count: note.mistakeCharacters,
        label: t("mistakeNote.tab.all"),
        value: "all" as const,
      },
      {
        count: note.repeatedMistakeCharacters,
        label: t("mistakeNote.tab.repeated"),
        value: "repeated" as const,
      },
      {
        count: note.conqueredMistakeCharacters,
        label: t("mistakeNote.tab.conquered"),
        value: "conquered" as const,
      },
    ],
    [
      note.conqueredMistakeCharacters,
      note.mistakeCharacters,
      note.repeatedMistakeCharacters,
      t,
    ],
  );
  const selectedMistakeCharacterIds = getMistakeNoteTabCharacterIds(
    note,
    activeTab,
  );
  const {
    handleListScroll,
    visibleCharacterIds: visibleMistakeCharacterIds,
  } = useCharacterListWindow(selectedMistakeCharacterIds);
  const { data: mistakeCharacters = [], isFetching, isLoading } =
    useKanjiCharactersByIdsQuery(visibleMistakeCharacterIds);
  const canViewMistakeNote = canAccessProFeature({
    feature: "mistake_note",
    isPro,
  });
  const isPreparingList =
    !hydrated ||
    (visibleMistakeCharacterIds.length > 0 &&
      mistakeCharacters.length === 0 &&
      (isLoading || isFetching));
  const conquestRate =
    note.mistakeCharacters > 0
      ? Math.round((note.conqueredMistakeCharacters / note.mistakeCharacters) * 100)
      : 0;
  const badges = buildMistakeNoteBadges(note.conqueredMistakeCharacters);
  const rank = buildMistakeNoteRank(note.conqueredMistakeCharacters);

  if (!canViewMistakeNote) {
    return (
      <Screen>
        <Text style={styles.title}>{t("mistakeNote.title")}</Text>
        <ProLockedCard
          body={t("mistakeNote.lockedBody")}
          title={t("mistakeNote.lockedTitle")}
          viewProLabel={t("reviewStats.viewPro")}
        />
      </Screen>
    );
  }

  return (
    <Screen onScroll={handleListScroll} scrollEventThrottle={16}>
      <Text style={styles.title}>{t("mistakeNote.title")}</Text>

      <View style={[styles.heroCard, styles.shadow]}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="trophy-outline" size={22} color={colors.inkOnDark} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t("mistakeNote.heroTitle")}</Text>
            <Text style={styles.heroBody}>
              {t("mistakeNote.heroBody", {
                conquered: note.conqueredMistakeCharacters,
                total: note.mistakeCharacters,
              })}
            </Text>
          </View>
          <Text style={styles.heroRate}>{conquestRate}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(0, Math.min(100, conquestRate))}%` },
            ]}
          />
        </View>
        <View style={styles.rankCard}>
          <View style={styles.rankCopy}>
            <Text style={styles.rankLabel}>{t("mistakeNote.rankLabel")}</Text>
            <Text style={styles.rankTitle}>{t(rank.titleKey)}</Text>
          </View>
          <Text style={styles.rankNext}>
            {rank.nextTitleKey
              ? t("mistakeNote.rankNext", {
                  count: rank.remainingToNext,
                  rank: t(rank.nextTitleKey),
                })
              : t("mistakeNote.rankMax")}
          </Text>
        </View>
      </View>

      <View style={[styles.badgeSection, styles.shadow]}>
        <Text style={styles.sectionTitle}>{t("mistakeNote.badgesTitle")}</Text>
        <View style={styles.badgeList}>
          {badges.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                badge.achieved ? styles.badgeCardAchieved : null,
              ]}
            >
              <View
                style={[
                  styles.badgeIcon,
                  badge.achieved ? styles.badgeIconAchieved : null,
                ]}
              >
                <Ionicons
                  name={badge.achieved ? "medal-outline" : "lock-closed-outline"}
                  size={18}
                  color={
                    badge.achieved ? colors.inkOnDark : colors.accentWarmMuted
                  }
                />
              </View>
              <View style={styles.badgeCopy}>
                <Text
                  style={[
                    styles.badgeTitle,
                    badge.achieved ? styles.badgeTitleAchieved : null,
                  ]}
                >
                  {t(badge.titleKey)}
                </Text>
                <Text style={styles.badgeBody}>{t(badge.bodyKey)}</Text>
                <View style={styles.badgeProgressHeader}>
                  <Text style={styles.badgeProgressText}>
                    {badge.current} / {badge.threshold}
                  </Text>
                  <Text style={styles.badgeProgressText}>
                    {badge.achieved
                      ? `${badge.progressPercent}%`
                      : t("mistakeNote.badgeRemaining", {
                          count: badge.remaining,
                        })}
                  </Text>
                </View>
                <View style={styles.badgeProgressTrack}>
                  <View
                    style={[
                      styles.badgeProgressFill,
                      { width: `${badge.progressPercent}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.tabList}>
        {tabItems.map((tab) => {
          const selected = activeTab === tab.value;

          return (
            <Pressable
              accessibilityRole="button"
              key={tab.value}
              onPress={() => setActiveTab(tab.value)}
              style={[styles.tabButton, selected ? styles.tabButtonActive : null]}
            >
              <Text
                style={[styles.tabLabel, selected ? styles.tabLabelActive : null]}
              >
                {tab.label}
              </Text>
              <Text
                style={[styles.tabCount, selected ? styles.tabCountActive : null]}
              >
                {tab.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isPreparingList ? <CharacterCardSkeleton /> : null}

      {hydrated && !isPreparingList ? (
        <FocusedReviewActionCard
          body={t("mistakeNote.practiceBody", {
            count: selectedMistakeCharacterIds.length,
          })}
          characterIds={selectedMistakeCharacterIds}
          icon="trophy-outline"
          isPro={isPro}
          title={t("mistakeNote.practiceTitle")}
        />
      ) : null}

      {hydrated &&
      !isPreparingList &&
      selectedMistakeCharacterIds.length > visibleMistakeCharacterIds.length ? (
        <Text style={styles.listCountMeta}>
          {t("mistakeNote.listCount", {
            visible: visibleMistakeCharacterIds.length,
            total: selectedMistakeCharacterIds.length,
          })}
        </Text>
      ) : null}

      {hydrated && !isPreparingList && mistakeCharacters.length === 0 ? (
        <View style={[styles.emptyCard, styles.shadow]}>
          <Text style={styles.emptyTitle}>{t("mistakeNote.emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("mistakeNote.emptyBody")}</Text>
        </View>
      ) : null}

      {!isPreparingList
        ? mistakeCharacters.map((character) => {
            const progress = progressByCharacter[character.id];
            const conquered =
              (progress?.failures ?? 0) > 0 &&
              progress.lastScore >= MISTAKE_CONQUERED_SCORE_THRESHOLD;

            return (
              <FocusedCharacterCard
                characterId={character.id}
                key={character.id}
                literal={character.literal}
                meaning={getCharacterMeaning(character, locale)}
                meta={t("mistakeNote.cardMeta", {
                  failures: progress?.failures ?? 0,
                  score: progress?.lastScore ?? 0,
                })}
                statusLabel={
                  conquered
                    ? t("mistakeNote.statusConquered")
                    : t("mistakeNote.statusActive")
                }
                statusTone={conquered ? "conquered" : "active"}
                subMeta={t(
                  conquered
                    ? "mistakeNote.cardConqueredHint"
                    : "mistakeNote.cardActiveHint",
                )}
              />
            );
          })
        : null}
    </Screen>
  );
}

function createStyles({ colors, surfaceStyles, textStyles, shadows }: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[6],
    },
    heroCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      gap: spacing[4],
      marginBottom: spacing[4],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentWarmMuted,
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
    },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inkStrongAlt,
    },
    heroCopy: {
      flex: 1,
      gap: spacing[1],
    },
    heroTitle: textStyles.titleMd,
    heroBody: textStyles.bodySm,
    heroRate: {
      ...textStyles.displaySm,
      color: colors.accentWarmMuted,
    },
    progressTrack: {
      height: 12,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.bgMuted,
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accentWarmMuted,
    },
    rankCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
      borderRadius: 8,
      padding: spacing[3],
      backgroundColor: colors.bgMuted,
    },
    rankCopy: {
      flex: 1,
      gap: spacing[1],
    },
    rankLabel: textStyles.meta,
    rankTitle: {
      ...textStyles.titleMd,
      color: colors.accentWarmMuted,
    },
    rankNext: {
      ...textStyles.meta,
      flexShrink: 1,
      textAlign: "right",
    },
    badgeSection: {
      ...surfaceStyles.card,
      padding: spacing[5],
      gap: spacing[3],
      marginBottom: spacing[4],
    },
    sectionTitle: textStyles.titleMd,
    badgeList: {
      gap: spacing[2],
    },
    badgeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
      borderRadius: 8,
      padding: spacing[3],
      backgroundColor: colors.bgMuted,
      opacity: 0.72,
    },
    badgeCardAchieved: {
      opacity: 1,
      backgroundColor: colors.bgSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentWarmMuted,
    },
    badgeIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgMutedStrong,
    },
    badgeIconAchieved: {
      backgroundColor: colors.inkStrongAlt,
    },
    badgeCopy: {
      flex: 1,
      gap: spacing[1],
    },
    badgeTitle: textStyles.titleSm,
    badgeTitleAchieved: {
      color: colors.accentWarmMuted,
    },
    badgeBody: textStyles.meta,
    badgeProgressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing[2],
      marginTop: spacing[1],
    },
    badgeProgressText: {
      ...textStyles.meta,
      color: colors.inkMuted,
    },
    badgeProgressTrack: {
      height: 8,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.bgMutedStrong,
    },
    badgeProgressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accentWarmMuted,
    },
    tabList: {
      flexDirection: "row",
      gap: spacing[2],
      marginBottom: spacing[3],
    },
    tabButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      justifyContent: "center",
      gap: spacing[1],
      backgroundColor: colors.bgSurface,
    },
    tabButtonActive: {
      borderColor: colors.accentWarmMuted,
      backgroundColor: colors.bgMuted,
    },
    tabLabel: {
      ...textStyles.meta,
      color: colors.inkMuted,
    },
    tabLabelActive: {
      color: colors.inkStrong,
    },
    tabCount: {
      ...textStyles.titleSm,
      color: colors.inkStrong,
    },
    tabCountActive: {
      color: colors.accentWarmMuted,
    },
    listCountMeta: {
      ...textStyles.meta,
      marginBottom: spacing[3],
      textAlign: "right",
    },
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[2],
    },
    emptyTitle: textStyles.titleSm,
    emptyBody: textStyles.bodySm,
    shadow: shadows.card,
  });
}
