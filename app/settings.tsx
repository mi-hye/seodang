import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function SettingsScreen() {
  const { locale, setLocale, t } = useI18n();
  const { setTheme } = useAppState();
  const { themeMode, colors, chipStyles, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, chipStyles, surfaceStyles, textStyles });

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>{t("settings.title")}</Text>
        <Text style={styles.subtitle}>{t("settings.subtitle")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <Text style={styles.sectionBody}>{t("settings.languageBody")}</Text>
      </View>

      <View style={styles.optionList}>
        <Pressable
          style={[styles.optionCard, locale === "ko" && styles.optionCardActive]}
          onPress={() => setLocale("ko")}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionTitleRow}>
              <Ionicons name="language-outline" size={18} color={colors.accentWarmMuted} />
              <Text style={styles.optionTitle}>{t("settings.koreanTitle")}</Text>
            </View>
            {locale === "ko" ? (
              <View style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{t("settings.selected")}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.optionBody}>{t("settings.koreanBody")}</Text>
        </Pressable>

        <Pressable
          style={[styles.optionCard, locale === "ja" && styles.optionCardActive]}
          onPress={() => setLocale("ja")}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionTitleRow}>
              <Ionicons name="language-outline" size={18} color={colors.accentWarmMuted} />
              <Text style={styles.optionTitle}>{t("settings.japaneseTitle")}</Text>
            </View>
            {locale === "ja" ? (
              <View style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{t("settings.selected")}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.optionBody}>{t("settings.japaneseBody")}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.theme")}</Text>
        <Text style={styles.sectionBody}>{t("settings.themeBody")}</Text>
      </View>

      <View style={styles.optionList}>
        <Pressable
          style={[styles.optionCard, themeMode === "light" && styles.optionCardActive]}
          onPress={() => setTheme("light")}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionTitleRow}>
              <Ionicons name="sunny-outline" size={18} color={colors.accentWarmMuted} />
              <Text style={styles.optionTitle}>{t("settings.themeLightTitle")}</Text>
            </View>
            {themeMode === "light" ? (
              <View style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{t("settings.selected")}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.optionBody}>{t("settings.themeLightBody")}</Text>
        </Pressable>

        <Pressable
          style={[styles.optionCard, themeMode === "dark" && styles.optionCardActive]}
          onPress={() => setTheme("dark")}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionTitleRow}>
              <Ionicons name="moon-outline" size={18} color={colors.accentWarmMuted} />
              <Text style={styles.optionTitle}>{t("settings.themeDarkTitle")}</Text>
            </View>
            {themeMode === "dark" ? (
              <View style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{t("settings.selected")}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.optionBody}>{t("settings.themeDarkBody")}</Text>
        </Pressable>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerText}>{t("settings.comingSoon")}</Text>
      </View>
    </Screen>
  );
}

function createStyles({
  colors,
  chipStyles,
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
    section: {
      marginBottom: spacing[4],
      gap: spacing[1],
    },
    sectionTitle: textStyles.sectionTitle,
    sectionBody: textStyles.bodySm,
    optionList: {
      gap: spacing[3],
      marginBottom: spacing[6],
    },
    optionCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[2],
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    optionCardActive: {
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.bgMutedStrong,
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    optionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    optionTitle: textStyles.titleMd,
    optionBody: textStyles.bodySm,
    selectedChip: {
      ...chipStyles.base,
      backgroundColor: colors.inkStrong,
    },
    selectedChipText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    footerCard: {
      ...surfaceStyles.mutedCard,
      padding: spacing[5],
      borderRadius: 20,
    },
    footerText: textStyles.bodySm,
  });
}
