import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { useFocusEffect } from "expo-router";

// Start still until the OS preference is known; stop when the home loses focus.
export function usePetMotion() {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [reduceMotion, setReduceMotion] = useState(true);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted && !preferenceChanged) setReduceMotion(value);
    }).catch(() => {});
    const preference = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      preferenceChanged = true;
      setReduceMotion(value);
    });
    const app = AppState.addEventListener("change", (value) => setForeground(value === "active"));
    return () => {
      mounted = false;
      preference.remove();
      app.remove();
    };
  }, []);

  return { active: focused && foreground, animate: focused && foreground && !reduceMotion };
}
