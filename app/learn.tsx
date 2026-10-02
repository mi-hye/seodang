import { lazy, Suspense } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { Screen } from "../src/components/common/Screen";
import { useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

const LearningScreen = lazy(() => import("../src/components/learning/LearningScreen"));

export default function LearningRoute() {
  const { t } = useI18n();
  const { colors, textStyles } = useTheme();
  const { hydrated, learningStage } = useAppState();
  if (!hydrated) return <Screen><ActivityIndicator /></Screen>;
  if (!learningStage) return <Redirect href="/learning-start" />;
  return (
    <Suspense fallback={
      <Screen edges={["top", "left", "right", "bottom"]}>
        <View style={{ width: "100%", maxWidth: 620, alignSelf: "center", gap: 24 }}>
          <Text style={textStyles.titleMd}>{t("tabs.learn")}</Text>
          <ActivityIndicator color={colors.inkStrong} accessibilityLabel={t("home.action.loading")} />
        </View>
      </Screen>
    }>
      <LearningScreen />
    </Suspense>
  );
}
