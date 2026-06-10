import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";

type FocusedCharacterCardProps = {
  characterId: string;
  literal: string;
  meaning: string;
  meta: string;
  statusLabel?: string;
  statusTone?: "active" | "conquered";
  subMeta?: string;
};

export function FocusedCharacterCard({
  characterId,
  literal,
  meaning,
  meta,
  statusLabel,
  statusTone = "active",
  subMeta,
}: FocusedCharacterCardProps) {
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const isConquered = statusTone === "conquered";

  return (
    <Pressable
      style={[styles.card, styles.shadow]}
      onPress={() =>
        router.push({
          pathname: "/character/[characterId]",
          params: { characterId },
        })
      }
    >
      <Text style={styles.literal}>{literal}</Text>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.meaning}>{meaning}</Text>
          {statusLabel ? (
            <View
              style={[
                styles.statusChip,
                isConquered ? styles.conqueredChip : styles.activeChip,
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  isConquered ? styles.conqueredChipText : null,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{meta}</Text>
        {subMeta ? <Text style={styles.subMeta}>{subMeta}</Text> : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.accentWarmMuted}
      />
    </Pressable>
  );
}

function createStyles({ colors, surfaceStyles, textStyles, shadows }: any) {
  return StyleSheet.create({
    card: {
      ...surfaceStyles.card,
      padding: spacing[5],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    literal: {
      ...textStyles.glyphSm,
      width: 40,
      textAlign: "center",
    },
    content: {
      flex: 1,
      gap: spacing[1],
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    meaning: {
      ...textStyles.titleSm,
      flex: 1,
    },
    meta: textStyles.meta,
    subMeta: {
      ...textStyles.caption,
      color: colors.inkMuted,
    },
    statusChip: {
      borderRadius: 999,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
    },
    activeChip: {
      backgroundColor: colors.bgMuted,
    },
    conqueredChip: {
      backgroundColor: colors.inkStrongAlt,
    },
    statusChipText: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
    },
    conqueredChipText: {
      color: colors.inkOnDark,
    },
    shadow: shadows.card,
  });
}
