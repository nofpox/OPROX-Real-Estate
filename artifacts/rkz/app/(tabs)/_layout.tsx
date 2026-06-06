import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

// ── Native (iOS Liquid Glass) tab layout ──────────────────────────────────────
// NativeTabs handles RTL automatically at the OS level
function NativeTabLayout() {
  const { t, isAr } = useLocale();

  const triggers = [
    { name: "index",        sf: { default: "house",       selected: "house.fill"          }, label: t.tabs.home      },
    { name: "add",          sf: { default: "plus.circle",  selected: "plus.circle.fill"    }, label: t.tabs.add       },
    { name: "listings",     sf: { default: "list.bullet",  selected: "list.bullet.circle.fill" }, label: t.tabs.listings  },
    { name: "ai-concierge", sf: { default: "sparkles",     selected: "sparkles"            }, label: t.tabs.assistant },
    { name: "settings",     sf: { default: "gearshape",    selected: "gearshape.fill"      }, label: t.tabs.settings  },
  ];

  const ordered = isAr ? [...triggers].reverse() : triggers;

  return (
    <NativeTabs>
      {ordered.map((item) => (
        <NativeTabs.Trigger key={item.name} name={item.name}>
          <Icon sf={item.sf} />
          <Label>{item.label}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

// ── Classic (web / Android) tab layout ────────────────────────────────────────
function ClassicTabLayout() {
  const colors      = useColors();
  const colorScheme = useColorScheme();
  const { t, isAr } = useLocale();
  const isDark = colorScheme === "dark";
  const isIOS  = Platform.OS === "ios";
  const isWeb  = Platform.OS === "web";

  // Tab definitions — reversed for RTL so Home lands far-right, Settings far-left
  const tabDefs = [
    {
      name:  "index",
      title: t.tabs.home,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="house" tintColor={color} size={24} />
          : <MaterialIcons name="home" size={24} color={color} />,
    },
    {
      name:  "add",
      title: t.tabs.add,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="plus.circle" tintColor={color} size={24} />
          : <MaterialIcons name="add-circle-outline" size={24} color={color} />,
    },
    {
      name:  "listings",
      title: t.tabs.listings,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="list.bullet" tintColor={color} size={24} />
          : <MaterialIcons name="list" size={24} color={color} />,
    },
    {
      name:  "ai-concierge",
      title: t.tabs.assistant,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="sparkles" tintColor={color} size={24} />
          : <MaterialIcons name="forum" size={24} color={color} />,
    },
    {
      name:  "settings",
      title: t.tabs.settings,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="gearshape" tintColor={color} size={24} />
          : <MaterialIcons name="settings" size={24} color={color} />,
    },
  ];

  const ordered = isAr ? [...tabDefs].reverse() : tabDefs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor:   colors.gold,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: { flex: 1 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      {ordered.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => tab.icon(color),
          }}
        />
      ))}
    </Tabs>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user } = useApp();

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
