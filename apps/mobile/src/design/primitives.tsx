import { type ComponentProps, PropsWithChildren, ReactNode, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "./typography";
import { LottieAsset, lotties } from "./lottie-view";
import { radii, shadows } from "./tokens";
import { type Theme, useTheme } from "./theme";

type LottieSource = Parameters<typeof LottieAsset>[0]["source"];

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = false, padded = true, style, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const base = [
    styles.screen,
    { backgroundColor: theme.background, paddingTop: insets.top + 12 },
    padded && styles.padded,
    style
  ];

  if (scroll) {
    return (
      <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={[base, contentStyle]}>
        {children}
      </ScrollView>
    );
  }

  return <View style={[base, contentStyle]}>{children}</View>;
}

export function Card({ children, style, accessibleLabel }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; accessibleLabel?: string }>) {
  const theme = useTheme();
  return (
    <View
      accessible={Boolean(accessibleLabel)}
      accessibilityRole={accessibleLabel ? "text" : undefined}
      accessibilityLabel={accessibleLabel}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.soft, style]}
    >
      {children}
    </View>
  );
}

interface ButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  left?: ReactNode;
}

export function Button({ label, variant = "primary", left, disabled, onPress, style, ...props }: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const colors = buttonColors(theme, variant);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={10}
      disabled={disabled}
      onPressIn={() => {
        // Reanimated shared values are intentionally mutated from event handlers.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(0.96, { damping: 16, stiffness: 420 });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(1, { damping: 14, stiffness: 360 });
      }}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.background, borderColor: colors.border, opacity: disabled ? 0.55 : 1 },
        animatedStyle,
        style
      ]}
      {...props}
    >
      {left}
      <AppText weight="800" color={colors.text} align="center">
        {label}
      </AppText>
    </AnimatedPressable>
  );
}

export function IconButton({ label, children, onPress, style }: PropsWithChildren<{ label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  return (
    <Button
      accessibilityLabel={label}
      label=""
      onPress={onPress}
      variant="ghost"
      style={[styles.iconButton, { backgroundColor: theme.glass }, style]}
      left={children}
    />
  );
}

export function Badge({ children, tone = "primary" }: PropsWithChildren<{ tone?: "primary" | "success" | "warning" | "danger" | "muted" }>) {
  const theme = useTheme();
  const background =
    tone === "success"
      ? "rgba(34,197,94,0.14)"
      : tone === "warning"
        ? "rgba(245,158,11,0.18)"
        : tone === "danger"
          ? theme.dangerBg
          : tone === "muted"
            ? theme.surfaceAlt
            : theme.surfaceAlt;
  const color = tone === "danger" ? theme.dangerText : tone === "warning" ? theme.warning : theme.primaryText;
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <AppText variant="caption" weight="800" color={color}>
        {children}
      </AppText>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <AnimatedPressable
      hitSlop={8}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border
        }
      ]}
    >
      <AppText variant="caption" weight="800" color={selected ? theme.onPrimary : theme.text} align="center">
        {label}
      </AppText>
    </AnimatedPressable>
  );
}

export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string | null | undefined; size?: number }) {
  const theme = useTheme();
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border }]}>
      <AppText weight="900" color={theme.primary}>{initials}</AppText>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading" weight="900" color={theme.text}>
        {title}
      </AppText>
      {action}
    </View>
  );
}

export function EmptyState({ title, description, action, image, animation, icon = "inbox" }: { title: string; description: string; action?: ReactNode; image?: ImageSourcePropType; animation?: LottieSource; icon?: ComponentProps<typeof Feather>["name"] }) {
  const theme = useTheme();
  const iconNode = (
    <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceAlt }]}>
      <Feather name={icon} size={26} color={theme.primary} />
    </View>
  );
  return (
    <Card style={styles.emptyCard} accessibleLabel={`${title}. ${description}`}>
      {animation ? (
        <LottieAsset source={animation} size={140} style={{ marginBottom: 8 }} fallback={iconNode} />
      ) : image ? (
        <Image source={image} style={styles.emptyImage} resizeMode="contain" />
      ) : (
        iconNode
      )}
      <AppText variant="heading" weight="900" color={theme.text} align="center">
        {title}
      </AppText>
      <AppText color={theme.muted} align="center" style={{ marginTop: 8, lineHeight: 22 }}>
        {description}
      </AppText>
      <View style={{ marginTop: 18 }}>{action}</View>
    </Card>
  );
}

export function AppLoader({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.loader}>
      <LottieAsset source={lotties.loading} size={128} fallback={<ActivityIndicator size="large" color={theme.primary} />} />
      {label ? <AppText color={theme.muted} style={{ marginTop: 6 }}>{label}</AppText> : null}
    </View>
  );
}

export function Skeleton({ height = 18, width = "100%", radius = 14, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0.36, 0.82]) }));
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: theme.border }, animatedStyle, style]} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function buttonColors(theme: Theme, variant: ButtonProps["variant"]) {
  if (variant === "secondary") return { background: theme.surfaceAlt, border: theme.border, text: theme.primaryText };
  if (variant === "ghost") return { background: "transparent", border: "transparent", text: theme.text };
  if (variant === "danger") return { background: theme.dangerBg, border: theme.dangerBg, text: theme.dangerText };
  return { background: theme.primary, border: theme.primary, text: theme.onPrimary };
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  padded: { paddingHorizontal: 20, paddingBottom: 28 },
  card: { borderRadius: radii.xl, borderWidth: 1, padding: 18 },
  button: { minHeight: 54, borderRadius: radii.lg, borderWidth: 1, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  iconButton: { width: 46, height: 46, minHeight: 46, paddingHorizontal: 0, borderRadius: radii.pill },
  badge: { alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, minWidth: 64 },
  avatar: { alignItems: "center", justifyContent: "center" },
  sectionHeader: { marginTop: 24, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyCard: { alignItems: "center", paddingVertical: 28 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, marginBottom: 16, alignItems: "center", justifyContent: "center" },
  emptyImage: { width: 156, height: 128, marginBottom: 14 }
});



