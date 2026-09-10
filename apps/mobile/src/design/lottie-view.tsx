import { Component, type ComponentProps, type ReactNode } from "react";
import { StyleProp, UIManager, View, ViewStyle } from "react-native";
import LottieView from "lottie-react-native";

type LottieSource = ComponentProps<typeof LottieView>["source"];

export const lotties = {
  loading: require("../../assets/lottie/loading.json") as LottieSource,
  success: require("../../assets/lottie/success.json") as LottieSource,
  heart: require("../../assets/lottie/heart.json") as LottieSource,
  pill: require("../../assets/lottie/pill.json") as LottieSource,
  calendar: require("../../assets/lottie/calendar.json") as LottieSource
};

// Lottie is a native module. It only renders on a dev/production build compiled
// AFTER lottie-react-native was added. On older clients React Native shows an ugly
// "Unimplemented component: <LottieAnimationView>" box (it does NOT throw, so an
// error boundary can't catch it). So we only render it when the native view is
// actually registered, falling back to a static element otherwise.
//
// Detection covers the classic architecture automatically. On the New Architecture
// (Fabric) detection can be unreliable, so EXPO_PUBLIC_LOTTIE=1 force-enables it
// once you know the current build includes lottie-react-native.
function nativeLottieAvailable(): boolean {
  try {
    return Boolean(UIManager?.getViewManagerConfig?.("LottieAnimationView"));
  } catch {
    return false;
  }
}

const LOTTIE_ENABLED = process.env.EXPO_PUBLIC_LOTTIE === "1" || nativeLottieAvailable();

class LottieBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <>{this.props.fallback}</>;
    return this.props.children;
  }
}

export function LottieAsset({
  source,
  size = 120,
  loop = true,
  autoPlay = true,
  style,
  fallback
}: {
  source: LottieSource;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
  fallback?: ReactNode;
}) {
  const placeholder = fallback ?? <View style={[{ width: size, height: size }, style]} />;
  if (!LOTTIE_ENABLED) return <>{placeholder}</>;
  return (
    <LottieBoundary fallback={placeholder}>
      <LottieView source={source} autoPlay={autoPlay} loop={loop} style={[{ width: size, height: size }, style]} />
    </LottieBoundary>
  );
}
