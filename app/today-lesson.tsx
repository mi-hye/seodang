import { lazy, Suspense } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { Screen } from "../src/components/common/Screen";
import { useAppState } from "../src/state/AppStateProvider";

const DailyLessonScreen = lazy(() => import("../src/components/learning/GuidedLessonScreen"));

export default function DailyLessonRoute() {
  const { hydrated, learningStage } = useAppState();
  if (!hydrated) return <Screen><ActivityIndicator /></Screen>;
  if (!learningStage) return <Redirect href="/learning-start" />;
  return <Suspense fallback={<Screen><ActivityIndicator /></Screen>}><DailyLessonScreen /></Suspense>;
}
