import { type ReactNode } from "react";
import { StyleProp, UIManager, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

// expo-blur is a native module. On a build that predates it, React Native renders
// an "Unimplemented component" box, so we only use real BlurView when the native
// view is registered (or force-enabled via flag) and otherwise fall back to a
// translucent panel that still reads as "glass".
function nativeBlurAvailable(): boolean {
  try {
    return Boolean(UIManager?.getViewManagerConfig?.("ExpoBlurView"));
  } catch {
    return false;
  }
}

const BLUR_ENABLED = process.env.EXPO_PUBLIC_BLUR === "1" || nativeBlurAvailable();

export function GlassView({
  intensity = 40,
  tint = "default",
  fallbackColor,
  style,
  children
}: {
  intensity?: number;
  tint?: "light" | "dark" | "default";
  fallbackColor: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  if (BLUR_ENABLED) {
    return (
      <BlurView intensity={intensity} tint={tint} style={style}>
        {children}
      </BlurView>
    );
  }
  return <View style={[style, { backgroundColor: fallbackColor }]}>{children}</View>;
}
