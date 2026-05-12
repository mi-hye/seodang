import {
  forwardRef,
  PropsWithChildren,
  useImperativeHandle,
  useRef,
} from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, layout } from "../../design/theme";

type ScreenProps = PropsWithChildren<{
  scrollEnabled?: boolean;
}>;

export type ScreenHandle = {
  setScrollEnabled: (enabled: boolean) => void;
};

export const Screen = forwardRef<ScreenHandle, ScreenProps>(function Screen(
  { children, scrollEnabled = true },
  ref
) {
  const scrollRef = useRef<ScrollView>(null);

  useImperativeHandle(ref, () => ({
    setScrollEnabled(enabled: boolean) {
      scrollRef.current?.setNativeProps({ scrollEnabled: enabled });
    },
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: layout.screenPaddingBottom,
  },
});
