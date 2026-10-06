import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../common/Screen";
import { useTheme } from "../../design/theme";
import { useI18n } from "../../i18n/useI18n";
import { useAppState } from "../../state/AppStateProvider";
import { getPetGrowth } from "../../domain/pet/learningPet";
import { PET_APPEARANCES } from "../../domain/pet/petAppearance";
import { SeodangDog } from "./SeodangDog";

export default function PetGrowthGuide() {
  const { learningPet } = useAppState();
  const growth = getPetGrowth(learningPet);
  const { t } = useI18n();
  const { colors, textStyles } = useTheme();
  const styles = StyleSheet.create({
    content: { width: "100%", maxWidth: 540, alignSelf: "center", gap: 20 },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
    card: { width: "48%", padding: 12, alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 20, borderColor: colors.borderSoft, backgroundColor: colors.bgSurface },
    current: { borderColor: colors.accentWarm, backgroundColor: colors.bgMuted },
  });
  return <Screen>
    <View style={styles.content}>
      <View style={styles.grid}>
        {PET_APPEARANCES.map((entry) => {
          const current = entry.stage === growth.stage;
          const reached = entry.stage < growth.stage;
          const status = t(current ? "pet.guide.current" : reached ? "pet.guide.reached" : "pet.guide.future");
          return <View key={entry.stage} style={[styles.card, current && styles.current]}
            accessible accessibilityLabel={`${t("pet.level", { level: entry.level })}, ${t(`pet.guide.stage${entry.stage}`)}, ${status}`}>
            <Text style={textStyles.titleSm}>{t("pet.level", { level: entry.level })}</Text>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <SeodangDog stage={entry.stage} size={104} />
            </View>
          </View>;
        })}
      </View>
    </View>
  </Screen>;
}
