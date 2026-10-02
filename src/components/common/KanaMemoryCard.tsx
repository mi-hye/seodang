import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { KanjiCharacter } from "../../data/characters";
import { useTheme } from "../../design/theme";
import { useI18n } from "../../i18n/useI18n";
import { KanaText } from "./KanaText";

export function KanaMemoryCard({ character }: { character: KanjiCharacter }) {
  const [expanded, setExpanded] = useState(false);
  const { locale, t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const kana = character.kana;
  if (!kana?.memory) return null;
  const memory = kana.memory;
  const formation = memory.formation?.split(" → ");
  const comparisons = memory.contrast?.split(" / ") ?? [];
  const styles = StyleSheet.create({
    card: { ...surfaceStyles.card, padding: 18, marginBottom: 12, gap: 14 },
    title: textStyles.titleSm,
    label: { ...textStyles.caption, color: colors.inkMuted },
    formation: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 6 },
    formula: { ...textStyles.displaySm, fontSize: 28, flexShrink: 1 },
    target: { color: colors.accentWarm },
    wordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    wordContent: { flex: 1, gap: 3 },
    word: { ...textStyles.titleSm, fontSize: 23 },
    comparison: { gap: 6 },
    comparisonRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", gap: 16, paddingVertical: 8 },
    comparisonItem: { flexDirection: "row", alignItems: "baseline", gap: 16 },
    comparisonText: { ...textStyles.displaySm, fontSize: 28 },
    separator: { ...textStyles.bodySm, color: colors.inkMuted },
    disclosure: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 6 },
    details: { gap: 10 },
    body: textStyles.bodySm,
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("kana.memory.title")}</Text>
      {formation ? (
        <View style={styles.formation} accessibilityLabel={memory.formation} accessible>
          <KanaText numberOfLines={1} adjustsFontSizeToFit style={styles.formula}>{formation[0]}</KanaText>
          <Ionicons name="arrow-forward" size={20} color={colors.inkMuted} />
          <KanaText numberOfLines={1} adjustsFontSizeToFit style={[styles.formula, styles.target]}>{formation[1]}</KanaText>
        </View>
      ) : kana.counterpart ? (
        <View style={styles.formation} accessibilityLabel={`${t("kana.counterpart")}: ${character.literal}, ${kana.counterpart}`} accessible>
          <KanaText style={[styles.formula, styles.target]}>{character.literal}</KanaText>
          <Ionicons name="swap-horizontal" size={20} color={colors.inkMuted} />
          <KanaText style={styles.formula}>{kana.counterpart}</KanaText>
          <Text style={styles.label}>{t("kana.memory.sameSound")}</Text>
        </View>
      ) : null}

      {memory.word ? (
        <View style={styles.wordRow}>
          <View style={styles.wordContent}>
            <KanaText style={styles.word} highlight={character.literal} highlightColor={colors.accentWarm}>{memory.word}</KanaText>
            {locale === "ko" ? <Text style={styles.label}>{memory.wordMeaningKo}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t("kana.memory.listen")}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.bgMuted }}
            onPress={() => { Speech.stop(); Speech.speak(memory.word!, { language: "ja-JP", rate: 0.7 }); }}>
            <Ionicons name="volume-high-outline" size={20} color={colors.accentWarmMuted} />
          </Pressable>
        </View>
      ) : null}

      {comparisons.length > 0 ? (
        <View style={styles.comparison}>
          <Text style={styles.label}>{t("kana.memory.shapeCompare")}</Text>
          <View style={styles.comparisonRow} accessible accessibilityRole="text" accessibilityLabel={memory.contrast}>
            {comparisons.map((literal, index) => (
              <View key={literal} style={styles.comparisonItem}>
                {index > 0 ? <Text style={styles.separator}>/</Text> : null}
                <KanaText style={[styles.comparisonText, literal === character.literal && styles.target]}>{literal}</KanaText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.disclosure}
        onPress={() => setExpanded((value) => !value)}
      >
        <Text style={styles.label}>{t(expanded ? "kana.memory.less" : "kana.memory.more")}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.inkMuted} />
      </Pressable>
      {expanded ? (
        <View style={styles.details}>
          <Text style={styles.body}>{locale === "ja" ? memory.cueJa : memory.cueKo}</Text>
          {kana.noteKo ? <Text style={styles.body}>{locale === "ja" ? kana.noteJa : kana.noteKo}</Text> : null}
          {["は", "へ", "を", "ん"].includes(kana.reading) ? <Text style={styles.body}>{t(`kana.note.${kana.reading}`)}</Text> : null}
          {memory.contrast ? <Text style={styles.body}>{locale === "ja" ? memory.contrastJa : memory.contrastKo}</Text> : null}
          <Text style={styles.body}>{t("kana.memory.practice")}</Text>
        </View>
      ) : null}
    </View>
  );
}
