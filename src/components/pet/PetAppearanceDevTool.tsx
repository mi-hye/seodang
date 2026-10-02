import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../design/theme";
import { useAppState } from "../../state/AppStateProvider";
import { getPetGrowth } from "../../domain/pet/learningPet";
import { PET_APPEARANCES, getPetAppearance } from "../../domain/pet/petAppearance";
import { SeodangDog } from "./SeodangDog";
import { usePetMotion } from "./usePetMotion";

// SEODANG_PET_DEV_PREVIEW: release-export absence is checked during verification.
// Local display state only: no feedPet / state setter / AsyncStorage writes.
export default function PetAppearanceDevTool({ onClose }: { onClose: () => void }) {
  const { learningPet } = useAppState();
  const actual = getPetGrowth(learningPet);
  const [level, setLevel] = useState(actual.level);
  const [happy, setHappy] = useState(false);
  const [moving, setMoving] = useState(false);
  const appearance = getPetAppearance(level);
  const { colors, textStyles, buttonStyles } = useTheme();
  const { animate } = usePetMotion();
  const { width } = useWindowDimensions();
  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgCanvas },
    content: { padding: 20, gap: 18, maxWidth: 620, width: "100%", alignSelf: "center" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.bgSurface },
    preview: { backgroundColor: colors.bgMuted, borderRadius: 24, padding: 16, alignItems: "center", gap: 6 },
    tiny: { alignItems: "center", padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, gap: 4, backgroundColor: colors.bgSurface },
    primary: { ...buttonStyles.primary, minHeight: 48, justifyContent: "center" },
  });
  if (!__DEV__) return null;
  return <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Text style={[textStyles.titleMd, { flex: 1 }]}>DEV · 서당개 외형</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="외형 미리보기 닫기" onPress={onClose} style={styles.chip}><Text style={textStyles.meta}>닫기</Text></Pressable>
        </View>
        <Text style={textStyles.caption}>미리보기 전용 · 실제 Lv.{actual.level} / 간식 {learningPet.food}개는 바뀌지 않아요.</Text>
        <View style={styles.preview}>
          <Text style={textStyles.titleSm}>Lv.{level} · 외형 {appearance.stage}/5</Text>
          <Text style={textStyles.caption}>{appearance.resolution} × {appearance.resolution} px</Text>
          <SeodangDog stage={appearance.stage} happy={happy} animate={moving && animate} size={Math.min(280, width - 80)} />
        </View>
        <View style={styles.chips}>
          {PET_APPEARANCES.map((entry) => <Pressable key={entry.stage} accessibilityRole="button" accessibilityLabel={`Lv.${entry.level} 외형 보기`}
            accessibilityState={{ selected: appearance.stage === entry.stage }} onPress={() => setLevel(entry.level)}
            style={[styles.chip, appearance.stage === entry.stage && { backgroundColor: colors.bgMuted, borderColor: colors.inkStrong }]}>
            <Text style={textStyles.meta}>Lv.{entry.level}</Text>
          </Pressable>)}
        </View>
        <View style={styles.chips}>
          <Pressable accessibilityRole="button" accessibilityLabel="미리보기 레벨 1 내리기" disabled={level <= 1} onPress={() => setLevel(Math.max(1, level - 1))} style={styles.chip}><Text style={textStyles.meta}>−1 레벨</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="미리보기 레벨 1 올리기" onPress={() => setLevel(level + 1)} style={styles.chip}><Text style={textStyles.meta}>+1 레벨</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setLevel(actual.level)} style={styles.chip}><Text style={textStyles.meta}>실제 레벨로</Text></Pressable>
        </View>
        <View style={styles.chips}>
          <Pressable accessibilityRole="switch" accessibilityLabel="기쁜 표정" accessibilityState={{ checked: happy }} onPress={() => setHappy(!happy)} style={styles.chip}><Text style={textStyles.meta}>기쁜 표정 {happy ? "ON" : "OFF"}</Text></Pressable>
          <Pressable accessibilityRole="switch" accessibilityLabel="꼬리 움직임" accessibilityState={{ checked: moving }} onPress={() => setMoving(!moving)} style={styles.chip}><Text style={textStyles.meta}>꼬리 움직임 {moving ? "ON" : "OFF"}</Text></Pressable>
        </View>
        {moving && !animate ? <Text style={textStyles.caption}>기기의 동작 줄이기 설정 또는 앱 상태에 따라 움직임이 멈출 수 있어요.</Text> : null}
        <Text style={textStyles.titleSm}>같은 크기로 비교</Text>
        <View style={styles.chips}>
          {PET_APPEARANCES.map((entry) => <Pressable key={entry.stage} accessibilityRole="button" accessibilityLabel={`${entry.resolution}픽셀 외형 비교`}
            onPress={() => setLevel(entry.level)} style={styles.tiny}>
            <SeodangDog stage={entry.stage} size={104} />
            <Text style={textStyles.meta}>Lv.{entry.level}</Text>
            <Text style={textStyles.caption}>{entry.resolution}px</Text>
          </Pressable>)}
        </View>
        <Text style={textStyles.caption}>Lv.1–9 / 10–19 / 20–29 / 30–39 / 40+{ "\n" }40레벨 이후에도 레벨은 오르고 외형은 5단계를 유지해요.</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.primary}><Text style={[textStyles.buttonLabel, { color: colors.inkOnDark, textAlign: "center" }]}>미리보기 끝내기</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
