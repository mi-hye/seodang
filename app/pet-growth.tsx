import { lazy, Suspense } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Screen } from "../src/components/common/Screen";
import { useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";

export { ErrorBoundary } from "expo-router";

// Keep the optional gallery out of the initial web route bundle.
const PetGrowthGuide = lazy(() => import("../src/components/pet/PetGrowthGuide"));

export default function PetGrowthScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, textStyles } = useTheme();
  const { hydrated } = useAppState();
  const close = () => router.canGoBack() ? router.back() : router.replace("/");
  const loading = <Screen><ActivityIndicator accessibilityLabel={t("common.loading")} /></Screen>;
  return <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      {/* Keep both controls in the sheet itself, outside native bar sizing. */}
      <SafeAreaView edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <View style={styles.button} />
          <Text accessibilityRole="header" style={[textStyles.titleMd, styles.title]}>{t("pet.guide.title")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("pet.guide.close")}
            onPress={close} style={({ pressed }) => [styles.button, { backgroundColor: pressed ? colors.bgMuted : "transparent" }]}>
            <Ionicons name="close" size={24} color={colors.inkStrong} allowFontScaling={false} />
          </Pressable>
        </View>
      </SafeAreaView>
    {hydrated ? <Suspense fallback={loading}><PetGrowthGuide /></Suspense> : loading}
  </SafeAreaProvider>;
}

const styles = StyleSheet.create({
  header: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  title: { flex: 1, textAlign: "center" },
  button: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
