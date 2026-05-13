import { TextStyle, ViewStyle } from "react-native";

import { ThemeMode } from "../types/app-state";
import { useAppState } from "../state/AppStateProvider";

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
  danger: "#8f3f2c",
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
  danger: "#a45a48",
  shadow: "#000000",
};

export function useTheme() {
  const { theme } = useAppState();
  return getTheme(theme);
}

export function getTheme(themeMode: ThemeMode) {
  const colors = themeMode === "dark" ? darkColors : lightColors;

  const textStyles = {
    eyebrow: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: colors.accentWarmMuted,
      textTransform: "uppercase",
    } satisfies TextStyle,
    displayLg: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    displayMd: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    displaySm: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    heroGlyph: {
      fontSize: 72,
      fontWeight: "800",
      color: colors.inkOnDark,
    } satisfies TextStyle,
    glyphLg: {
      fontSize: 64,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    glyphMd: {
      fontSize: 36,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    glyphSm: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    titleMd: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    titleSm: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.inkStrong,
    } satisfies TextStyle,
    bodyMd: {
      fontSize: 15,
      lineHeight: 23,
      color: colors.inkBody,
    } satisfies TextStyle,
    bodySm: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.inkMuted,
    } satisfies TextStyle,
    caption: {
      fontSize: 13,
      color: colors.inkFaint,
    } satisfies TextStyle,
    meta: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.inkFaint,
    } satisfies TextStyle,
    buttonLabel: {
      fontSize: 15,
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
    textStyles,
    surfaceStyles,
    buttonStyles,
    chipStyles,
    shadows,
  };
}
