import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { useAuth } from "@/features/auth/auth-context";
import { apiRequest } from "@/lib/api-client";
import { type Theme, useTheme } from "@/lib/theme";

const infoSchema = z.object({
  status: z.enum(["pending", "approved", "denied", "expired"]),
  browser: z.object({ userAgent: z.string(), ip: z.string() }).nullable(),
  createdAt: z.string().nullable()
});

const resolveSchema = z.object({ status: z.string() });

function describeBrowser(userAgent: string) {
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Mac OS X|Macintosh/i.test(userAgent)
      ? "macOS"
      : /iPhone|iPad|iOS/i.test(userAgent)
        ? "iOS"
        : /Android/i.test(userAgent)
          ? "Android"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Nieznany system";
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /OPR\//i.test(userAgent)
      ? "Opera"
      : /Chrome\//i.test(userAgent)
        ? "Chrome"
        : /Firefox\//i.test(userAgent)
          ? "Firefox"
          : /Safari\//i.test(userAgent)
            ? "Safari"
            : "Przeglądarka";
  return `${browser} · ${os}`;
}

type Phase = "loading" | "ready" | "done" | "error";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function PortalPairScreen() {
  const params = useLocalSearchParams<{ pairId?: string }>();
  const pairId = params.pairId;
  const { getAccessToken } = useAuth();
  const theme = useTheme();
  const styles = createStyles(theme);

  const [phase, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<z.infer<typeof infoSchema> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!pairId) {
        setPhase("error");
        setMessage("Brak identyfikatora parowania w linku.");
        return;
      }
      const result = await apiRequest({
        path: `/portal/pair/info?pairId=${encodeURIComponent(pairId)}`,
        schema: infoSchema
      });
      if (!active) return;
      if (!result.ok || result.data.status !== "pending") {
        setPhase("error");
        setMessage("Ta prośba o dostęp wygasła lub została już obsłużona.");
        return;
      }
      setInfo(result.data);
      setPhase("ready");
    })();
    return () => {
      active = false;
    };
  }, [pairId]);

  async function resolve(decision: "approve" | "deny") {
    if (!pairId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const accessToken = await getAccessToken();
      const result = await apiRequest({
        path: "/portal/pair/resolve",
        method: "POST",
        schema: resolveSchema,
        accessToken,
        body: { pairId, decision }
      });
      if (!result.ok) {
        setMessage(result.error.message);
        setBusy(false);
        return;
      }
      setPhase("done");
      setMessage(
        decision === "approve"
          ? "Zalogowano w przeglądarce. Możesz wrócić do komputera."
          : "Odrzucono prośbę o dostęp."
      );
    } catch {
      setMessage("Coś poszło nie tak. Spróbuj ponownie.");
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (phase === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Nie można zatwierdzić</Text>
        <Text style={styles.body}>{message}</Text>
        <Pressable onPress={() => router.replace("/portal")} style={styles.secondary}>
          <Text style={styles.secondaryText}>Wróć do portalu</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "done") {
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>✓</Text>
        <Text style={styles.title}>Gotowe</Text>
        <Text style={styles.body}>{message}</Text>
        <Pressable onPress={() => router.replace("/portal")} style={styles.secondary}>
          <Text style={styles.secondaryText}>Wróć do aplikacji</Text>
        </Pressable>
      </View>
    );
  }

  const browser = info?.browser;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prośba o dostęp do portalu</Text>
      <Text style={styles.body}>
        Urządzenie chce zalogować się do Twojego portalu pacjenta. Zatwierdź tylko, jeśli to Ty.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Urządzenie</Text>
          <Text style={styles.rowValue}>
            {browser ? describeBrowser(browser.userAgent) : "Nieznane"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Adres IP</Text>
          <Text style={styles.rowValue}>{browser?.ip ?? "nieznane"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Czas prośby</Text>
          <Text style={styles.rowValue}>
            {info?.createdAt ? new Date(info.createdAt).toLocaleTimeString("pl-PL") : " "}
          </Text>
        </View>
      </View>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <Pressable
        onPress={() => resolve("approve")}
        disabled={busy}
        style={[styles.primary, busy && styles.disabled]}
      >
        <Text style={styles.primaryText}>{busy ? "Zatwierdzam..." : "Zatwierdź logowanie"}</Text>
      </Pressable>
      <Pressable onPress={() => resolve("deny")} disabled={busy} style={styles.secondary}>
        <Text style={styles.secondaryText}>To nie ja   odrzuć</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, padding: 24, backgroundColor: theme.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      backgroundColor: theme.background
    },
    emoji: { fontSize: 48, color: theme.primary, marginBottom: 8 },
    title: { fontSize: 24, fontWeight: "800", color: theme.text, marginBottom: 8, textAlign: "center" },
    body: { fontSize: 15, color: theme.muted, lineHeight: 22, marginBottom: 20, textAlign: "center" },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 20
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10
    },
    rowLabel: { color: theme.muted, fontSize: 14 },
    rowValue: { color: theme.text, fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
    error: { color: theme.danger, marginBottom: 12, textAlign: "center" },
    primary: {
      borderRadius: 16,
      backgroundColor: theme.primary,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 12
    },
    primaryText: { color: theme.onPrimary, fontWeight: "800", fontSize: 16 },
    disabled: { opacity: 0.6 },
    secondary: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 14,
      alignItems: "center"
    },
    secondaryText: { color: theme.primaryText, fontWeight: "700" }
  });
