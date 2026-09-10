import { Stack } from "expo-router";

import { useTheme } from "@/lib/theme";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function AppointmentsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "ios_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: theme.background }
      }}
    >
      <Stack.Screen name="index" options={{ title: "Twoje wizyty" }} />
      <Stack.Screen name="[id]" options={{ title: "Szczegóły wizyty" }} />
    </Stack>
  );
}
