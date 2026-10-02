import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../common/Screen";
import { SeodangDog } from "../pet/SeodangDog";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../design/theme";
import { useI18n } from "../../i18n/useI18n";
import { LEARNING_STAGES } from "../../domain/learning/learningStage";
import type { LearningStage } from "../../types/app-state";

export default function LearningStartScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, textStyles, buttonStyles, surfaceStyles } = useTheme();
  const { learningStage, learningWelcomeSeen, markLearningWelcomeSeen, chooseLearningStage } = useAppState();
  const [selected, setSelected] = useState<LearningStage | undefined>(learningStage);
  const submitted = useRef(false);
  const styles = StyleSheet.create({
    content: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 14, paddingTop: 12 },
    intro: { ...surfaceStyles.card, alignItems: "center", gap: 20, padding: 24 },
    option: { ...surfaceStyles.card, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 78 },
    primary: { ...buttonStyles.primary, minHeight: 52, justifyContent: "center" },
    primaryText: { ...textStyles.buttonLabel, color: colors.inkOnDark, textAlign: "center" },
    center: { textAlign: "center" },
    cancel: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  });
  return <Screen edges={["top", "left", "right", "bottom"]}>
    <View style={styles.content}>
      {!learningWelcomeSeen && !learningStage ? <>
        <View style={styles.intro}>
          <SeodangDog size={148} />
          <Text style={[textStyles.titleMd, styles.center]}>{t("stage.welcomeTitle")}</Text>
          <Text style={[textStyles.bodySm, styles.center]}>{t("stage.welcomeBody")}</Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.primary} onPress={markLearningWelcomeSeen}>
          <Text style={styles.primaryText}>{t("stage.meet")}</Text>
        </Pressable>
      </> : <>
        <Text style={textStyles.titleMd}>{t("stage.question")}</Text>
        <Text style={textStyles.bodySm}>{t("stage.body")}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t("stage.question")} style={{ gap: 10 }}>
          {LEARNING_STAGES.map((stage) => <Pressable key={stage} accessibilityRole="radio"
            accessibilityLabel={t("stage." + stage + ".label")} accessibilityState={{ checked: selected === stage }}
            onPress={() => setSelected(stage)}
            style={[styles.option, selected === stage && { backgroundColor: colors.bgMuted, borderColor: colors.inkStrong }]}>
            <Ionicons name={selected === stage ? "radio-button-on" : "radio-button-off"} size={22} color={colors.inkStrong} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={textStyles.titleSm}>{t("stage." + stage + ".label")}</Text>
              <Text style={textStyles.caption}>{t("stage." + stage + ".body")}</Text>
            </View>
          </Pressable>)}
        </View>
        <Text style={textStyles.caption}>{t(learningStage ? "stage.changeHint" : "stage.firstHint")}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !selected }} disabled={!selected}
          style={[styles.primary, !selected && { opacity: 0.45 }]} onPress={() => {
            if (!selected || submitted.current) return;
            submitted.current = true;
            chooseLearningStage(selected);
            router.replace("/today-lesson");
          }}>
          <Text style={styles.primaryText}>{t("stage.start")}</Text>
        </Pressable>
        {learningStage ? <Pressable accessibilityRole="button" style={styles.cancel} onPress={() => router.dismissTo("/learn")}><Text style={textStyles.meta}>{t("stage.cancel")}</Text></Pressable> : null}
      </>}
    </View>
  </Screen>;
}
