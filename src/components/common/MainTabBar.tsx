import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../design/theme";
import { MAIN_TABS } from "../../domain/navigation/mainTabs";
import { useI18n } from "../../i18n/useI18n";
import { useAppState } from "../../state/AppStateProvider";

export function MainTabBar({ activeKey }: { activeKey: (typeof MAIN_TABS)[number]["key"] }) {
  const router = useRouter();
  const { colors, textStyles } = useTheme();
  const { t } = useI18n();
  const { hydrated } = useAppState();

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ backgroundColor: colors.bgSurface, borderTopWidth: 1, borderTopColor: colors.borderSoft }}>
      <View accessibilityRole="tablist" accessibilityLabel={t("tabs.label")} style={styles.bar}>
        {MAIN_TABS.map((tab) => {
          const selected = activeKey === tab.key;
          const color = selected ? colors.inkStrongAlt : colors.inkMuted;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={t(`tabs.${tab.key}`)}
              accessibilityState={{ selected, disabled: !hydrated }}
              aria-selected={selected}
              disabled={!hydrated}
              onPress={() => {
                if (selected) return;
                // Reuse a route already in the stack, otherwise replace this tab.
                router.dismissTo(tab.path);
              }}
              style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.65 : 1 }]}
            >
              <View style={[styles.icon, { backgroundColor: selected ? colors.bgMuted : "transparent" }]}>
                <Ionicons name={selected ? tab.activeIcon : tab.icon} size={21} color={color} />
              </View>
              <Text style={[textStyles.caption, { color, fontWeight: selected ? "800" : "500" }]}>{t(`tabs.${tab.key}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", width: "100%", maxWidth: 660, alignSelf: "center", paddingHorizontal: 8, paddingTop: 6, paddingBottom: 6 },
  tab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  icon: { width: 48, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
