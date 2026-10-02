import { lazy, Suspense } from "react";
import { ActivityIndicator } from "react-native";
import { Screen } from "../src/components/common/Screen";

const WritingHistoryScreen = lazy(() => import("../src/components/review/WritingHistoryScreen"));

export default function WritingHistoryRoute() {
  return (
    <Suspense fallback={<Screen><ActivityIndicator accessibilityLabel="Loading" /></Screen>}>
      <WritingHistoryScreen />
    </Suspense>
  );
}
