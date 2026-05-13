import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppStateProvider } from "../src/state/AppStateProvider";
import { colors } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { QueryProvider } from "../src/state/QueryProvider";

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
  const { t } = useI18n();

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: colors.bgCanvas,
          },
          headerTintColor: colors.inkStrongAlt,
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: colors.bgCanvas,
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: t("common.appName"), headerShown: false }} />
        <Stack.Screen name="list" options={{ title: t("nav.list") }} />
        <Stack.Screen name="review" options={{ title: t("nav.review") }} />
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
          name="categories"
          options={{ title: t("nav.categories") }}
        />
      </Stack>
    </>
  );
}
