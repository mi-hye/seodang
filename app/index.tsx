import { Link, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { sampleCharacters } from "../src/data/characters";
import {
  buttonStyles,
  chipStyles,
  colors,
  radius,
  shadows,
  spacing,
  surfaceStyles,
  textStyles,
} from "../src/design/theme";
import { useAppState } from "../src/state/AppStateProvider";

export default function HomeScreen() {
  const router = useRouter();
  const featured = sampleCharacters[0];
  const { hydrated, reviewCount, setUserType, userType } = useAppState();

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Japanese Kanji Writing Practice</Text>
        <Text style={styles.title}>손으로 익히는 일본어 한자</Text>
        <Text style={styles.subtitle}>
          한국인 학습자와 일본 초중등 사용자를 함께 고려한 쓰기 연습 앱 프로토타입
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/list")}
        style={[styles.primaryCard, styles.shadow]}
      >
        <Text style={styles.primaryLabel}>오늘의 학습 시작</Text>
        <Text style={styles.primaryBody}>
          기초 한자부터 획순 확인, 쓰기 연습, 복습까지 바로 시작합니다.
        </Text>
      </Pressable>

      <View style={styles.row}>
        <Pressable
          onPress={() => router.push("/review")}
          style={[styles.miniCard, styles.shadow]}
        >
          <Text style={styles.miniNumber}>{hydrated ? reviewCount : "-"}</Text>
          <Text style={styles.miniLabel}>복습 필요</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/character/${featured.id}`)}
          style={[styles.miniCard, styles.shadow]}
        >
          <Text style={styles.miniNumber}>{featured.literal}</Text>
          <Text style={styles.miniLabel}>추천 한자</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>학습 트랙</Text>
        <View style={styles.trackList}>
          <Pressable
            style={[
              styles.trackCard,
              userType === "korean_learner" && styles.trackCardSelected,
            ]}
            onPress={() => setUserType("korean_learner")}
          >
            <Text style={styles.trackTitle}>한국인 학습자</Text>
            <Text style={styles.trackBody}>뜻, 음독/훈독, JLPT 기준으로 학습</Text>
          </Pressable>
          <Pressable
            style={[
              styles.trackCard,
              userType === "japanese_student" && styles.trackCardSelected,
            ]}
            onPress={() => setUserType("japanese_student")}
          >
            <Text style={styles.trackTitle}>일본 초중등</Text>
            <Text style={styles.trackBody}>학년별 반복 훈련과 오답 복습 중심</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 세트</Text>
        {sampleCharacters.slice(0, 3).map((character) => (
          <Link
            key={character.id}
            href={`/character/${character.id}`}
            asChild
          >
            <Pressable style={styles.listCard}>
              <Text style={styles.listKanji}>{character.literal}</Text>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{character.meaningKo}</Text>
                <Text style={styles.listMeta}>
                  JLPT {character.jlptLevel} · {character.strokeCount}획
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing[7],
    gap: spacing[2] + 2,
  },
  eyebrow: textStyles.eyebrow,
  title: textStyles.displayLg,
  subtitle: textStyles.bodyMd,
  primaryCard: {
    ...surfaceStyles.heroDark,
    padding: spacing[7],
    marginBottom: spacing[4],
  },
  primaryLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.inkOnDark,
    marginBottom: spacing[2],
  },
  primaryBody: {
    color: colors.inkOnDarkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[7],
  },
  miniCard: {
    flex: 1,
    ...surfaceStyles.card,
    padding: spacing[6],
    minHeight: 120,
    justifyContent: "space-between",
  },
  miniNumber: {
    ...textStyles.glyphMd,
  },
  miniLabel: {
    fontSize: 14,
    color: "#617565",
    fontWeight: "700",
  },
  section: surfaceStyles.pageSection,
  sectionTitle: {
    ...textStyles.sectionTitle,
    marginBottom: 14,
  },
  trackList: {
    gap: spacing[3],
  },
  trackCard: {
    ...surfaceStyles.mutedCard,
    padding: 18,
  },
  trackCardSelected: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgMutedStrong,
  },
  trackTitle: {
    ...textStyles.titleSm,
    marginBottom: 6,
  },
  trackBody: {
    ...textStyles.bodySm,
    lineHeight: 20,
  },
  listCard: {
    ...surfaceStyles.card,
    borderRadius: radius.sm,
    padding: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  listKanji: {
    width: 54,
    ...textStyles.glyphSm,
    textAlign: "center",
  },
  listContent: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    ...textStyles.titleSm,
    fontWeight: "700",
  },
  listMeta: textStyles.caption,
  shadow: shadows.card,
});
