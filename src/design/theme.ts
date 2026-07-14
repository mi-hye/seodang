import { TextStyle, useWindowDimensions, ViewStyle } from "react-native";

import { ThemeMode } from "../types/app-state";
import { useAppState } from "../state/AppStateProvider";
import { getAppTextScale, scaledFont } from "./fontScalingConfig";

export type ThemeColors = {
  bgCanvas: string;
  bgSurface: string;
  bgMuted: string;
  bgMutedStrong: string;
  inkStrong: string;
  inkStrongAlt: string;
  inkBody: string;
  inkMuted: string;
  inkFaint: string;
  inkOnDark: string;
  inkOnDarkMuted: string;
  accentWarm: string;
  accentWarmMuted: string;
  borderStrong: string;
  borderSoft: string;
  success: string;
  danger: string;
  shadow: string;
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 18,
  6: 20,
  7: 24,
  8: 28,
  9: 32,
  10: 36,
} as const;

export const radius = {
  sm: 18,
  md: 24,
  lg: 28,
  xl: 30,
  pill: 999,
} as const;

export const layout = {
  screenPaddingX: 20,
  screenPaddingTop: 16,
  screenPaddingBottom: 32,
} as const;

const lightColors: ThemeColors = {
  bgCanvas: "#f7f1e8",
  bgSurface: "#fffaf3",
  bgMuted: "#efe4d3",
  bgMutedStrong: "#e6ddcf",
  inkStrong: "#173221",
  inkStrongAlt: "#1d3b2a",
  inkBody: "#4d5f52",
  inkMuted: "#5f695e",
  inkFaint: "#6f756b",
  inkOnDark: "#f7f1e8",
  inkOnDarkMuted: "#dce7de",
  accentWarm: "#c66d3d",
  accentWarmMuted: "#8b5e34",
  borderStrong: "#173221",
  borderSoft: "#ddcfbc",
  success: "#1d3b2a",
  danger: "#c4473a",
  shadow: "#5f4b32",
};

const darkColors: ThemeColors = {
  bgCanvas: "#0f1713",
  bgSurface: "#16211b",
  bgMuted: "#1d2a23",
  bgMutedStrong: "#27352d",
  inkStrong: "#f3eadf",
  inkStrongAlt: "#234131",
  inkBody: "#ccd7cf",
  inkMuted: "#aab9af",
  inkFaint: "#8b9a91",
  inkOnDark: "#f3eadf",
  inkOnDarkMuted: "#d9e2db",
  accentWarm: "#c87445",
  accentWarmMuted: "#e0a57c",
  borderStrong: "#d3b48f",
  borderSoft: "#314037",
  success: "#2f694d",
  danger: "#d96b61",
  shadow: "#000000",
};

export function useTheme() {
  const { theme } = useAppState();
  const { fontScale } = useWindowDimensions();

  return getTheme(theme, getAppTextScale(fontScale));
}

export function getTheme(themeMode: ThemeMode, textScale = 1) {
  const colors = themeMode === "dark" ? darkColors : lightColors;

  const textStyles = {
    eyebrow: {
      fontSize: scaledFont(12, textScale),
      fontWeight: "800",
      letterSpacing: 1.2,
      color: colors.accentWarmMuted,
      textTransform: "uppercase",
    } satisfies TextStyle,
    displayLg: {
      fontSize: scaledFont(34, textScale),
      lineHeight: scaledFont(40, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    displayMd: {
      fontSize: scaledFont(28, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    displaySm: {
      fontSize: scaledFont(24, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    heroGlyph: {
      fontSize: scaledFont(72, textScale),
      fontWeight: "800",
      color: colors.inkOnDark,
    } satisfies TextStyle,
    glyphLg: {
      fontSize: scaledFont(64, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    glyphMd: {
      fontSize: scaledFont(36, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    glyphSm: {
      fontSize: scaledFont(28, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    sectionTitle: {
      fontSize: scaledFont(20, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    titleMd: {
      fontSize: scaledFont(18, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    titleSm: {
      fontSize: scaledFont(16, textScale),
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    bodyMd: {
      fontSize: scaledFont(15, textScale),
      lineHeight: scaledFont(23, textScale),
      color: colors.inkBody,
    } satisfies TextStyle,
    bodySm: {
      fontSize: scaledFont(14, textScale),
      lineHeight: scaledFont(21, textScale),
      color: colors.inkMuted,
    } satisfies TextStyle,
    caption: {
      fontSize: scaledFont(13, textScale),
      color: colors.inkFaint,
    } satisfies TextStyle,
    meta: {
      fontSize: scaledFont(12, textScale),
      fontWeight: "700",
      color: colors.inkFaint,
    } satisfies TextStyle,
    buttonLabel: {
      fontSize: scaledFont(15, textScale),
      fontWeight: "800",
    } satisfies TextStyle,
  } as const;

  const surfaceStyles = {
    card: {
      backgroundColor: colors.bgSurface,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    heroDark: {
      backgroundColor: colors.inkStrongAlt,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    mutedCard: {
      backgroundColor: colors.bgMuted,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    pageSection: {
      marginBottom: spacing[7],
    } satisfies ViewStyle,
  } as const;

  const buttonStyles = {
    primary: {
      backgroundColor: colors.inkStrongAlt,
      borderRadius: radius.pill,
      alignItems: "center",
      paddingVertical: spacing[5],
    } satisfies ViewStyle,
    secondary: {
      backgroundColor: colors.bgMuted,
      borderRadius: radius.pill,
      alignItems: "center",
      paddingVertical: spacing[5],
    } satisfies ViewStyle,
    warm: {
      backgroundColor: colors.accentWarm,
      borderRadius: radius.pill,
      alignItems: "center",
      paddingVertical: spacing[5],
    } satisfies ViewStyle,
  } as const;

  const chipStyles = {
    base: {
      backgroundColor: colors.bgMuted,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 10,
    } satisfies ViewStyle,
    active: {
      backgroundColor: colors.inkStrong,
    } satisfies ViewStyle,
  } as const;

  const shadows = {
    card: {
      shadowColor: colors.shadow,
      shadowOpacity: themeMode === "dark" ? 0.22 : 0.08,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 18,
      elevation: 3,
    } satisfies ViewStyle,
  } as const;

  return {
    themeMode,
    colors,
    textScale,
    textStyles,
    surfaceStyles,
    buttonStyles,
    chipStyles,
    shadows,
  };
}
