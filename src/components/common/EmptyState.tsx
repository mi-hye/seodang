import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";

export function EmptyState({
  actionLabel,
  onActionPress,
  body,
  title,
}: {
  actionLabel?: string;
  body?: string;
  onActionPress?: () => void;
  title: string;
}) {
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onActionPress ? (
        <Pressable style={styles.action} onPress={onActionPress}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
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
    action: {
      alignSelf: "flex-start",
      paddingVertical: spacing[1],
    },
    actionText: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
  });
}
