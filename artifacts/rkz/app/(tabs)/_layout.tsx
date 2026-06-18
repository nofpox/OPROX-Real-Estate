import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

let sessionWelcomeShown = false;
const RESTRICTED_TABS = ["add", "listings", "ai-concierge"];

// ── Animated tab icon ─────────────────────────────────────────────────────────
function AnimatedTabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(1.28, { damping: 5, stiffness: 280, mass: 0.6 }),
        withSpring(1,    { damping: 8, stiffness: 200 }),
      );
    } else {
      scale.value = withTiming(1, { duration: 180 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// ── Animated tab label ────────────────────────────────────────────────────────
function AnimatedTabLabel({ focused, label, color }: { focused: boolean; label: string; color: string }) {
  const translateY = useSharedValue(focused ? 0 : 3);
  const opacityV   = useSharedValue(focused ? 1 : 0.55);

  useEffect(() => {
    translateY.value = withSpring(focused ? 0 : 3, { damping: 12, stiffness: 200 });
    opacityV.value   = withTiming(focused ? 1 : 0.55, { duration: 200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacityV.value,
  }));

  return (
    <Animated.Text
      style={[animStyle, { fontSize: 10, fontFamily: focused ? "Inter_700Bold" : "Inter_400Regular", color, marginTop: 2 }]}
      numberOfLines={1}
    >
      {label}
    </Animated.Text>
  );
}

// ── Active dot ────────────────────────────────────────────────────────────────
function ActiveDot({ focused, color }: { focused: boolean; color: string }) {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value   = withSpring(focused ? 1 : 0, { damping: 10, stiffness: 300 });
    opacity.value = withTiming(focused ? 1 : 0, { duration: 180 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[style, { width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 3 }]}
    />
  );
}

// ── Native (iOS Liquid Glass) tab layout ──────────────────────────────────────
function NativeTabLayout({ requireAuth: _requireAuth }: { requireAuth: (action: () => void) => void }) {
  const { t, isAr } = useLocale();
  const { user, selectedRole } = useApp();
  const canSeeSettings = !!user && selectedRole !== "buyer";

  const allTriggers = [
    { name: "index",        sf: { default: "house",                  selected: "house.fill"                  }, label: t.tabs.home       },
    { name: "add",          sf: { default: "plus.circle",            selected: "plus.circle.fill"            }, label: t.tabs.add        },
    { name: "listings",     sf: { default: "list.bullet",            selected: "list.bullet.circle.fill"     }, label: t.tabs.listings   },
    { name: "ai-concierge", sf: { default: "wrench.and.screwdriver", selected: "wrench.and.screwdriver.fill" }, label: t.tabs.myRequests },
    ...(canSeeSettings ? [{ name: "settings", sf: { default: "gearshape", selected: "gearshape.fill" }, label: t.tabs.settings }] : []),
  ];

  const ordered = isAr ? [...allTriggers].reverse() : allTriggers;

  return (
    <NativeTabs>
      {ordered.map((item) => (
        <NativeTabs.Trigger key={item.name} name={item.name}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Icon sf={item.sf as any} />
          <Label>{item.label}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

// ── Classic (web / Android) tab layout ────────────────────────────────────────
function ClassicTabLayout({ requireAuth }: { requireAuth: (action: () => void) => void }) {
  const colors      = useColors();
  const colorScheme = useColorScheme();
  const { t, isAr } = useLocale();
  const { user, selectedRole } = useApp();
  const isDark    = colorScheme === "dark";
  const isIOS     = Platform.OS === "ios";
  const isWeb     = Platform.OS === "web";
  const canSeeSettings = !!user && selectedRole !== "buyer";

  const tabDefs = [
    {
      name: "index",
      title: t.tabs.home,
      icon: (color: string) => isIOS
        ? <SymbolView name="house" tintColor={color} size={28} />
        : <MaterialIcons name="home" size={28} color={color} />,
    },
    {
      name: "add",
      title: t.tabs.add,
      icon: (color: string) => isIOS
        ? <SymbolView name="plus.circle" tintColor={color} size={28} />
        : <MaterialIcons name="add-circle-outline" size={28} color={color} />,
    },
    {
      name: "listings",
      title: t.tabs.listings,
      icon: (color: string) => isIOS
        ? <SymbolView name="list.bullet" tintColor={color} size={28} />
        : <MaterialIcons name="list" size={28} color={color} />,
    },
    {
      name: "ai-concierge",
      title: t.tabs.myRequests,
      icon: (color: string) => isIOS
        ? <SymbolView name="wrench.and.screwdriver" tintColor={color} size={28} />
        : <MaterialIcons name="build-circle" size={28} color={color} />,
    },
    {
      name: "settings",
      title: t.tabs.settings,
      icon: (color: string) => isIOS
        ? <SymbolView name="gearshape" tintColor={color} size={28} />
        : <MaterialIcons name="settings" size={28} color={color} />,
    },
  ];

  const ordered = isAr ? [...tabDefs].reverse() : tabDefs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor:   colors.gold,
        tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.55)",
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarItemStyle: { flex: 1, justifyContent: "center", alignItems: "center" },
        tabBarStyle: {
          position:        "absolute",
          backgroundColor: "transparent",
          borderTopWidth:  0,
          elevation:       0,
          height:          isWeb ? 90 : 72,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} />
          ),
      }}
    >
      {ordered.map((tab) => {
        const hideCompletely = tab.name === "settings" && !canSeeSettings;

        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href:  hideCompletely ? null : undefined,
              tabBarIcon: ({ color, focused }) => (
                <View style={s.tabItem}>
                  <AnimatedTabIcon focused={focused}>
                    {tab.icon(color)}
                  </AnimatedTabIcon>
                  <AnimatedTabLabel focused={focused} label={tab.title} color={color} />
                  <ActiveDot focused={focused} color={colors.gold} />
                </View>
              ),
            }}
            listeners={{
              tabPress: (e) => {
                if (RESTRICTED_TABS.includes(tab.name)) {
                  e.preventDefault();
                  requireAuth(() => router.navigate(`/(tabs)/${tab.name}` as never));
                }
              },
            }}
          />
        );
      })}
      {/* Keep explore file routable but hidden from tab bar */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user, isLoading, langChosen, consentGiven, appMode } = useApp();

  useEffect(() => {
    if (isLoading) return;

    if (langChosen === false) {
      router.replace("/language-select" as never);
      return;
    }

    // No mode chosen → mode selection screen
    if (appMode === null) {
      router.replace("/mode-select" as never);
      return;
    }

    // Tourist flow: skip auth, go straight to tourism map
    if (appMode === "tourist") {
      router.replace("/tourism-map" as never);
      return;
    }

    // Registered flow: consent → welcome
    if (user && consentGiven === false) {
      router.replace("/consent" as never);
      return;
    }

    if (user && consentGiven !== false && !sessionWelcomeShown) {
      sessionWelcomeShown = true;
      router.replace("/welcome" as never);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, consentGiven, langChosen, user, appMode]);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) { action(); return; }
      router.push("/login" as never);
    },
    [user],
  );

  if (isLoading || langChosen === false || appMode === null) {
    return null;
  }

  return isLiquidGlassAvailable()
    ? <NativeTabLayout requireAuth={requireAuth} />
    : <ClassicTabLayout requireAuth={requireAuth} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  tabItem: {
    alignItems:     "center",
    justifyContent: "center",
    paddingTop:     6,
    gap:            3,
  },
});
