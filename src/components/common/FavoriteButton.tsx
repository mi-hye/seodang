import { Feather, FontAwesome } from "@expo/vector-icons";
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { spacing, useTheme } from "../../design/theme";
import { useI18n } from "../../i18n/useI18n";
import { useAppState } from "../../state/AppStateProvider";

type FavoriteButtonProps = {
  characterId: string;
  favorited?: boolean;
  iconSize?: number;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, "onPress" | "style"> & {
  onPress?: () => void;
};

export function FavoriteButton({
  characterId,
  favorited,
  iconSize = 18,
  showLabel = false,
  style,
  onPress,
  ...pressableProps
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useAppState();
  const { colors, textStyles } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(textStyles, colors.inkMuted);
  const resolvedFavorited = favorited ?? isFavorite(characterId);

  return (
    <Pressable
      {...pressableProps}
      style={[styles.button, style]}
      onPress={(event) => {
        event.stopPropagation?.();
        if (onPress) {
          onPress();
          return;
        }

        toggleFavorite(characterId);
      }}
    >
      {resolvedFavorited ? (
        <FontAwesome name="star" size={iconSize} color={colors.accentWarm} />
      ) : (
        <Feather name="star" size={iconSize} color={colors.inkMuted} />
      )}
      {showLabel ? (
        <Text style={styles.label}>
          {resolvedFavorited ? t("favorites.saved") : t("favorites.save")}
        </Text>
      ) : null}
    </Pressable>
  );
}

function createStyles(textStyles: any, labelColor: string) {
  return StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing[2],
    },
    label: {
      ...textStyles.meta,
      color: labelColor,
    },
  });
}
