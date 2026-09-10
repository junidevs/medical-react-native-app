import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { AppText } from "./typography";
import { useTheme } from "./theme";

export function SplashTransition({ onDone }: { onDone?: () => void }) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(120, withTiming(1, { duration: 620 }, () => {}));
    const timer = setTimeout(() => onDone?.(), 820);
    return () => clearTimeout(timer);
  }, [onDone, progress]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -120 * progress.value }, { scale: 1 - progress.value * 0.22 }]
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { backgroundColor: theme.primary }, overlayStyle]}>
      <Animated.View style={[styles.logo, { backgroundColor: theme.onPrimary }, logoStyle]}>
        <AppText variant="heading" weight="900" color={theme.primary}>
          MC
        </AppText>
      </Animated.View>
      <View style={styles.textWrap}>
        <AppText variant="heading" weight="900" color={theme.onPrimary} align="center">
          MedConnect
        </AppText>
        <AppText color={theme.onPrimary} align="center" style={{ opacity: 0.78, marginTop: 6 }}>
          Bezpieczna aplikacja pacjenta
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 9999, alignItems: "center", justifyContent: "center" },
  logo: { width: 92, height: 92, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  textWrap: { marginTop: 18 }
});

