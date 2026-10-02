import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../design/theme";
import { useAppState } from "../../state/AppStateProvider";
import { useI18n } from "../../i18n/useI18n";
import { DAILY_FOOD_LIMIT, FEEDS_PER_LEVEL, getPetGrowth, getTodayPetRewards } from "../../domain/pet/learningPet";
import { SeodangDog, PixelRoom, FoodBowl } from "./SeodangDog";
import { usePetMotion } from "./usePetMotion";
import { getPetRoomLayout } from "../../domain/pet/petRoomLayout";

export function PetHomeCard({ now, disabled = false }: { now: Date; disabled?: boolean }) {
  const { learningPet: pet, feedPet, hydrated } = useAppState();
  const { t } = useI18n();
  const { colors, textStyles, themeMode } = useTheme();
  const growth = getPetGrowth(pet);
  const earned = getTodayPetRewards(pet, now);
  const [reaction, setReaction] = useState<"feed" | "pet" | null>(null);
  const happy = reaction !== null;
  const feedingDisabled = disabled || !hydrated || pet.food === 0 || happy;
  const { active, animate } = usePetMotion();
  const { width, height } = useWindowDimensions();
  const { roomHeight, dogSize } = getPetRoomLayout(width, height, growth.stage);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bounce = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) {
      bounce.stopAnimation();
      bounce.setValue(0);
      return;
    }
    const stroll = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: 1800, useNativeDriver: true, isInteraction: false }),
      Animated.timing(idle, { toValue: -1, duration: 3000, useNativeDriver: true, isInteraction: false }),
      Animated.timing(idle, { toValue: 0, duration: 1800, useNativeDriver: true, isInteraction: false }),
    ]));
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 1200, useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration: 1200, useNativeDriver: true, isInteraction: false }),
    ]));
    stroll.start();
    breathing.start();
    return () => {
      stroll.stop();
      breathing.stop();
      idle.setValue(0);
      breath.setValue(0);
      bounce.stopAnimation();
      bounce.setValue(0);
    };
  }, [animate, bounce, breath, idle]);
  useEffect(() => {
    if (!active) {
      clearTimeout(timer.current);
      locked.current = false;
      setReaction(null);
    }
    return () => { clearTimeout(timer.current); };
  }, [active]);

  const react = (kind: "feed" | "pet") => {
    if (!hydrated || disabled || !active || locked.current || (kind === "feed" && pet.food < 1)) return;
    locked.current = true;
    if (kind === "feed") feedPet();
    setReaction(kind);
    if (animate) {
      Animated.sequence([
        Animated.timing(bounce, { toValue: -18, duration: 170, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: -10, duration: 160, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
    timer.current = setTimeout(() => { locked.current = false; setReaction(null); }, 1800);
  };
  const styles = StyleSheet.create({
    card: { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.bgSurface, marginBottom: 8 },
    header: { paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: colors.bgMuted },
    scene: { height: roomHeight, overflow: "hidden" },
    dog: { position: "absolute", alignSelf: "center", bottom: roomHeight * 0.07 },
    bubble: { position: "absolute", alignSelf: "center", top: 18, backgroundColor: colors.bgSurface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
    footer: { padding: 18, gap: 14 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    track: { height: 9, borderRadius: 5, backgroundColor: colors.bgMuted, overflow: "hidden", marginTop: 9 },
    feed: { position: "absolute", right: "5%", bottom: roomHeight * 0.03, width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 12 },
    dots: { flexDirection: "row", gap: 4 },
  });
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={textStyles.titleMd}>{t("pet.name")}</Text>
          <Text style={textStyles.caption}>{t("pet.proverb")}</Text>
        </View>
        <View style={styles.badge}><Ionicons name="restaurant-outline" size={16} color={colors.accentWarmMuted} /><Text style={textStyles.meta}>{hydrated ? pet.food : "—"}</Text></View>
      </View>
      <View style={styles.scene}>
        <PixelRoom dark={themeMode === "dark"} />
        <Animated.View testID="seodang-dog-motion" style={[styles.dog, { transform: [
          { translateX: idle.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) },
          { translateY: Animated.add(bounce, breath.interpolate({ inputRange: [0, 1], outputRange: [0, -3] })) },
          { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
        ] }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("pet.petAction")} accessibilityHint={t("pet.appearance", { level: growth.level })}
            disabled={!hydrated || disabled || happy} onPress={() => react("pet")}>
            <SeodangDog stage={growth.stage} happy={happy} size={dogSize} animate={animate} />
          </Pressable>
        </Animated.View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("pet.feed")}
          accessibilityState={{ disabled: feedingDisabled }} disabled={feedingDisabled}
          onPress={() => react("feed")}
          style={({ pressed }) => [styles.feed, { opacity: disabled || !hydrated ? 0.45 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
          <FoodBowl filled={hydrated && pet.food > 0} />
        </Pressable>
        <View pointerEvents="none" style={styles.bubble}>
          <Text style={textStyles.meta} accessibilityLiveRegion="polite">{t(reaction === "pet" ? "pet.petted" : reaction === "feed" ? "pet.happy" : "pet.greeting")}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={[textStyles.caption, { textAlign: "center" }]}>{t("pet.touchHint")}</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={textStyles.meta}>{t("pet.level", { level: growth.level })} · {growth.progress}/{FEEDS_PER_LEVEL}</Text>
            <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={t("pet.growth")} accessibilityValue={{ min: 0, max: FEEDS_PER_LEVEL, now: growth.progress }}><View style={{ height: "100%", width: `${growth.progress / FEEDS_PER_LEVEL * 100}%`, backgroundColor: colors.accentWarm }} /></View>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={[textStyles.caption, { flex: 1 }]} accessibilityLiveRegion="polite">{t(reaction === "feed" ? "pet.growthThanksShort" : earned === DAILY_FOOD_LIMIT ? "pet.todayDoneShort" : "pet.todayTaskShort")}</Text>
          <View style={styles.dots} accessible accessibilityLabel={t("pet.todayProgress", { count: earned, total: DAILY_FOOD_LIMIT })}>
            {Array.from({ length: DAILY_FOOD_LIMIT }, (_, index) => <Ionicons key={index} name={index < earned ? "checkmark-circle" : "ellipse-outline"} size={17} color={index < earned ? colors.success : colors.inkFaint} />)}
          </View>
        </View>
      </View>
    </View>
  );
}
