import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Screen } from "../src/components/common/Screen";
import { PetHomeCard } from "../src/components/pet/PetHomeCard";
import { getAppTextScale, scaledFont } from "../src/design/fontScalingConfig";
import { useTheme } from "../src/design/theme";
import { useReviewClock } from "../src/domain/review/useReviewClock";
import { useI18n } from "../src/i18n/useI18n";
import { useAppState } from "../src/state/AppStateProvider";
import { lazy, Suspense, useState } from "react";

// Metro removes the branch and module in release builds. No debug route or
// persisted preview override exists in the production navigation/state.
const PetAppearanceDevTool = __DEV__ ? lazy(() => import("../src/components/pet/PetAppearanceDevTool")) : null;

export default function HomeScreen() {
  const router = useRouter();
  const now = useReviewClock();
  const { t } = useI18n();
  const { colors, textStyles } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const textScale = Math.min(1, Math.max(0.84, width / 390)) * getAppTextScale(fontScale);
  const { hydrated, learningStage } = useAppState();
  const [showPetDevTool, setShowPetDevTool] = useState(false);
  if (!hydrated) return <Screen><ActivityIndicator /></Screen>;
  if (!learningStage) return <Redirect href="/learning-start" />;

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[textStyles.displayLg, { fontSize: scaledFont(28, textScale), lineHeight: scaledFont(34, textScale) }]}>{t("home.title")}</Text>
          <View style={styles.actions}>
            {__DEV__ ? <Pressable accessibilityRole="button" accessibilityLabel="DEV · 외형 미리보기" onPress={() => setShowPetDevTool(true)}
              style={[styles.iconButton, { backgroundColor: colors.bgSurface, borderColor: colors.borderSoft }]}>
              <Ionicons name="flask-outline" size={18} color={colors.inkStrong} />
            </Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={t("nav.search")} onPress={() => router.push("/search")}
              style={[styles.iconButton, { backgroundColor: colors.bgSurface, borderColor: colors.borderSoft }]}>
              <Ionicons name="search-outline" size={18} color={colors.inkStrong} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("nav.settings")} onPress={() => router.push("/settings")}
              style={[styles.iconButton, { backgroundColor: colors.bgSurface, borderColor: colors.borderSoft }]}>
              <Ionicons name="settings-outline" size={18} color={colors.inkStrong} />
            </Pressable>
          </View>
        </View>
        <PetHomeCard now={now} />
        {__DEV__ && showPetDevTool && PetAppearanceDevTool ? <Suspense fallback={<ActivityIndicator />}>
          <PetAppearanceDevTool onClose={() => setShowPetDevTool(false)} />
        </Suspense> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 620, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 },
  actions: { flexDirection: "row", gap: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
