import {
  PropsWithChildren,
} from "react";
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";
import { layout, useTheme } from "../../design/theme";

type ScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  onScroll?: ScrollViewProps["onScroll"];
  disableScrollViewPanResponder?: ScrollViewProps["disableScrollViewPanResponder"];
  scrollContainer?: boolean;
  scrollEnabled?: boolean;
  scrollEventThrottle?: number;
}>;

export function Screen({
  children,
  contentStyle,
  edges = ["left", "right", "bottom"],
  onScroll,
  disableScrollViewPanResponder,
  scrollContainer = true,
  scrollEnabled = true,
  scrollEventThrottle,
}: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor: colors.bgCanvas }]}
    >
      {!scrollContainer ? (
        <View style={[styles.content, styles.staticContent, contentStyle]}>
          {children}
        </View>
      ) : (
        <ScrollView
          alwaysBounceHorizontal={false}
          contentContainerStyle={[styles.content, contentStyle]}
          directionalLockEnabled
          disableScrollViewPanResponder={disableScrollViewPanResponder}
          horizontal={false}
          onScroll={onScroll}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          scrollEventThrottle={scrollEventThrottle}
        >
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

Object.defineProperty(Screen, "displayName", {
  value: "Screen",
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: layout.screenPaddingBottom,
  },
  staticContent: {
    flex: 1,
  },
});
