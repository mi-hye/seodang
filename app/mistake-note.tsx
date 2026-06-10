import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CharacterCardSkeleton } from "../src/components/common/CharacterCardSkeleton";
import { FocusedReviewActionCard } from "../src/components/common/FocusedReviewActionCard";
import { ProLockedCard } from "../src/components/common/ProLockedCard";
import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { canAccessProFeature } from "../src/domain/pro/proAccess";
import { buildMistakeNote } from "../src/domain/review/mistakeNote";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByIdsQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function MistakeNoteScreen() {
  const { hydrated, isPro, progressByCharacter } = useAppState();
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const note = buildMistakeNote(progressByCharacter);
  const { data: mistakeCharacters = [], isFetching, isLoading } =
    useKanjiCharactersByIdsQuery(note.mistakeCharacterIds);
  const canViewMistakeNote = canAccessProFeature({
    feature: "mistake_note",
    isPro,
  });
  const isPreparingList =
    !hydrated ||
    (note.mistakeCharacterIds.length > 0 &&
      mistakeCharacters.length === 0 &&
      (isLoading || isFetching));
  const conquestRate =
    note.mistakeCharacters > 0
      ? Math.round((note.conqueredMistakeCharacters / note.mistakeCharacters) * 100)
      : 0;

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
    <Screen>
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
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard
          label={t("mistakeNote.totalMistakes")}
          styles={styles}
          value={note.mistakeCharacters}
        />
        <SummaryCard
          label={t("mistakeNote.repeatedMistakes")}
          styles={styles}
          value={note.repeatedMistakeCharacters}
        />
        <SummaryCard
          label={t("mistakeNote.conqueredMistakes")}
          styles={styles}
          value={note.conqueredMistakeCharacters}
        />
      </View>

      {isPreparingList ? <CharacterCardSkeleton /> : null}

      {hydrated && !isPreparingList ? (
        <FocusedReviewActionCard
          body={t("mistakeNote.practiceBody", {
            count: note.practiceCharacterIds.length,
          })}
          characterIds={note.practiceCharacterIds}
          icon="trophy-outline"
          isPro={isPro}
          title={t("mistakeNote.practiceTitle")}
        />
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
            const conquered = (progress?.failures ?? 0) > 0 && progress.lastScore >= 60;

            return (
              <Pressable
                key={character.id}
                style={[styles.characterCard, styles.shadow]}
                onPress={() =>
                  router.push({
                    pathname: "/character/[characterId]",
                    params: { characterId: character.id },
                  })
                }
              >
                <Text style={styles.literal}>{character.literal}</Text>
                <View style={styles.content}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.meaning}>
                      {getCharacterMeaning(character, locale)}
                    </Text>
                    <View
                      style={[
                        styles.statusChip,
                        conquered ? styles.conqueredChip : styles.activeChip,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          conquered ? styles.conqueredChipText : null,
                        ]}
                      >
                        {conquered
                          ? t("mistakeNote.statusConquered")
                          : t("mistakeNote.statusActive")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>
                    {t("mistakeNote.cardMeta", {
                      failures: progress?.failures ?? 0,
                      score: progress?.lastScore ?? 0,
                    })}
                  </Text>
                  <Text style={styles.subMeta}>
                    {t(
                      conquered
                        ? "mistakeNote.cardConqueredHint"
                        : "mistakeNote.cardActiveHint",
                    )}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.accentWarmMuted}
                />
              </Pressable>
            );
          })
        : null}
    </Screen>
  );
}

function SummaryCard({
  label,
  styles,
  value,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: number;
}) {
  return (
    <View style={[styles.summaryCard, styles.shadow]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
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
    summaryGrid: {
      flexDirection: "row",
      gap: spacing[2],
      marginBottom: spacing[4],
    },
    summaryCard: {
      ...surfaceStyles.card,
      flex: 1,
      minHeight: 100,
      padding: spacing[4],
      justifyContent: "space-between",
    },
    summaryValue: {
      ...textStyles.displaySm,
      color: colors.accentWarmMuted,
    },
    summaryLabel: textStyles.meta,
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[2],
    },
    emptyTitle: textStyles.titleSm,
    emptyBody: textStyles.bodySm,
    characterCard: {
      ...surfaceStyles.card,
      padding: spacing[5],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    literal: {
      ...textStyles.glyphSm,
      width: 40,
      textAlign: "center",
    },
    content: {
      flex: 1,
      gap: spacing[1],
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    meaning: {
      ...textStyles.titleSm,
      flex: 1,
    },
    meta: textStyles.meta,
    subMeta: {
      ...textStyles.caption,
      color: colors.inkMuted,
    },
    statusChip: {
      borderRadius: 999,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      backgroundColor: colors.bgMuted,
    },
    activeChip: {
      backgroundColor: colors.bgMuted,
    },
    conqueredChip: {
      backgroundColor: colors.inkStrongAlt,
    },
    statusChipText: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
    conqueredChipText: {
      color: colors.inkOnDark,
    },
    shadow: shadows.card,
  });
}
