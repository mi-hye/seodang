import {
  PropsWithChildren,
} from "react";
import {
  ScrollView,
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
  scrollContainer?: boolean;
  scrollEnabled?: boolean;
}>;

export function Screen({
  children,
  contentStyle,
  edges = ["left", "right", "bottom"],
  scrollContainer = true,
  scrollEnabled = true,
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
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
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
