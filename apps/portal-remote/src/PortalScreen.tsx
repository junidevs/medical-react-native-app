// The Portal micro-frontend surface, exposed to the host as "./PortalScreen".
//
// This is an INDEPENDENTLY DEPLOYABLE screen: the host knows nothing about it
// beyond the RemoteScreenModule contract. It receives everything it needs
// (tokens, api base, navigation, error reporting) via `props.host`, so it never
// reaches into host internals - which is what makes it separately buildable.

import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  PORTAL_CONTRACT_VERSION,
  REMOTES,
  type RemoteHostContext,
  type RemoteModuleMeta,
  type RemoteScreenModule,
} from "@medconnect/mf-contracts";

const meta: RemoteModuleMeta = {
  remote: REMOTES.portal,
  title: "Portal pacjenta",
  contractVersion: PORTAL_CONTRACT_VERSION,
};

function PortalScreen({ host }: { host: RemoteHostContext }) {
  const [pairing, setPairing] = useState<"idle" | "loading" | "done" | "error">("idle");

  const pair = useCallback(async () => {
    setPairing("loading");
    try {
      const token = await host.getAccessToken();
      const res = await fetch(`${host.apiBaseUrl}/portal/pairing`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: host.sessionId }),
      });
      if (!res.ok) throw new Error(`Pairing failed: ${res.status}`);
      setPairing("done");
    } catch (error) {
      host.reportError(error, { feature: "portal.pairing" });
      setPairing("error");
    }
  }, [host]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>MICRO-FRONTEND · {meta.remote}</Text>
      <Text style={styles.title}>{meta.title}</Text>
      <Text style={styles.body}>
        Ten ekran jest ladowany zdalnie przez Module Federation. Mozna go
        wdrozyc niezaleznie od reszty aplikacji.
      </Text>

      <Pressable style={styles.button} onPress={pair} disabled={pairing === "loading"}>
        {pairing === "loading" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {pairing === "done" ? "Sparowano" : "Sparuj z portalem"}
          </Text>
        )}
      </Pressable>

      {pairing === "error" ? (
        <Text style={styles.error}>Nie udalo sie sparowac - sprobuj ponownie.</Text>
      ) : null}

      <Text style={styles.footer}>kontrakt v{meta.contractVersion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  kicker: { color: "#F0503C", fontWeight: "800", letterSpacing: 1, fontSize: 12 },
  title: { color: "#141625", fontWeight: "900", fontSize: 28 },
  body: { color: "#54607a", fontSize: 15, lineHeight: 22 },
  button: {
    marginTop: 12,
    backgroundColor: "#F0503C",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  error: { color: "#b3261e", fontWeight: "600" },
  footer: { marginTop: 8, color: "#98a2b3", fontSize: 12 },
});

// Default export IS the contract the host consumes.
const moduleExport: RemoteScreenModule = { meta, Screen: PortalScreen };
export default moduleExport;
