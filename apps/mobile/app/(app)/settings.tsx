import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { Button, Card, Screen, SectionHeader } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { useAuth } from "@/features/auth/auth-context";
import { registerForPushNotifications } from "@/features/notifications/notifications";
import { getBiometricAvailability, isBiometricLockEnabled, setBiometricLockEnabled } from "@/features/security/biometric-preference";
import { env } from "@/lib/env";
import { useTheme } from "@/lib/theme";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function SettingsScreen() {
  const { session, signOut, getAccessToken } = useAuth();
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [enabled, availability] = await Promise.all([isBiometricLockEnabled(), getBiometricAvailability()]);
      if (!active) return;
      const available = availability.hasHardware && availability.isEnrolled;
      setBiometricAvailable(available);
      setBiometricEnabled(enabled && available);
    })();
    return () => { active = false; };
  }, []);

  async function handlePushRegistration() {
    if (!env.features.pushNotifications) return setMessage("Powiadomienia są wyłączone dla tego builda.");
    const accessToken = await getAccessToken();
    const result = await registerForPushNotifications(accessToken);
    setMessage(result?.ok ? "Urządzenie zarejestrowane." : "Nie udało się włączyć powiadomień.");
  }

  async function handleToggleBiometric(next: boolean) {
    if (next && !biometricAvailable) return setMessage("Skonfiguruj Face ID lub Touch ID w ustawieniach systemu.");
    setBiometricEnabled(next);
    await setBiometricLockEnabled(next);
    setMessage(next ? "Blokada biometryczna włączona." : "Blokada biometryczna wyłączona.");
  }

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <Screen scroll contentStyle={{ paddingBottom: 118 }}>
      <AppText variant="title" weight="900" color={theme.text}>Ustawienia</AppText>
      <Card style={{ marginTop: 14 }}>
        <AppText weight="900" color={theme.text}>{session?.userName}</AppText>
        <AppText color={theme.muted} style={{ marginTop: 4 }}>{session?.userEmail}</AppText>
      </Card>
      <SectionHeader title="Bezpieczeństwo" />
      <Card>
        <SettingRow title="Blokada Face ID" subtitle={biometricAvailable ? "Wymagaj biometrii przy wejściu do aplikacji." : env.features.biometricLock ? "Niedostępne - skonfiguruj biometrię w systemie." : "Wyłączone dla tego builda."}>
          <Switch value={biometricEnabled} onValueChange={handleToggleBiometric} disabled={!env.features.biometricLock || !biometricAvailable} trackColor={{ true: theme.primary, false: theme.border }} />
        </SettingRow>
      </Card>
      <SectionHeader title="Komunikacja" />
      <Button label="Włącz powiadomienia" onPress={handlePushRegistration} disabled={!env.features.pushNotifications} />
      <Button label="Wyloguj" variant="danger" onPress={handleLogout} style={{ marginTop: 12 }} />
      {message ? <AppText color={theme.muted} style={{ marginTop: 14 }}>{message}</AppText> : null}
    </Screen>
  );
}

function SettingRow({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText weight="900" color={theme.text}>{title}</AppText>
        <AppText variant="caption" color={theme.muted} style={{ marginTop: 4, lineHeight: 18 }}>{subtitle}</AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 }
});
