import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCharactersByCategoryQuery } from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function CharacterListScreen() {
  const { categoryKey } = useLocalSearchParams<{ categoryKey?: string }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const { getProgress } = useAppState();
  const { locale, t } = useI18n();
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ buttonStyles, colors, surfaceStyles, textStyles });
  const { data, isLoading, isError } = useKanjiCharactersByCategoryQuery(
    normalizedCategoryKey,
    locale
  );
  const selectedCategory = data?.category;
  const items = data?.characters ?? [];
  const headerTitle = selectedCategory?.label ?? t("list.title");
  const headerSubtitle = selectedCategory?.description ?? t("list.subtitle");

  return (
    <Screen>
      <Text style={styles.title}>{headerTitle}</Text>
      {headerSubtitle ? <Text style={styles.subtitle}>{headerSubtitle}</Text> : null}

      {isLoading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("common.loading")}</Text>
          <Text style={styles.emptyBody}>{t("list.loadingBody")}</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("list.errorTitle")}</Text>
          <Text style={styles.emptyBody}>{t("list.errorBody")}</Text>
        </View>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("list.emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("list.emptyBody")}</Text>
        </View>
      ) : null}

      {items.map((character, index) => (
        <Link
          key={character.id}
          href={{
            pathname: "/character/[characterId]",
            params: {
              characterId: character.id,
              categoryKey: normalizedCategoryKey,
            },
          }}
          asChild
        >
          <Pressable style={styles.card}>
            <View style={styles.left}>
              <Text style={styles.literal}>{character.literal}</Text>
              <View style={styles.content}>
                <Text style={styles.meaning}>{getCharacterMeaning(character, locale)}</Text>
                <Text style={styles.meta}>
                  {t("list.rank", { rank: index + 1 })}
                  {character.jlptLevel ? ` · ${t("common.jlpt")} ${character.jlptLevel}` : ""}
                  {character.strokeCount != null
                    ? ` · ${t("common.strokes", { count: character.strokeCount })}`
                    : ""}
                </Text>
                {getProgress(character.id) ? (
                  <Text style={styles.meta}>
                    {t("list.recentScore", {
                      score: getProgress(character.id)?.lastScore,
                      attempts: getProgress(character.id)?.attempts,
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("list.startPractice")}</Text>
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
    content: {
      flex: 1,
      gap: 3,
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
