import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppStateProvider } from "../src/state/AppStateProvider";

export default function RootLayout() {
  return (
    <AppStateProvider>
      <>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: "#f7f1e8",
            },
            headerTintColor: "#1d3b2a",
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: "700",
            },
            contentStyle: {
              backgroundColor: "#f7f1e8",
            },
          }}
        >
          <Stack.Screen name="index" options={{ title: "kanzi", headerShown: false }} />
          <Stack.Screen name="list" options={{ title: "한자 목록" }} />
          <Stack.Screen name="review" options={{ title: "복습 노트" }} />
          <Stack.Screen
            name="character/[characterId]"
            options={{ title: "한자 상세" }}
          />
          <Stack.Screen
            name="practice/[characterId]"
            options={{ title: "쓰기 연습" }}
          />
          <Stack.Screen
            name="practice/result"
            options={{ title: "연습 결과", presentation: "card" }}
          />
        </Stack>
      </>
    </AppStateProvider>
  );
}
