import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type Theme, useTheme } from "@/lib/theme";

function extractPairId(value: string): string | null {
  const match = /[?&]pairId=([0-9a-fA-F-]{8,})/.exec(value);
  return match?.[1] ?? null;
}

// Statically imports expo-camera, so this module throws at evaluation time when the
// native module is missing (a build that predates expo-camera). It is loaded lazily
// from the scanner screen, letting the screen's error boundary show a rebuild hint.
export default function QrScanner() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  if (!permission) return <View style={styles.fill} />;

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Dostęp do aparatu</Text>
        <Text style={styles.body}>
          Zezwól na aparat, aby zeskanować kod QR z portalu w przeglądarce.
        </Text>
        <Pressable onPress={requestPermission} style={styles.primary}>
          <Text style={styles.primaryText}>Zezwól na aparat</Text>
        </Pressable>
      </View>
    );
  }

  function handleScanned(result: { data?: string }) {
    if (scannedRef.current) return;
    const pairId = extractPairId(result?.data ?? "");
    if (!pairId) return;
    scannedRef.current = true;
    router.replace({ pathname: "/portal-pair", params: { pairId } });
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Wyceluj w kod QR ze strony portalu</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: "#000000" },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      backgroundColor: theme.background
    },
    title: { fontSize: 22, fontWeight: "800", color: theme.text, marginBottom: 10, textAlign: "center" },
    body: { fontSize: 15, color: theme.muted, lineHeight: 22, marginBottom: 20, textAlign: "center" },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center"
    },
    frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: "#ffffff" },
    hint: { color: "#ffffff", marginTop: 20, fontSize: 15, fontWeight: "600" },
    primary: {
      borderRadius: 16,
      backgroundColor: theme.primary,
      paddingVertical: 16,
      paddingHorizontal: 28,
      alignItems: "center"
    },
    primaryText: { color: theme.onPrimary, fontWeight: "800", fontSize: 16 }
  });
