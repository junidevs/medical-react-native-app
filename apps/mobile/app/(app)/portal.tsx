import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { Component, type ReactNode, useCallback, useState } from "react";
import { WebView } from "react-native-webview";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Button, Card, EmptyState, Screen, Skeleton } from "@/design/primitives";
import { AppText } from "@/design/typography";
import QrScanner from "@/features/portal/qr-scanner";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { useTheme } from "@/lib/theme";
import { portalSessionResponseSchema } from "@medconnect/shared";

const apiOrigin = new URL(env.apiUrl).origin;

class CameraErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function PortalScreen() {
  const theme = useTheme();
  const { getAccessToken } = useAuth();
  const scannerEnabled = env.features.portalQrScanner;
  const webEnabled = env.features.portalWebView;
  const [mode, setMode] = useState<"scan" | "docs">(scannerEnabled ? "scan" : "docs");
  const [focused, setFocused] = useState(false);

  // Only keep the camera mounted while the Portal tab is actually on screen.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const query = useQuery({
    queryKey: ["portal-session"],
    enabled: mode === "docs" && webEnabled,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return apiRequest({ path: "/portal/session", schema: portalSessionResponseSchema, accessToken });
    }
  });

  const cameraFallback = (
    <View style={styles.fallback}>
      <EmptyState
        title="Skaner niedostepny"
        description="Przebuduj aplikacje, aby wlaczyc aparat. Mozesz tez zeskanowac kod QR aparatem systemowym - otworzy aplikacje automatycznie."
        icon="camera-off"
        action={webEnabled ? <Button label="Otworz dokumenty" onPress={() => setMode("docs")} /> : undefined}
      />
    </View>
  );

  return (
    <Screen padded={false}>
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" weight="900" color={theme.text}>Portal pacjenta</AppText>
          <AppText variant="caption" color={theme.muted}>
            {mode === "scan" ? "Zeskanuj kod QR z ekranu komputera" : "Dokumenty i wyniki"}
          </AppText>
        </View>
        {scannerEnabled && webEnabled ? (
          <Button
            label={mode === "scan" ? "Dokumenty" : "Skaner"}
            variant="secondary"
            left={<Feather name={mode === "scan" ? "file-text" : "maximize"} size={16} color={theme.primaryText} />}
            onPress={() => setMode((current) => (current === "scan" ? "docs" : "scan"))}
          />
        ) : null}
      </View>

      {mode === "scan" ? (
        <View style={[styles.scannerShell, { borderColor: theme.border }]}>
          {focused ? (
            <CameraErrorBoundary fallback={cameraFallback}>
              <QrScanner />
            </CameraErrorBoundary>
          ) : (
            <View style={styles.cameraPlaceholder} />
          )}
          <View style={[styles.scanCaption, { borderColor: "rgba(255,255,255,0.16)" }]} pointerEvents="none">
            <Feather name="maximize" size={16} color="#ffffff" />
            <AppText variant="caption" weight="700" color="#ffffff">Skanujesz kod logowania z przegladarki</AppText>
          </View>
        </View>
      ) : !webEnabled ? (
        <View style={styles.fallback}>
          <EmptyState title="Portal wylaczony" description="Portal WebView jest wylaczony dla tego builda." />
        </View>
      ) : query.isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={28} width="62%" />
          <Skeleton height={320} style={{ marginTop: 18 }} />
        </View>
      ) : !query.data?.ok ? (
        <View style={styles.fallback}>
          <EmptyState title="Portal niedostepny" description="Nie udalo sie utworzyc bezpiecznej sesji portalu." action={<Button label="Sprobuj ponownie" onPress={() => query.refetch()} />} />
        </View>
      ) : (
        <Card style={styles.webShell}>
          <WebView source={{ uri: query.data.data.portalUrl }} incognito sharedCookiesEnabled originWhitelist={[apiOrigin]} style={styles.webview} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  scannerShell: { flex: 1, marginHorizontal: 12, marginBottom: 104, borderRadius: 28, borderWidth: 1, overflow: "hidden", backgroundColor: "#000000" },
  cameraPlaceholder: { flex: 1, backgroundColor: "#000000" },
  scanCaption: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(15,19,32,0.55)"
  },
  fallback: { padding: 20 },
  loading: { paddingHorizontal: 20 },
  webShell: { flex: 1, marginHorizontal: 12, marginBottom: 104, padding: 0, overflow: "hidden" },
  webview: { flex: 1, borderRadius: 28 }
});
