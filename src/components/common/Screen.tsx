import {
  forwardRef,
  PropsWithChildren,
  useImperativeHandle,
  useRef,
} from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { layout, useTheme } from "../../design/theme";

type ScreenProps = PropsWithChildren<{
  scrollEnabled?: boolean;
}>;

export type ScreenHandle = {
  setScrollEnabled: (enabled: boolean) => void;
};

export const Screen = forwardRef<ScreenHandle, ScreenProps>(function Screen(
  { children, scrollEnabled = true },
  ref,
) {
  const scrollRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

  useImperativeHandle(ref, () => ({
    setScrollEnabled(enabled: boolean) {
      scrollRef.current?.setNativeProps({ scrollEnabled: enabled });
    },
  }));

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.bgCanvas }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>
    </View>
  );
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
});
