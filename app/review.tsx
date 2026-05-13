import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function ReviewScreen() {
  const { getProgress, getReviewCharacters, hydrated } = useAppState();
  const items = getReviewCharacters();
  const { locale, t } = useI18n();
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ buttonStyles, colors, surfaceStyles, textStyles });

  return (
    <Screen>
      <Text style={styles.title}>{t("review.title")}</Text>
      <Text style={styles.subtitle}>{t("review.subtitle")}</Text>

      {hydrated && items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("review.emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("review.emptyBody")}</Text>
        </View>
      ) : null}

      {items.map((character, index) => (
        <Link key={character.id} href={`/practice/${character.id}`} asChild>
          <Pressable style={styles.card}>
            <View style={styles.left}>
              <Text style={styles.literal}>{character.literal}</Text>
              <View>
                <Text style={styles.meaning}>{getCharacterMeaning(character, locale)}</Text>
                <Text style={styles.meta}>
                  {t("review.priority", {
                    priority: index + 1,
                    failures: getProgress(character.id)?.failures ?? 0,
                    score: getProgress(character.id)?.lastScore ?? "-",
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("review.retryWrite")}</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

function createStyles({
  buttonStyles,
  colors,
  surfaceStyles,
  textStyles,
}: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[2],
    },
    subtitle: {
      ...textStyles.bodySm,
      marginBottom: spacing[6],
    },
    emptyCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      marginBottom: 12,
      gap: 6,
    },
    emptyTitle: textStyles.titleSm,
    emptyBody: textStyles.bodySm,
    card: {
      ...surfaceStyles.card,
      padding: 18,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flex: 1,
    },
    literal: {
      ...textStyles.glyphSm,
      width: 42,
      textAlign: "center",
    },
    meaning: textStyles.titleSm,
    meta: {
      ...textStyles.meta,
      marginTop: 3,
    },
    badge: {
      ...buttonStyles.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    badgeText: {
      color: colors.inkOnDark,
      fontSize: 12,
      fontWeight: "800",
    },
  });
}
