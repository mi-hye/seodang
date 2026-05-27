import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";
import { useI18n } from "../../i18n/useI18n";

export function ErrorState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const { buttonStyles, colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ buttonStyles, colors, surfaceStyles, textStyles });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonLabel}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles({ buttonStyles, colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    card: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[3],
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    title: textStyles.titleSm,
    body: {
      ...textStyles.bodySm,
      color: colors.inkMuted,
    },
    button: {
      ...buttonStyles.secondary,
      marginTop: spacing[1],
    },
    buttonLabel: {
      ...textStyles.buttonLabel,
      color: colors.accentWarmMuted,
    },
  });
}
