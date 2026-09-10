// Host-side consumer for the Portal micro-frontend (Faza 1b).
//
// This is deliberately Metro-safe: it NEVER uses a static `import("portal/...")`
// (which Metro cannot resolve). Instead it calls the Module Federation runtime's
// `loadRemote(...)` with a string id, resolved lazily. Under Re.Pack the remote
// loads over the transport configured in script-manager.ts; under Metro (or if
// the network fetch fails) it degrades to a built-in fallback and reports the
// incident to Sentry - stitching into the same pipeline as RouteErrorBoundary.

import * as Sentry from "@sentry/react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppLoader, Button, Card, Screen } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { readSession } from "@/features/auth/token-store";
import { env } from "@/lib/env";
import { useTheme } from "@/lib/theme";
import {
  PORTAL_EXPOSED_MODULE,
  REMOTES,
  type RemoteHostContext,
  type RemoteScreenModule,
} from "@medconnect/mf-contracts";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; module: RemoteScreenModule }
  | { status: "fallback"; error: unknown };

/** Build the host context injected into the remote (the only thing it may use). */
function useHostContext(): RemoteHostContext {
  const router = useRouter();
  return {
    sessionId: null,
    apiBaseUrl: env.apiUrl,
    getAccessToken: () =>
      readSession()
        .then((session) => session?.accessToken ?? null)
        .catch(() => null),
    navigate: (href) => router.push(href as never),
    reportError: (error, context) =>
      Sentry.withScope((scope) => {
        scope.setTag("boundary", "module-federation");
        scope.setTag("remote", REMOTES.portal);
        if (context) scope.setContext("remote", context);
        Sentry.captureException(error);
      }),
  };
}

async function loadPortalModule(): Promise<RemoteScreenModule> {
  // Lazy so Metro keeps the MF runtime in a separate async chunk and only
  // touches it when this screen is actually opened.
  const { loadRemote } = await import("@module-federation/enhanced/runtime");
  const loaded = await loadRemote<{ default: RemoteScreenModule }>(
    `${REMOTES.portal}/${PORTAL_EXPOSED_MODULE.replace("./", "")}`,
  );
  if (!loaded?.default?.Screen) {
    throw new Error("Portal remote did not satisfy the RemoteScreenModule contract");
  }
  return loaded.default;
}

export function RemotePortal() {
  const theme = useTheme();
  const host = useHostContext();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Sentry.addBreadcrumb({ category: "mf", level: "info", message: "load portal remote" });
    loadPortalModule()
      .then((module) => {
        if (!cancelled) setState({ status: "ready", module });
      })
      .catch((error) => {
        host.reportError(error, { phase: "loadRemote" });
        if (!cancelled) setState({ status: "fallback", error });
      });
    return () => {
      cancelled = true;
    };
  }, [host]);

  if (state.status === "loading") {
    return (
      <Screen contentStyle={styles.center}>
        <AppLoader label="Ladowanie portalu..." />
      </Screen>
    );
  }

  if (state.status === "fallback") {
    // Built-in, always-shipped version so the feature never goes blank.
    return (
      <Screen contentStyle={styles.center}>
        <Card>
          <AppText variant="heading" weight="900" color={theme.text}>
            Portal (wersja wbudowana)
          </AppText>
          <AppText color={theme.muted} style={{ marginTop: 10, lineHeight: 22 }}>
            Nie udalo sie pobrac najnowszej wersji modulu Portal. Uzywasz wersji
            dostarczonej z aplikacja.
          </AppText>
          <Button
            label="Sprobuj pobrac ponownie"
            onPress={() => setState({ status: "loading" })}
            style={{ marginTop: 18 }}
          />
        </Card>
      </Screen>
    );
  }

  const { Screen: RemoteScreen } = state.module;
  return (
    <View style={styles.fill}>
      <RemoteScreen host={host} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flexGrow: 1, justifyContent: "center" },
});
