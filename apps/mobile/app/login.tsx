import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { Button, Card, Screen } from "@/design/primitives";
import { LottieAsset, lotties } from "@/design/lottie-view";
import { AppText } from "@/design/typography";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    setError(null);
    try {
      await signIn();
      router.replace("/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Nie udało się zalogować.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Screen contentStyle={styles.container}>
      <LottieAsset source={lotties.heart} size={120} style={{ alignSelf: "flex-start" }} />
      <AppText variant="hero" weight="900" color={theme.text} style={{ marginTop: 22 }}>
        Bezpieczna aplikacja pacjenta
      </AppText>
      <AppText color={theme.muted} style={{ marginTop: 12, lineHeight: 24 }}>
        Zaloguj się kontem Microsoft Entra. Później aplikację odblokujesz lokalnie Face ID lub Touch ID.
      </AppText>
      <Card style={{ marginTop: 28 }}>
        <AppText weight="900" color={theme.text}>Jak to działa?</AppText>
        <AppText color={theme.muted} style={{ marginTop: 8, lineHeight: 22 }}>
          Entra potwierdza Twoją tożsamość, tokeny są zapisane w szyfrowanym SecureStore, a biometria chroni dostęp po powrocie do aplikacji.
        </AppText>
      </Card>
      {error ? <AppText color={theme.danger} style={{ marginTop: 14 }}>{error}</AppText> : null}
      <Button label={isLoading ? "Logowanie..." : "Zaloguj przez Entra ID"} disabled={isLoading} onPress={handleSignIn} style={{ marginTop: 18 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: "center" }
});
