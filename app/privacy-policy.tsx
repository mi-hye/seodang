import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";

export default function PrivacyPolicyScreen() {
  const { t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });

  const sections = [
    {
      title: t("privacy.localDataTitle"),
      body: t("privacy.localDataBody"),
    },
    {
      title: t("privacy.remoteDataTitle"),
      body: t("privacy.remoteDataBody"),
    },
    {
      title: t("privacy.notificationsTitle"),
      body: t("privacy.notificationsBody"),
    },
    {
      title: t("privacy.contactTitle"),
      body: t("privacy.contactBody"),
    },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t("privacy.title")}</Text>
        <Text style={styles.updated}>{t("privacy.updated")}</Text>
      </View>

      <View style={styles.card}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function createStyles({ colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    header: {
      marginBottom: spacing[5],
      gap: spacing[2],
    },
    title: textStyles.displayMd,
    updated: {
      ...textStyles.meta,
      color: colors.inkMuted,
    },
    card: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[5],
    },
    section: {
      gap: spacing[2],
    },
    sectionTitle: textStyles.titleSm,
    body: {
      ...textStyles.bodySm,
      color: colors.inkBody,
    },
  });
}
