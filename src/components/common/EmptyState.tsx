import { StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";

export function EmptyState({
  body,
  title,
}: {
  body?: string;
  title: string;
}) {
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

function createStyles({ colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    card: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[2],
    },
    title: textStyles.titleSm,
    body: {
      ...textStyles.bodySm,
      color: colors.inkMuted,
    },
  });
}
