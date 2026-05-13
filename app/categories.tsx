import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, surfaceStyles, textStyles } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";

export default function CategoriesScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>{t("categories.title")}</Text>
        <Text style={styles.subtitle}>{t("categories.subtitle")}</Text>
      </View>

      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderTitle}>{t("categories.placeholder")}</Text>
        <Text style={styles.placeholderBody}>{t("categories.helper")}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  },
  placeholderTitle: textStyles.titleMd,
  placeholderBody: textStyles.bodySm,
});
