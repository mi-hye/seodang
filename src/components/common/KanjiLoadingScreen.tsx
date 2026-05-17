import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { spacing, useTheme } from "../../design/theme";

const loadingGlyphs = ["書", "学", "筆"];

export function KanjiLoadingScreen() {
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () => createStyles({ colors, textStyles }),
    [colors, textStyles],
  );
  const glyphAnims = useRef(
    loadingGlyphs.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animations = glyphAnims.map((anim) =>
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const loop = Animated.loop(Animated.stagger(140, animations));

    loop.start();
    return () => loop.stop();
  }, [glyphAnims]);

  return (
    <View style={styles.container}>
      <View style={styles.heroWrap}>
        {loadingGlyphs.map((glyph, index) => {
          const glyphStyle = {
            opacity: glyphAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0.22, 1],
            }),
            transform: [
              {
                translateY: glyphAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, -8],
                }),
              },
              {
                scale: glyphAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1.04],
                }),
              },
            ],
          } as const;

          return (
            <Animated.Text key={glyph} style={[styles.glyph, glyphStyle]}>
              {glyph}
            </Animated.Text>
          );
        })}
      </View>
    </View>
  );
}

function createStyles({ colors, textStyles }: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgCanvas,
      justifyContent: "center",
      alignItems: "center",
    },
    heroWrap: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 18,
      transform: [{ translateY: -spacing[10] }],
    },
    glyph: {
      ...textStyles.heroGlyph,
      color: colors.inkStrong,
      fontSize: 44,
      lineHeight: 52,
      textAlign: "center",
      includeFontPadding: false,
    },
  });
}
