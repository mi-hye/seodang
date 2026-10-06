import { lazy, Suspense } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";
import { Screen } from "../src/components/common/Screen";
import { useAppState } from "../src/state/AppStateProvider";

const LearningStartScreen = lazy(() => import("../src/components/learning/LearningStartScreen"));

export default function LearningStartRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { hydrated } = useAppState();
  const fallback = <Screen><ActivityIndicator /></Screen>;
  return hydrated ? <Suspense fallback={fallback}><LearningStartScreen fromSettings={from === "settings"} /></Suspense> : fallback;
}
