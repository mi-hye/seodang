import { lazy, Suspense } from "react";
import { ActivityIndicator } from "react-native";
import { Screen } from "../src/components/common/Screen";
import { useAppState } from "../src/state/AppStateProvider";

const LearningStartScreen = lazy(() => import("../src/components/learning/LearningStartScreen"));

export default function LearningStartRoute() {
  const { hydrated } = useAppState();
  const fallback = <Screen><ActivityIndicator /></Screen>;
  return hydrated ? <Suspense fallback={fallback}><LearningStartScreen /></Suspense> : fallback;
}
