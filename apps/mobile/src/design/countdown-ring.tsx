import { StyleSheet, View } from "react-native";

import { AppText } from "./typography";
import { useTheme } from "./theme";

interface CountdownRingProps {
  progress: number;
  label: string;
  sublabel?: string;
  size?: number;
}

export function CountdownRing({ progress, label, sublabel, size = 118 }: CountdownRingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const accessibilityLabel = sublabel ? `${label}. ${sublabel}` : label;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: theme.border,
          backgroundColor: theme.surface
        }
      ]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.progress,
          {
            width: Math.max(18, (size - 34) * clamped),
            backgroundColor: theme.primary
          }
        ]}
      />
      <AppText weight="900" color={theme.text} align="center">
        {label}
      </AppText>
      {sublabel ? (
        <AppText variant="tiny" color={theme.muted} align="center">
          {sublabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  progress: {
    position: "absolute",
    bottom: 14,
    height: 6,
    borderRadius: 999
  }
});
