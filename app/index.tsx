import { Link, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { sampleCharacters } from "../src/data/characters";
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
    marginBottom: 24,
    gap: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#8b5e34",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#173221",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#4d5f52",
  },
  primaryCard: {
    backgroundColor: "#1d3b2a",
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
  },
  primaryLabel: {
    color: "#f7f1e8",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  primaryBody: {
    color: "#dce7de",
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  miniCard: {
    flex: 1,
    backgroundColor: "#fffaf3",
    borderRadius: 24,
    padding: 20,
    minHeight: 120,
    justifyContent: "space-between",
  },
  miniNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: "#173221",
  },
  miniLabel: {
    fontSize: 14,
    color: "#617565",
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#173221",
    marginBottom: 14,
  },
  trackList: {
    gap: 12,
  },
  trackCard: {
    backgroundColor: "#efe4d3",
    borderRadius: 24,
    padding: 18,
  },
  trackCardSelected: {
    borderWidth: 2,
    borderColor: "#173221",
    backgroundColor: "#e6ddcf",
  },
  trackTitle: {
    color: "#173221",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  trackBody: {
    color: "#5f695e",
    fontSize: 14,
    lineHeight: 20,
  },
  listCard: {
    backgroundColor: "#fffaf3",
    borderRadius: 22,
    padding: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  listKanji: {
    width: 54,
    fontSize: 28,
    fontWeight: "800",
    color: "#173221",
    textAlign: "center",
  },
  listContent: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#173221",
  },
  listMeta: {
    fontSize: 13,
    color: "#6f756b",
  },
  shadow: {
    shadowColor: "#5f4b32",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
});
