import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { radius, spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useKanjiCategoryGroupsQuery } from "../src/queries/kanjiQueries";

export default function CategoriesScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { data, isLoading, isError } = useKanjiCategoryGroupsQuery(locale);
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });
  const visibleGroups = (data ?? [])
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) =>
        category.visibleLocales.includes(locale)
      ),
    }))
    .filter((group) => group.categories.length > 0);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>{t("categories.title")}</Text>
        <Text style={styles.subtitle}>{t("categories.subtitle")}</Text>
      </View>

      {isLoading ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{t("common.loading")}</Text>
          <Text style={styles.placeholderBody}>{t("categories.loadingBody")}</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{t("categories.errorTitle")}</Text>
          <Text style={styles.placeholderBody}>{t("categories.errorBody")}</Text>
        </View>
      ) : null}

      {!isLoading && !isError && !visibleGroups.length ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{t("categories.emptyTitle")}</Text>
          <Text style={styles.placeholderBody}>{t("categories.emptyBody")}</Text>
        </View>
      ) : null}

      {!isLoading && !isError
        ? visibleGroups.map((group) => (
            <View key={group.id} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>
                  {group.label}
                </Text>
                {group.description ? <Text style={styles.groupBody}>{group.description}</Text> : null}
              </View>

                <View style={styles.chipRow}>
                  {group.categories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={styles.categoryChip}
                      onPress={() =>
                        router.push({
                          pathname: "/list",
                          params: { categoryKey: category.categoryKey },
                        })
                      }
                    >
                      <Text style={styles.categoryChipText}>
                        {category.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
            </View>
          ))
        : null}
    </Screen>
  );
}

function createStyles({
  colors,
  surfaceStyles,
  textStyles,
}: any) {
  return StyleSheet.create({
    hero: {
      marginBottom: spacing[7],
      gap: spacing[2],
    },
    title: textStyles.displayMd,
    subtitle: textStyles.bodyMd,
    placeholderCard: {
      ...surfaceStyles.card,
      padding: spacing[7],
      gap: spacing[2],
      marginBottom: spacing[6],
    },
    placeholderTitle: textStyles.titleMd,
    placeholderBody: textStyles.bodySm,
    groupSection: {
      marginBottom: spacing[7],
      gap: spacing[3],
    },
    groupHeader: {
      gap: spacing[1],
    },
    groupTitle: textStyles.sectionTitle,
    groupBody: textStyles.bodySm,
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
    },
    categoryChip: {
      backgroundColor: colors.bgMuted,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    categoryChipText: {
      ...textStyles.meta,
      color: colors.inkStrong,
    },
  });
}
