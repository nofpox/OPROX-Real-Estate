import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

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
export default function TabLayout() {
  const { langChosen, isLoading } = useApp();
  const { t, isAr }               = useLocale();
  const isIOS                     = Platform.OS === "ios";

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
      title: t.tabs.tourism,
      icon:  (color: string) => <MaterialIcons name="hotel" size={24} color={color} />,
    },
    {
      name:  "settings",
      title: t.tabs.profile,
      icon:  (color: string) => <MaterialIcons name="person-outline" size={26} color={color} />,
    },
  ];

  // RTL: reverse tab order for Arabic
  const ordered = isAr ? [...tabDefs].reverse() : tabDefs;

  return (
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
});
