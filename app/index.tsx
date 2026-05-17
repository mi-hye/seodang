import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import {
  useKanjiCategoryGroupsQuery,
  useKanjiCharacterQuery,
} from "../src/queries/kanjiQueries";
import { useAppState } from "../src/state/AppStateProvider";

export default function HomeScreen() {
  const router = useRouter();
  const { hydrated, favoriteCount, lastCompletedPractice } = useAppState();
  const { locale, t } = useI18n();
  const { data: lastCharacter } = useKanjiCharacterQuery(
    lastCompletedPractice?.characterId,
  );
  const { data: categoryGroups = [] } = useKanjiCategoryGroupsQuery(locale);
  const { colors, textStyles, surfaceStyles, shadows } = useTheme();
  const styles = createStyles({ colors, textStyles, surfaceStyles, shadows });
  const lastCategory = categoryGroups
    .flatMap((group) => group.categories)
    .find(
      (category) => category.categoryKey === lastCompletedPractice?.categoryKey,
    );

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <Text style={styles.title}>{t("home.title")}</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push("/search")}
              style={styles.iconButton}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.inkStrong}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.iconButton}
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color={colors.inkStrong}
              />
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
      </View>

      <Pressable
        onPress={() => router.push("/categories")}
        style={[styles.primaryCard, styles.shadow]}
      >
        <Text style={styles.primaryLabel}>{t("home.start")}</Text>
        <Text style={styles.primaryBody}>{t("home.startBody")}</Text>
      </Pressable>

      <View style={styles.row}>
        <Pressable
          onPress={() => router.push("/favorites")}
          style={[styles.actionCard, styles.shadow]}
        >
          <View style={styles.actionCardTop}>
            <Text style={styles.actionTitle}>{t("home.favorites")}</Text>
            <Text style={styles.actionValue}>
              {hydrated ? favoriteCount : "-"}
            </Text>
          </View>
          <Text style={styles.actionBody}>{t("home.favoritesBody")}</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            lastCompletedPractice?.characterId
              ? router.push({
                  pathname: "/practice/[characterId]",
                  params: {
                    characterId: lastCompletedPractice.characterId,
                    categoryKey: lastCompletedPractice.categoryKey,
                  },
                })
              : router.push("/categories")
          }
          style={[styles.actionCard, styles.shadow]}
        >
          <View style={styles.actionCardTop}>
            <Text style={styles.actionTitle}>{t("home.recentPractice")}</Text>
            <Text style={styles.actionValue}>
              {lastCharacter?.literal ?? "-"}
            </Text>
          </View>
          <Text style={styles.actionBody}>
            {lastCharacter
              ? t("home.recentPracticeBodyReady", {
                  category: lastCategory?.label ?? t("nav.categories"),
                })
              : t("home.recentPracticeBodyEmpty")}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles({ colors, textStyles, surfaceStyles, shadows }: any) {
  return StyleSheet.create({
    hero: {
      marginBottom: spacing[7],
      gap: spacing[2] + 2,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[1],
      gap: spacing[3],
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    title: textStyles.displayLg,
    subtitle: textStyles.bodyMd,
    primaryCard: {
      ...surfaceStyles.heroDark,
      padding: spacing[7],
      marginBottom: spacing[4],
    },
    primaryLabel: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.inkOnDark,
      marginBottom: spacing[2],
    },
    primaryBody: {
      color: colors.inkOnDarkMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    row: {
      flexDirection: "row",
      gap: spacing[3],
      marginBottom: spacing[4],
    },
    actionCard: {
      flex: 1,
      ...surfaceStyles.card,
      padding: spacing[6],
      minHeight: 136,
      justifyContent: "space-between",
    },
    actionCardTop: {
      gap: spacing[2],
    },
    actionTitle: {
      ...textStyles.titleSm,
      fontWeight: "700",
    },
    actionValue: {
      ...textStyles.glyphMd,
      fontWeight: "700",
    },
    actionBody: {
      ...textStyles.bodySm,
      color: colors.inkMuted,
    },
    shadow: shadows.card,
  });
}
