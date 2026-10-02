import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";

// Re-evaluate deadlines after navigation, resume, and while a screen is visible.
export function useReviewClock() {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []));
  return now;
}
