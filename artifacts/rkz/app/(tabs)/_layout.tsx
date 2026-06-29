import { BlurView } from "expo-blur";
import { Tabs, router, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

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

// ── Root layout ───────────────────────────────────────────────────────────────
// ── Tab order (logical, LTR) ──────────────────────────────────────────────────
const TAB_ROUTES = ["index", "add", "explore", "settings"] as const;

export default function TabLayout() {
  const { langChosen, isLoading } = useApp();
  const { t, isAr }               = useLocale();
  const isIOS                     = Platform.OS === "ios";
  const pathname                  = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!langChosen) {
      router.replace("/language-select" as never);
    }
  }, [isLoading, langChosen]);

  if (isLoading || !langChosen) return null;

  const tabDefs = [
    {
      name:  "index",
      title: t.tabs.home,
      icon:  (color: string) => <MaterialIcons name="home" size={26} color={color} />,
    },
    {
      name:  "add",
      title: t.tabs.search,
      icon:  (color: string) => <MaterialIcons name="search" size={26} color={color} />,
    },
    {
      name:  "explore",
      title: isAr ? "المصمم" : "AI Design",
      icon:  (color: string) => <MaterialIcons name="auto-fix-high" size={24} color={color} />,
      isAiStaging: true,
    },
    {
      name:  "settings",
      title: t.tabs.profile,
      icon:  (color: string) => <MaterialIcons name="person-outline" size={26} color={color} />,
    },
  ];

  // RTL: reverse tab order for Arabic
  const ordered = isAr ? [...tabDefs].reverse() : tabDefs;

  // ── Swipe between tabs ──────────────────────────────────────────────────────
  // Determine current logical index (0=home 1=search 2=tourism 3=profile)
  const currentTabIdx = TAB_ROUTES.findIndex((name) =>
    pathname === `/(tabs)/${name}` || pathname === `/${name}` ||
    (name === "index" && (pathname === "/" || pathname === "/(tabs)"))
  );

  const swipeGesture = Gesture.Pan()
    .activeOffsetX(isAr ? [15, -15] : [-15, 15])
    .failOffsetY([-12, 12])
    .runOnJS(true)
    .onEnd((e) => {
      if (Math.abs(e.translationX) < 60) return;
      // Swipe direction: left = forward (next), right = back (prev)
      // In RTL, directions are reversed visually
      const goForward = isAr ? e.translationX > 0 : e.translationX < 0;
      const idx = currentTabIdx >= 0 ? currentTabIdx : 0;
      const nextIdx = goForward
        ? Math.min(idx + 1, TAB_ROUTES.length - 1)
        : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      const target = TAB_ROUTES[nextIdx];
      router.navigate(target === "index" ? "/" : `/${target}` as never);
    });

  return (
    <GestureDetector gesture={swipeGesture}>
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor:   GOLD,
        tabBarInactiveTintColor: "rgba(15,32,64,0.45)",
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarItemStyle: { flex: 1, justifyContent: "center", alignItems: "center" },
        tabBarStyle: {
          position:        "absolute",
          backgroundColor: "transparent",
          borderTopWidth:  0,
          elevation:       0,
          height:          Platform.OS === "web" ? 88 : 70,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.97)" }]} />
          ),
      }}
    >
      {ordered.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // AI Staging tab: override the button to push the modal screen instead of switching tabs
            ...((tab as any).isAiStaging
              ? {
                  tabBarButton: () => (
                    <Pressable
                      style={s.stagingTabBtn}
                      onPress={() => router.push("/ai-staging" as never)}
                    >
                      <View style={s.stagingTabInner}>
                        <MaterialIcons name="auto-fix-high" size={24} color={GOLD} />
                        <Text style={s.stagingTabLabel}>{isAr ? "المصمم" : "AI Design"}</Text>
                        <View style={s.stagingTabDot} />
                      </View>
                    </Pressable>
                  ),
                }
              : {
                  tabBarIcon: ({ color, focused }) => (
                    <View style={s.tabItem}>
                      <AnimatedTabIcon focused={focused}>
                        {tab.icon(focused ? GOLD : "rgba(15,32,64,0.45)")}
                      </AnimatedTabIcon>
                      <Animated.Text
                        style={{
                          fontSize: 9,
                          fontFamily: focused ? "Inter_700Bold" : "Inter_400Regular",
                          color: focused ? GOLD : "rgba(15,32,64,0.45)",
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {tab.title}
                      </Animated.Text>
                      {focused && <View style={s.dot} />}
                    </View>
                  ),
                }),
          }}
        />
      ))}
      {/* Hidden tabs — reachable via router.push but not shown in tab bar */}
      <Tabs.Screen
        name="ai-concierge"
        options={{ href: null, title: t.tabs.financing }}
      />
      <Tabs.Screen
        name="listings"
        options={{ href: null, title: t.tabs.favorites }}
      />
    </Tabs>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  tabItem: {
    alignItems:     "center",
    justifyContent: "center",
    paddingTop: 6,
    gap: 1,
  },
  dot: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: GOLD,
    marginTop:       2,
  },
  // AI Staging tab button — always gold, always visible
  stagingTabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stagingTabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    gap: 2,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
  },
  stagingTabLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    marginTop: 1,
  },
  stagingTabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 1,
  },
});
