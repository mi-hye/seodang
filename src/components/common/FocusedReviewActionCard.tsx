import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";
import { buildFocusedReviewStart } from "../../domain/review/reviewSession";

export function FocusedReviewActionCard({
  body,
  characterIds,
  icon,
  isPro,
  title,
}: {
  body: string;
  characterIds: string[];
  icon: keyof typeof Ionicons.glyphMap;
  isPro: boolean;
  title: string;
}) {
  const { colors, surfaceStyles, textStyles, shadows } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles, shadows });
  const focusedReviewStart = buildFocusedReviewStart(characterIds);

  if (!focusedReviewStart.canStart) {
    return null;
  }

  return (
    <Pressable
      style={[styles.card, styles.shadow]}
      onPress={() => {
        if (!isPro) {
          router.navigate("/pro");
          return;
        }

        router.push({
          pathname: "/practice/[characterId]",
          params: {
            characterId: focusedReviewStart.firstCharacterId,
            reviewIds: focusedReviewStart.reviewIds,
          },
        });
      }}
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={20} color={colors.inkOnDark} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
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
      marginBottom: spacing[4],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inkStrongAlt,
    },
    content: {
      flex: 1,
      gap: spacing[1],
    },
    title: textStyles.titleSm,
    body: textStyles.bodySm,
    shadow: shadows.card,
  });
}
