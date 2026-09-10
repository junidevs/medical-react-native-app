import { type ComponentProps, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "./typography";
import { GlassView } from "./glass";
import { useTheme } from "./theme";
import { shadows } from "./tokens";

type Route = { key: string; name: string };

interface TabBarProps {
  state: { index: number; routes: Route[] };
  navigation: {
    emit: (event: { type: "tabPress"; target?: string; canPreventDefault: true }) => { defaultPrevented?: boolean };
    navigate: (name: string) => void;
  };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type FeatherName = ComponentProps<typeof Feather>["name"];

// Explicit whitelist keeps hidden routes (href: null) and dynamic routes
// (doctors/[id], check-in/[id], portal-*) out of the tab bar.
const TABS: { name: string; label: string; icon: FeatherName }[] = [
  { name: "index", label: "Start", icon: "home" },
  { name: "appointments", label: "Wizyty", icon: "calendar" },
  { name: "book", label: "Rezerwuj", icon: "plus" },
  { name: "portal", label: "Portal", icon: "grid" },
  { name: "profile", label: "Profil", icon: "user" }
];

export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={[styles.barShadow, shadows.lifted]}>
        <GlassView
          intensity={40}
          tint={theme.mode === "dark" ? "dark" : "light"}
          fallbackColor={theme.glass}
          style={[styles.bar, { borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.7)" }]}
        >
          {TABS.map((tab) => {
            const route = state.routes.find((item) => item.name === tab.name);
            if (!route) return null;
            const focused = activeName === tab.name;
            return (
              <TabItem
                key={tab.name}
                label={tab.label}
                icon={tab.icon}
                focused={focused}
                onPress={() => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    void Haptics.selectionAsync().catch(() => undefined);
                    navigation.navigate(tab.name);
                  }
                }}
              />
            );
          })}
        </GlassView>
      </View>
    </View>
  );
}

// Apple HIG-style motion: short, ease-out, no spring overshoot (no "bounce").
const STANDARD = Easing.out(Easing.cubic);

function TabItem({ label, icon, focused, onPress }: { label: string; icon: FeatherName; focused: boolean; onPress: () => void }) {
  const theme = useTheme();
  const pressed = useSharedValue(0);
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = withTiming(focused ? 1 : 0, { duration: 260, easing: STANDARD });
  }, [focused, active]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(active.value, [0, 1], ["rgba(0,0,0,0)", theme.primary]),
    transform: [{ scale: 1 - pressed.value * 0.08 }]
  }));

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + active.value * 0.06 }] }));

  return (
    <AnimatedPressable
      layout={LinearTransition.duration(280).easing(Easing.inOut(Easing.cubic))}
      hitSlop={10}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 90, easing: STANDARD });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 160, easing: STANDARD });
      }}
      onPress={onPress}
      style={[styles.item, pillStyle]}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={iconStyle}>
        <Feather name={icon} size={20} color={focused ? theme.onPrimary : theme.muted} />
      </Animated.View>
      {focused ? (
        <Animated.View entering={FadeIn.duration(220).easing(STANDARD)} exiting={FadeOut.duration(140)}>
          <AppText variant="tiny" weight="800" color={theme.onPrimary}>
            {label}
          </AppText>
        </Animated.View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  barShadow: { borderRadius: 32, marginHorizontal: 20 },
  bar: {
    minHeight: 64,
    borderRadius: 32,
    borderWidth: 1,
    padding: 8,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    overflow: "hidden"
  },
  item: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  }
});
