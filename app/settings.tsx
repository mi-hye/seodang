import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export default function SettingsScreen() {
  const { locale, setLocale, t } = useI18n();
  const { isPro, setProForDevelopment, setTheme } = useAppState();
  const { themeMode, colors, chipStyles, surfaceStyles, textStyles, shadows } =
    useTheme();
  const styles = createStyles({
    themeMode,
    colors,
    chipStyles,
    surfaceStyles,
    textStyles,
    shadows,
  });

  return (
    <Screen>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        </View>

        <View style={styles.optionList}>
          <SettingOptionCard
            icon="language-outline"
            title={t("settings.koreanTitle")}
            active={locale === "ko"}
            activeLabel={t("settings.selected")}
            onPress={() => setLocale("ko")}
          />
          <SettingOptionCard
            icon="language-outline"
            title={t("settings.japaneseTitle")}
            active={locale === "ja"}
            activeLabel={t("settings.selected")}
            onPress={() => setLocale("ja")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.theme")}</Text>
        </View>

        <View style={styles.optionList}>
          <SettingOptionCard
            icon="sunny-outline"
            title={t("settings.themeLightTitle")}
            active={themeMode === "light"}
            activeLabel={t("settings.selected")}
            onPress={() => setTheme("light")}
          />
          <SettingOptionCard
            icon="moon-outline"
            title={t("settings.themeDarkTitle")}
            active={themeMode === "dark"}
            activeLabel={t("settings.selected")}
            onPress={() => setTheme("dark")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.pro")}</Text>
        </View>

        <Pressable
          style={[styles.infoCard, styles.shadow]}
          onPress={() => router.navigate(isPro ? "/review-stats" : "/pro")}
        >
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleRow}>
              <Ionicons
                name="stats-chart-outline"
                size={18}
                color={colors.accentWarmMuted}
              />
              <Text style={styles.infoCardTitle}>
                {t("settings.reviewStatsTitle")}
              </Text>
            </View>
            <View style={styles.proChip}>
              <Text style={styles.proChipText}>{t("settings.proBadge")}</Text>
            </View>
          </View>
        </Pressable>

        {__DEV__ ? (
          <Pressable
            style={[styles.infoCard, styles.shadow]}
            onPress={() => setProForDevelopment(!isPro)}
          >
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardTitleRow}>
                <Ionicons
                  name="construct-outline"
                  size={18}
                  color={colors.accentWarmMuted}
                />
                <Text style={styles.infoCardTitle}>
                  {t("settings.devProMode")}
                </Text>
              </View>
              <View style={[styles.devToggle, isPro ? styles.devToggleOn : null]}>
                <Text
                  style={[
                    styles.devToggleText,
                    isPro ? styles.devToggleTextOn : null,
                  ]}
                >
                  {isPro ? t("settings.devProOn") : t("settings.devProOff")}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.notifications")}</Text>
        </View>

        <Pressable
          style={[styles.infoCard, styles.shadow]}
          onPress={() => router.push("/settings-notifications")}
        >
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleRow}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={colors.accentWarmMuted}
              />
              <Text style={styles.infoCardTitle}>
                {t("settings.notificationsTitle")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.inkMuted}
            />
          </View>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.legal")}</Text>
        </View>

        <Pressable
          style={[styles.infoCard, styles.shadow]}
          onPress={() => router.push("/privacy-policy")}
        >
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleRow}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.accentWarmMuted}
              />
              <Text style={styles.infoCardTitle}>
                {t("settings.privacyPolicyTitle")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.inkMuted}
            />
          </View>
        </Pressable>

        <Pressable
          style={[styles.infoCard, styles.shadow]}
          onPress={() => router.push("/third-party-notices")}
        >
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleRow}>
              <Ionicons
                name="library-outline"
                size={18}
                color={colors.accentWarmMuted}
              />
              <Text style={styles.infoCardTitle}>
                {t("settings.thirdPartyNoticesTitle")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.inkMuted}
            />
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}

type SettingOptionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  active: boolean;
  activeLabel: string;
  onPress: () => void;
};

function SettingOptionCard({
  icon,
  title,
  active,
  activeLabel,
  onPress,
}: SettingOptionCardProps) {
  const { colors, chipStyles, surfaceStyles, textStyles, themeMode, shadows } =
    useTheme();
  const styles = createStyles({
    themeMode,
    colors,
    chipStyles,
    surfaceStyles,
    textStyles,
    shadows,
  });

  return (
    <Pressable
      style={[
        styles.optionCard,
        styles.shadow,
        active && styles.optionCardActive,
      ]}
      onPress={onPress}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionTitleRow}>
          <Ionicons name={icon} size={18} color={colors.accentWarmMuted} />
          <Text style={styles.optionTitle}>{title}</Text>
        </View>
        {active ? (
          <View style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>{activeLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles({
  themeMode,
  colors,
  chipStyles,
  surfaceStyles,
  textStyles,
  shadows,
}: any) {
  return StyleSheet.create({
    section: {
      marginBottom: spacing[7],
      gap: spacing[3],
    },
    sectionHeader: {
      gap: 0,
    },
    sectionTitle: textStyles.sectionTitle,
    optionList: {
      gap: spacing[3],
    },
    optionCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      borderWidth: 1,
      borderColor: colors.borderSoft,
      minHeight: 76,
      justifyContent: "center",
    },
    optionCardActive: {
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
    selectedChip: {
      ...chipStyles.base,
      backgroundColor:
        themeMode === "dark" ? colors.accentWarm : colors.inkStrongAlt,
    },
    selectedChipText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    proChip: {
      ...chipStyles.base,
      backgroundColor:
        themeMode === "dark" ? colors.accentWarm : colors.inkStrongAlt,
    },
    proChipText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    devToggle: {
      borderRadius: 999,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      backgroundColor: colors.bgMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    devToggleOn: {
      backgroundColor: colors.inkStrongAlt,
      borderColor: colors.inkStrongAlt,
    },
    devToggleText: {
      ...textStyles.meta,
      color: colors.inkMuted,
    },
    devToggleTextOn: {
      color: colors.inkOnDark,
    },
    infoCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    infoCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    infoCardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    infoCardTitle: textStyles.titleMd,
    shadow: shadows.card,
  });
}
