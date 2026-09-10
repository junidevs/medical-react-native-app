import { useNetInfo } from "@react-native-community/netinfo";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/design/typography";
import { useTheme } from "@/lib/theme";

export function OfflineBanner() {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8, backgroundColor: theme.dangerBg }]} pointerEvents="none">
      <AppText variant="caption" weight="800" color={theme.dangerText}>Tryb offline - pokazujemy zapisane dane</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: "absolute", top: 0, left: 12, right: 12, paddingBottom: 8, paddingHorizontal: 16, zIndex: 1000, alignItems: "center", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }
});
