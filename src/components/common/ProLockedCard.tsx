import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";

export function ProLockedCard({
  body,
  title,
  viewProLabel,
}: {
  body: string;
  title: string;
  viewProLabel: string;
}) {
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });

  return (
    <View style={[styles.card, styles.shadow]}>
      <View style={styles.icon}>
        <Ionicons
          name="lock-closed-outline"
          size={22}
          color={colors.inkOnDark}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable style={styles.button} onPress={() => router.navigate("/pro")}>
        <Text style={styles.buttonText}>{viewProLabel}</Text>
      </Pressable>
    </View>
  );
}

function createStyles({ colors, surfaceStyles, textStyles, shadows }: any) {
  return StyleSheet.create({
    card: {
      ...surfaceStyles.card,
      padding: spacing[7],
      alignItems: "flex-start",
      gap: spacing[3],
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inkStrongAlt,
      marginBottom: spacing[1],
    },
    title: textStyles.titleMd,
    body: textStyles.bodySm,
    button: {
      borderRadius: 999,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[3],
      backgroundColor: colors.inkStrongAlt,
    },
    buttonText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    shadow: shadows.card,
  });
}
