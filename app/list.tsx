import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning } from "../src/data/characters";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCategoryGroupsQuery } from "../src/queries/useKanjiCategoryGroupsQuery";
import { useKanjiCharactersByCategoryQuery } from "../src/queries/useKanjiCharactersByCategoryQuery";
import { useAppState } from "../src/state/AppStateProvider";

export default function CharacterListScreen() {
  const { categoryKey } = useLocalSearchParams<{ categoryKey?: string }>();
  const normalizedCategoryKey = Array.isArray(categoryKey) ? categoryKey[0] : categoryKey;
  const { getProgress } = useAppState();
  const { locale, t } = useI18n();
  const { surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ surfaceStyles, textStyles });
  const categoryGroupsQuery = useKanjiCategoryGroupsQuery();
  const charactersQuery = useKanjiCharactersByCategoryQuery(normalizedCategoryKey);
  const selectedCategory = (categoryGroupsQuery.data ?? [])
    .flatMap((group) => group.categories)
    .find((category) => category.categoryKey === normalizedCategoryKey);

  return (
    <Screen>
      <Text style={styles.title}>
        {selectedCategory
          ? locale === "ja"
            ? selectedCategory.labelJa
            : selectedCategory.labelKo
          : t("list.title")}
      </Text>
      <Text style={styles.subtitle}>
        {selectedCategory
          ? locale === "ja"
            ? selectedCategory.descriptionJa ?? t("list.subtitle")
            : selectedCategory.descriptionKo ?? t("list.subtitle")
          : t("list.subtitle")}
      </Text>

      {selectedCategory ? (
        <View style={styles.filters}>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>
              {locale === "ja" ? selectedCategory.labelJa : selectedCategory.labelKo}
            </Text>
          </View>
        </View>
      ) : null}

      {charactersQuery.isLoading ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{t("common.loading")}</Text>
          <Text style={styles.placeholderBody}>{t("list.loadingBody")}</Text>
        </View>
      ) : null}

      {charactersQuery.isError ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{t("list.errorTitle")}</Text>
          <Text style={styles.placeholderBody}>{t("list.errorBody")}</Text>
        </View>
      ) : null}

      {!charactersQuery.isLoading && !charactersQuery.isError && !charactersQuery.data?.length ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{t("list.emptyTitle")}</Text>
          <Text style={styles.placeholderBody}>{t("list.emptyBody")}</Text>
        </View>
      ) : null}

      {(charactersQuery.data ?? []).map((character) => (
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
            <Text style={styles.literal}>{character.literal}</Text>
            <View style={styles.content}>
              <Text style={styles.meaning}>{getCharacterMeaning(character, locale)}</Text>
              <Text style={styles.reading}>
                {t("list.onyomi")} {character.onyomi.join(", ") || "-"} · {t("list.kunyomi")}{" "}
                {character.kunyomi.join(", ") || "-"}
              </Text>
              <Text style={styles.meta}>
                {character.strokeCount != null
                  ? t("common.strokes", { count: character.strokeCount })
                  : "-"}
                {character.jlptLevel ? ` · ${t("common.jlpt")} ${character.jlptLevel}` : ""}
              </Text>
              {getProgress(character.id) ? (
                <Text style={styles.progressMeta}>
                  {t("list.recentScore", {
                    score: getProgress(character.id)?.lastScore,
                    attempts: getProgress(character.id)?.attempts,
                  })}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

function createStyles({ surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    title: {
      ...textStyles.displayMd,
      marginBottom: spacing[2],
    },
    subtitle: {
      ...textStyles.bodySm,
      marginBottom: 18,
    },
    filters: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
      marginBottom: spacing[6],
    },
    filterChip: {
      ...surfaceStyles.card,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    filterText: textStyles.meta,
    placeholderCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      marginBottom: spacing[6],
      gap: spacing[2],
    },
    placeholderTitle: textStyles.titleMd,
    placeholderBody: textStyles.bodySm,
    card: {
      ...surfaceStyles.card,
      padding: 18,
      marginBottom: 12,
      flexDirection: "row",
      gap: 16,
      alignItems: "center",
    },
    literal: {
      width: 52,
      textAlign: "center",
      ...textStyles.glyphSm,
      fontSize: 30,
    },
    content: {
      flex: 1,
      gap: 5,
    },
    meaning: {
      ...textStyles.titleSm,
    },
    reading: textStyles.caption,
    meta: textStyles.meta,
    progressMeta: textStyles.meta,
  });
}
