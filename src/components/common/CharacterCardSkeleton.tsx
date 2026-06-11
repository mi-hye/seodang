import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";

export function CharacterCardSkeleton({ count = 3 }: { count?: number }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.wrapper}>
      {Array.from({ length: count }, (_, index) => (
        <Animated.View key={index} style={[styles.card, { opacity }]}>
          <View style={styles.literal} />
          <View style={styles.content}>
            <View style={styles.title} />
            <View style={styles.meta} />
          </View>
          <View style={styles.action} />
        </Animated.View>
      ))}
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing[3],
    },
    card: {
      padding: spacing[5],
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      backgroundColor: colors.bgSurface,
    },
    literal: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.bgMutedStrong,
    },
    content: {
      flex: 1,
      gap: spacing[2],
    },
    title: {
      width: "60%",
      height: 18,
      borderRadius: 999,
      backgroundColor: colors.bgMutedStrong,
    },
    meta: {
      width: "34%",
      height: 12,
      borderRadius: 999,
      backgroundColor: colors.bgMutedStrong,
    },
    action: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.bgMutedStrong,
    },
  });
}
