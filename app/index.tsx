import { Link, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Screen } from "../src/components/common/Screen";
import { getCharacterMeaning, sampleCharacters } from "../src/data/characters";
import {
  radius,
  spacing,
  useTheme,
} from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function HomeScreen() {
  const router = useRouter();
  const featured = sampleCharacters[0];
  const { hydrated, reviewCount } = useAppState();
  const { locale, t } = useI18n();
  const { colors, textStyles, surfaceStyles, shadows } = useTheme();
  const styles = createStyles({ colors, textStyles, surfaceStyles, shadows });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Screen>
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.eyebrow}>{t("home.eyebrow")}</Text>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={18} color={colors.inkStrongAlt} />
            </Pressable>
          </View>
          <Text style={styles.title}>{t("home.title")}</Text>
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
            onPress={() => router.push("/review")}
            style={[styles.miniCard, styles.shadow]}
          >
            <Text style={styles.miniNumber}>{hydrated ? reviewCount : "-"}</Text>
            <Text style={styles.miniLabel}>{t("home.reviewNeeded")}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/character/${featured.id}`)}
            style={[styles.miniCard, styles.shadow]}
          >
            <Text style={styles.miniNumber}>{featured.literal}</Text>
            <Text style={styles.miniLabel}>{t("home.featured")}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.recommended")}</Text>
          {sampleCharacters.slice(0, 3).map((character) => (
            <Link
              key={character.id}
              href={`/character/${character.id}`}
              asChild
            >
              <Pressable style={styles.listCard}>
                <Text style={styles.listKanji}>{character.literal}</Text>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{getCharacterMeaning(character, locale)}</Text>
                  <Text style={styles.listMeta}>
                    {t("common.jlpt")} {character.jlptLevel} · {t("common.strokes", { count: character.strokeCount })}
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </Screen>
    </SafeAreaView>
  );
}

function createStyles({
  colors,
  textStyles,
  surfaceStyles,
  shadows,
}: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bgCanvas,
    },
    hero: {
      marginBottom: spacing[7],
      gap: spacing[2] + 2,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[2],
      gap: spacing[3],
    },
    settingsButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    eyebrow: textStyles.eyebrow,
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
      marginBottom: spacing[7],
    },
    miniCard: {
      flex: 1,
      ...surfaceStyles.card,
      padding: spacing[6],
      minHeight: 120,
      justifyContent: "space-between",
    },
    miniNumber: {
      ...textStyles.glyphMd,
    },
    miniLabel: {
      fontSize: 14,
      color: colors.inkMuted,
      fontWeight: "700",
    },
    section: surfaceStyles.pageSection,
    sectionTitle: {
      ...textStyles.sectionTitle,
      marginBottom: 14,
    },
    listCard: {
      ...surfaceStyles.card,
      borderRadius: radius.sm,
      padding: 18,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    listKanji: {
      width: 54,
      ...textStyles.glyphSm,
      textAlign: "center",
    },
    listContent: {
      flex: 1,
      gap: 4,
    },
    listTitle: {
      ...textStyles.titleSm,
      fontWeight: "700",
    },
    listMeta: textStyles.caption,
    shadow: shadows.card,
  });
}
