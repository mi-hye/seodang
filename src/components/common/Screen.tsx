import {
  forwardRef,
  PropsWithChildren,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
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
  const [isScrollEnabled, setIsScrollEnabled] = useState(scrollEnabled);
  const { colors } = useTheme();

  useEffect(() => {
    setIsScrollEnabled(scrollEnabled);
  }, [scrollEnabled]);

  useImperativeHandle(ref, () => ({
    setScrollEnabled(enabled: boolean) {
      setIsScrollEnabled(enabled);
      scrollRef.current?.setNativeProps({ scrollEnabled: enabled });
    },
  }));

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.bgCanvas }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isScrollEnabled}
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
