import { useEffect } from "react";
import { StyleSheet } from "react-native";
import * as Sentry from "@sentry/react-native";
import { type ErrorBoundaryProps, usePathname } from "expo-router";

import { Button, Card, Screen } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { useTheme } from "@/lib/theme";

// Per-route error boundary. Expo Router mounts this in place of a single screen
// that threw during render, while the Tabs navigator (and the floating tab bar)
// stay alive - so a crash in one "module" (tab) never takes down the whole app.
// Each incident is reported to Sentry tagged with the route that failed.
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag("route", pathname);
      scope.setTag("boundary", "route");
      scope.setLevel("error");
      Sentry.captureException(error);
    });
  }, [error, pathname]);

  return (
    <Screen contentStyle={styles.wrap}>
      <Card>
        <AppText variant="heading" weight="900" color={theme.text}>
          Ten ekran sie zawiesil
        </AppText>
        <AppText color={theme.muted} style={{ marginTop: 10, lineHeight: 22 }}>
          Reszta aplikacji dziala normalnie - mozesz przelaczyc zakladke lub sprobowac odswiezyc ten ekran.
        </AppText>
        <AppText variant="caption" color={theme.subtle} style={{ marginTop: 10 }}>
          {error.message}
        </AppText>
        <Button label="Sprobuj ponownie" onPress={retry} style={{ marginTop: 18 }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center", flexGrow: 1 }
});
