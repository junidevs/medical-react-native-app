import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import * as Linking from "expo-linking";
import { router, Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "@/design/theme";
import { Button, Card } from "@/design/primitives";
import { SplashTransition } from "@/design/splash-transition";
import { AppText } from "@/design/typography";
import { AuthProvider } from "@/features/auth/auth-context";
import { subscribeToNotificationLinks } from "@/features/notifications/notifications";
import { env } from "@/lib/env";
import { createQueryClient } from "@/lib/query-client";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 450, fade: true });

function handlePortalPairUrl(url: string | null) {
  if (!url) return;
  const parsed = Linking.parse(url);
  const path = (parsed.path ?? "").replace(/^\/+/, "");
  const isPairing = parsed.hostname === "portal-pair" || path === "portal-pair";
  const pairId = parsed.queryParams?.pairId;
  if (isPairing && typeof pairId === "string") {
    router.replace({ pathname: "/portal-pair", params: { pairId } });
  }
}

if (env.sentryDsn) {
  Sentry.init({ dsn: env.sentryDsn, tracesSampleRate: 0.2 });
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ThemedError retry={retry} message={error.message} />
  );
}

function ThemedError({ retry, message }: { retry: () => void; message: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.errorWrap, { backgroundColor: theme.background }]}> 
      <Card>
        <AppText variant="heading" weight="900" color={theme.text}>
          Coś poszło nie tak
        </AppText>
        <AppText color={theme.muted} style={{ marginTop: 10, lineHeight: 22 }}>
          Zapisaliśmy błąd do systemu raportowania. Spróbuj ponownie.
        </AppText>
        <AppText variant="caption" color={theme.subtle} style={{ marginTop: 10 }}>
          {message}
        </AppText>
        <Button label="Spróbuj ponownie" onPress={retry} style={{ marginTop: 18 }} />
      </Card>
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => subscribeToNotificationLinks(), []);

  useEffect(() => {
    void Linking.getInitialURL().then(handlePortalPairUrl);
    const subscription = Linking.addEventListener("url", (event) => handlePortalPairUrl(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: "ios_from_right",
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true
                  }}
                />
                {showSplash ? <SplashTransition onDone={() => setShowSplash(false)} /> : null}
              </AuthProvider>
            </QueryClientProvider>
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorWrap: { flex: 1, justifyContent: "center", padding: 24 }
});
