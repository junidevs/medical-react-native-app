import { Redirect, Tabs, usePathname } from "expo-router";
import { Fragment, useEffect } from "react";
import * as Sentry from "@sentry/react-native";

import { FloatingTabBar } from "@/design/floating-tab-bar";
import { AppLoader, Screen } from "@/design/primitives";
import { useAuth } from "@/features/auth/auth-context";
import { BiometricGate } from "@/features/security/biometric-gate";
import { DeviceIntegrityGate } from "@/features/security/device-integrity";
import { OfflineBanner } from "@/lib/offline-banner";
import { useTheme } from "@/lib/theme";

export default function AppLayout() {
  const { status } = useAuth();
  const theme = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    Sentry.setTag("active_route", pathname);
    Sentry.addBreadcrumb({ category: "navigation", level: "info", message: pathname });
  }, [pathname]);

  if (status === "loading") return <Screen><AppLoader label="Ladowanie..." /></Screen>;
  if (status !== "authenticated") return <Redirect href="/login" />;

  return (
    <DeviceIntegrityGate>
      <BiometricGate>
        <Fragment>
          <Tabs
            tabBar={(props) => <FloatingTabBar {...props} />}
            screenOptions={{
              tabBarActiveTintColor: theme.primary,
              tabBarInactiveTintColor: theme.muted,
              headerShown: false,
              sceneStyle: { backgroundColor: theme.background }
            }}
          >
            <Tabs.Screen name="index" options={{ title: "Start" }} />
            <Tabs.Screen name="appointments" options={{ title: "Wizyty" }} />
            <Tabs.Screen name="book" options={{ title: "Rezerwuj" }} />
            <Tabs.Screen name="portal" options={{ title: "Portal" }} />
            <Tabs.Screen name="profile" options={{ title: "Profil" }} />
            <Tabs.Screen name="settings" options={{ href: null }} />
            <Tabs.Screen name="portal-pair" options={{ href: null }} />
            <Tabs.Screen name="portal-remote" options={{ href: null }} />
            <Tabs.Screen name="portal-scan" options={{ href: null }} />
            <Tabs.Screen name="doctors/[id]" options={{ href: null }} />
            <Tabs.Screen name="check-in/[id]" options={{ href: null }} />
          </Tabs>
          <OfflineBanner />
        </Fragment>
      </BiometricGate>
    </DeviceIntegrityGate>
  );
}
