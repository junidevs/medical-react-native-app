import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { env } from "@/lib/env";

// Evaluated once at load: on a compromised (jailbroken/rooted) device we refuse
// to render the patient app to protect PHI and tokens in SecureStore.
// jail-monkey is a native-only module, so we skip the check on web (react-native-web)
// and fail open if the native module isn't linked (e.g. an older dev build).
function detectCompromised(): boolean {
  if (!env.features.deviceIntegrity) return false;
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JailMonkey = require("jail-monkey").default;
    return JailMonkey.isJailBroken();
  } catch {
    return false;
  }
}

const isCompromised = detectCompromised();

export function DeviceIntegrityGate({ children }: PropsWithChildren) {
  if (!isCompromised) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Urządzenie niezaufane</Text>
      <Text style={styles.body}>
        Wykryto, że urządzenie jest zrootowane lub po jailbreaku. Ze względów bezpieczeństwa
        danych medycznych aplikacja MedConnect została zablokowana na tym urządzeniu.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 32, backgroundColor: "#0f172a" },
  title: { color: "#fca5a5", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  body: { color: "#e2e8f0", fontSize: 16, lineHeight: 24 }
});
