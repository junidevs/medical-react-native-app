import * as LocalAuthentication from "expo-local-authentication";
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";

import { Button, Card, Screen } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { isBiometricLockEnabled } from "@/features/security/biometric-preference";
import { useTheme } from "@/lib/theme";

type GateState = "checking" | "locked" | "unlocked";

export function BiometricGate({ children }: PropsWithChildren) {
  const theme = useTheme();
  const [state, setState] = useState<GateState>("checking");
  const requiredRef = useRef(false);
  const authingRef = useRef(false);
  const stateRef = useRef<GateState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const authenticate = useCallback(async () => {
    if (authingRef.current) return;
    authingRef.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Odblokuj MedConnect",
        promptDescription: "Chronimy dane pacjenta zapisane w aplikacji.",
        cancelLabel: "Anuluj",
        fallbackLabel: "Użyj kodu"
      });
      if (result.success) setState("unlocked");
    } catch {
      setState("unlocked");
    } finally {
      authingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const enabled = await isBiometricLockEnabled();
        if (!active) return;
        if (!enabled) return setState("unlocked");
        const [hasHardware, isEnrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
        if (!active) return;
        if (!hasHardware || !isEnrolled) return setState("unlocked");
        requiredRef.current = true;
        setState("locked");
        void authenticate();
      } catch {
        if (active) setState("unlocked");
      }
    })();
    return () => { active = false; };
  }, [authenticate]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (!requiredRef.current) return;
      if (next === "background") setState("locked");
      if (next === "active" && stateRef.current === "locked") void authenticate();
    });
    return () => subscription.remove();
  }, [authenticate]);

  if (state === "unlocked") return <>{children}</>;
  if (state === "checking") return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  return (
    <Screen contentStyle={{ justifyContent: "center" }}>
      <Card>
        <AppText variant="heading" weight="900" color={theme.text} align="center">MedConnect zablokowany</AppText>
        <AppText color={theme.muted} align="center" style={{ marginTop: 10, lineHeight: 22 }}>Uwierzytelnij się biometrią, aby uzyskać dostęp do danych pacjenta.</AppText>
        <Button label="Odblokuj" onPress={authenticate} style={{ marginTop: 22 }} />
      </Card>
    </Screen>
  );
}
