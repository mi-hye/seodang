import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Appearance } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { AppStateProvider } from "../src/state/AppStateProvider";
import { useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { initializeNotifications } from "../src/lib/notifications";
import { QueryProvider } from "../src/state/QueryProvider";
import { useAppState } from "../src/state/AppStateProvider";

export default function RootLayout() {
  return (
    <QueryProvider>
      <AppStateProvider>
        <RootNavigator />
      </AppStateProvider>
    </QueryProvider>
  );
}

function RootNavigator() {
  const { hydrated } = useAppState();
  const { t } = useI18n();
  const { colors, themeMode } = useTheme();

  if (hydrated) {
    Appearance.setColorScheme(themeMode);
  }

  useEffect(() => {
    void initializeNotifications();
  }, []);

  const navigationTheme = useMemo(
    () => ({
      ...(themeMode === "dark" ? DarkTheme : DefaultTheme),
      colors: {
        ...(themeMode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.bgCanvas,
        card: colors.bgCanvas,
        text: colors.inkStrong,
        border: "transparent",
        primary: colors.inkStrong,
        notification: colors.accentWarm,
      },
    }),
    [colors, themeMode],
  );

  const screenOptions = useMemo(
    () => ({
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal" as const,
      headerStyle: {
        backgroundColor: colors.bgCanvas,
      },
      headerTintColor: colors.inkStrong,
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: colors.inkStrong,
      },
      contentStyle: {
        backgroundColor: colors.bgCanvas,
      },
    }),
    [colors],
  );

  if (!hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: t("common.appName"), headerShown: false }} />
        <Stack.Screen name="list" options={{ title: t("nav.list") }} />
        <Stack.Screen
          name="character/[characterId]"
          options={{ title: t("nav.detail") }}
        />
        <Stack.Screen
          name="practice/[characterId]"
          options={{ title: t("nav.practice") }}
        />
        <Stack.Screen
          name="practice/result"
          options={{ title: t("nav.result"), presentation: "card" }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: t("nav.settings") }}
        />
        <Stack.Screen
          name="settings-notifications"
          options={{ title: t("nav.settingsNotifications") }}
        />
        <Stack.Screen
          name="categories"
          options={{ title: t("nav.categories") }}
        />
        <Stack.Screen
          name="category-progress"
          options={{ title: t("nav.categoryProgress") }}
        />
        <Stack.Screen
          name="review"
          options={{ title: t("nav.review") }}
        />
        <Stack.Screen
          name="review-stats"
          options={{ title: t("nav.reviewStats") }}
        />
        <Stack.Screen
          name="review-weaknesses"
          options={{ title: t("nav.reviewWeaknesses") }}
        />
        <Stack.Screen
          name="review-mastered"
          options={{ title: t("nav.reviewMastered") }}
        />
        <Stack.Screen
          name="review-progressing"
          options={{ title: t("nav.reviewProgressing") }}
        />
        <Stack.Screen
          name="pro"
          options={{ title: t("nav.pro") }}
        />
        <Stack.Screen
          name="mistake-note"
          options={{ title: t("nav.mistakeNote") }}
        />
        <Stack.Screen
          name="favorites"
          options={{ title: t("nav.favorites") }}
        />
        <Stack.Screen
          name="search"
          options={{ title: t("nav.search") }}
        />
        <Stack.Screen
          name="privacy-policy"
          options={{ title: t("nav.privacyPolicy") }}
        />
        <Stack.Screen
          name="third-party-notices"
          options={{ title: t("nav.thirdPartyNotices") }}
        />
      </Stack>
    </ThemeProvider>
  );
}
