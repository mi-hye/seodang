import { lazy, Suspense } from "react";
import { Redirect, Stack, useRouter } from "expo-router";
import { ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../src/components/common/Screen";
import { useAppState } from "../src/state/AppStateProvider";
import { useI18n } from "../src/i18n/useI18n";
import { useTheme } from "../src/design/theme";

const DailyLessonScreen = lazy(() => import("../src/components/learning/GuidedLessonScreen"));

export default function DailyLessonRoute() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { hydrated, learningStage } = useAppState();
  if (!hydrated) return <Screen><ActivityIndicator /></Screen>;
  if (!learningStage) return <Redirect href="/learning-start" />;
  return <>
    <Stack.Screen options={{ headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel={t("lesson.pause")}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      onPress={() => router.canGoBack() ? router.back() : router.replace("/learn")}>
      <Ionicons name="arrow-back" size={22} color={colors.inkStrong} />
    </Pressable> }} />
    <Suspense fallback={<Screen><ActivityIndicator /></Screen>}><DailyLessonScreen /></Suspense>
  </>;
}
