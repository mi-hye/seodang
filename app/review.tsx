import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import {
  buttonStyles,
  colors,
  spacing,
  surfaceStyles,
  textStyles,
} from "../src/design/theme";
import { useAppState } from "../src/state/AppStateProvider";

export default function ReviewScreen() {
  const { getProgress, getReviewCharacters, hydrated } = useAppState();
  const items = getReviewCharacters();

  return (
    <Screen>
      <Text style={styles.title}>복습 노트</Text>
      <Text style={styles.subtitle}>
        틀린 횟수와 최근 학습 시점을 기반으로 다시 연습할 대상을 모아둔 자리입니다.
      </Text>

      {hydrated && items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>아직 복습할 한자가 없습니다.</Text>
          <Text style={styles.emptyBody}>
            연습 결과가 쌓이면 이 화면에서 다시 쓰기 대상을 모아 보여줍니다.
          </Text>
        </View>
      ) : null}

      {items.map((character, index) => (
        <Link key={character.id} href={`/practice/${character.id}`} asChild>
          <Pressable style={styles.card}>
            <View style={styles.left}>
              <Text style={styles.literal}>{character.literal}</Text>
              <View>
                <Text style={styles.meaning}>{character.meaningKo}</Text>
                <Text style={styles.meta}>
                  우선순위 {index + 1} · 실패 {getProgress(character.id)?.failures ?? 0}회 · 최근 점수 {getProgress(character.id)?.lastScore ?? "-"}
                </Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>다시 쓰기</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...textStyles.displayMd,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...textStyles.bodySm,
    marginBottom: spacing[6],
  },
  emptyCard: {
    ...surfaceStyles.card,
    padding: spacing[6],
    marginBottom: 12,
    gap: 6,
  },
  emptyTitle: textStyles.titleSm,
  emptyBody: textStyles.bodySm,
  card: {
    ...surfaceStyles.card,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  literal: {
    ...textStyles.glyphSm,
    width: 42,
    textAlign: "center",
  },
  meaning: textStyles.titleSm,
  meta: {
    ...textStyles.meta,
    marginTop: 3,
  },
  badge: {
    ...buttonStyles.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  badgeText: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800",
  },
});
