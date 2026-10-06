import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Screen } from "../common/Screen";
import { PixelRoom, SeodangDog } from "../pet/SeodangDog";
import { usePetMotion } from "../pet/usePetMotion";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../design/theme";
import { useI18n } from "../../i18n/useI18n";
import { getLearningStartStep, LEARNING_STAGES } from "../../domain/learning/learningStage";
import type { LearningStage } from "../../types/app-state";

export default function LearningStartScreen({ fromSettings = false }: { fromSettings?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const { animate } = usePetMotion();
  const { colors, textStyles, buttonStyles, surfaceStyles, themeMode } = useTheme();
  const { learningStage, learningWelcomeSeen, markLearningWelcomeSeen, chooseLearningStage } = useAppState();
  const [step, setStep] = useState(() => getLearningStartStep({ fromSettings, learningStage, learningWelcomeSeen }));
  const [selected, setSelected] = useState<LearningStage | undefined>(learningStage);
  const [happy, setHappy] = useState(false);
  const submitted = useRef(false);
  const welcome = !fromSettings && step === "welcome";
  const dogSize = Math.max(140, Math.min(240, width - 100, height * 0.3));
  const title = t(fromSettings ? "stage.change" : welcome ? "stage.welcomeTitle" : "stage.question");
  const styles = StyleSheet.create({
    screen: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
    frame: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
    header: { minHeight: 56, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
    steps: { flexDirection: "row", gap: 6 },
    step: { width: 24, height: 4, borderRadius: 2 },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 20, flexGrow: 1 },
    welcomeContent: { justifyContent: "center", gap: 28 },
    title: { ...textStyles.displaySm, lineHeight: 32 },
    scene: { height: dogSize + 60, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "flex-end", paddingBottom: 12 },
    loop: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", gap: 4 },
    loopItem: { alignItems: "center", gap: 8 },
    loopIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center" },
    option: { ...surfaceStyles.card, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 78 },
    footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
    primary: { ...buttonStyles.primary, minHeight: 52, justifyContent: "center" },
    primaryText: { ...textStyles.buttonLabel, color: colors.inkOnDark, textAlign: "center" },
    cancel: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  });
  const submit = () => {
    if (welcome) {
      markLearningWelcomeSeen();
      setStep("difficulty");
      return;
    }
    if (!selected || submitted.current) return;
    submitted.current = true;
    chooseLearningStage(selected);
    if (fromSettings) router.dismissTo("/settings");
    else router.replace({ pathname: "/today-lesson", params: { startWriting: selected === "starter" ? "1" : "0" } });
  };
  return <Screen edges={["top", "left", "right", "bottom"]} scrollContainer={false} contentStyle={styles.screen}>
    <View style={styles.frame}>
      {!fromSettings ? <View style={styles.header}>
        {welcome ? <Text style={textStyles.titleMd}>{t("common.appName")}</Text> :
          <Pressable accessibilityRole="button" accessibilityLabel={t("stage.back")} onPress={() => setStep("welcome")}
            style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.bgMuted }]}>
            <Ionicons name="arrow-back" size={22} color={colors.inkStrong} />
          </Pressable>}
        <View style={styles.steps} accessible accessibilityLabel={t("stage.step", { count: welcome ? 1 : 2, total: 2 })}>
          {[0, 1].map(index => <View key={index} style={[styles.step, { backgroundColor: index <= (welcome ? 0 : 1) ? colors.accentWarm : colors.borderSoft }]} />)}
        </View>
      </View> : null}
      <ScrollView key={welcome ? "welcome" : "difficulty"} contentContainerStyle={[styles.content, welcome && styles.welcomeContent]}
        showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={[styles.title, welcome && { textAlign: "center" }]}>{title}</Text>
        {welcome ? <>
          <View style={styles.scene}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}><PixelRoom dark={themeMode === "dark"} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel={t("pet.petAction")} onPress={() => setHappy(value => !value)}>
              <SeodangDog size={dogSize} happy={happy} animate={animate} />
            </Pressable>
          </View>
          <View style={styles.loop}>
            {(["book-outline", "restaurant-outline", "paw-outline"] as const).map((icon, index) => <View key={icon} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {index > 0 ? <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} /> : null}
              <View style={styles.loopItem}>
                <View style={styles.loopIcon}><Ionicons name={icon} size={24} color={colors.accentWarmMuted} /></View>
                <Text style={textStyles.meta}>{t(["stage.learn", "stage.snack", "stage.grow"][index])}</Text>
              </View>
            </View>)}
          </View>
        </> : <View accessibilityRole="radiogroup" accessibilityLabel={title} style={{ gap: 10 }}>
          {LEARNING_STAGES.map(stage => <Pressable key={stage} accessibilityRole="radio"
            accessibilityLabel={t("stage." + stage + ".label")} accessibilityState={{ checked: selected === stage }}
            onPress={() => setSelected(stage)}
            style={[styles.option, selected === stage && { backgroundColor: colors.bgMuted, borderColor: colors.inkStrong }]}>
            <Ionicons name={selected === stage ? "radio-button-on" : "radio-button-off"} size={22} color={colors.inkStrong} />
            <Text lineBreakStrategyIOS="hangul-word" style={[textStyles.titleSm, { flex: 1 }]}>{t("stage." + stage + ".label")}</Text>
          </Pressable>)}
        </View>}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !welcome && !selected }} disabled={!welcome && !selected}
          style={[styles.primary, !welcome && !selected && { opacity: 0.45 }]} onPress={submit}>
          <Text style={styles.primaryText}>{t(fromSettings ? "stage.save" : welcome ? "stage.meet" : "stage.finish")}</Text>
        </Pressable>
        {fromSettings ? <Pressable accessibilityRole="button" style={styles.cancel} onPress={() => router.dismissTo("/settings")}>
          <Text style={textStyles.meta}>{t("stage.cancel")}</Text>
        </Pressable> : null}
      </View>
    </View>
  </Screen>;
}
