import { router } from "expo-router";
import { Component, type ReactNode } from "react";
import { View } from "react-native";

import { Button, EmptyState, Screen } from "@/design/primitives";
import QrScanner from "@/features/portal/qr-scanner";
import { env } from "@/lib/env";

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

export default function PortalScanScreen() {
  if (!env.features.portalQrScanner) {
    return (
      <Screen>
        <EmptyState title="Skaner QR wyłączony" description="Ta funkcja jest wyłączona dla tego builda." action={<Button label="Wróć do portalu" onPress={() => router.replace("/portal")} />} />
      </Screen>
    );
  }

  const fallback = (
    <Screen>
      <EmptyState title="Skaner niedostępny" description="Nie udało się uruchomić aparatu. Zeskanuj kod QR aparatem systemowym - otworzy aplikację automatycznie." action={<Button label="Wróć do portalu" onPress={() => router.replace("/portal")} />} />
    </Screen>
  );

  return (
    <CameraErrorBoundary fallback={fallback}>
      <View style={{ flex: 1 }}>
        <QrScanner />
      </View>
    </CameraErrorBoundary>
  );
}
