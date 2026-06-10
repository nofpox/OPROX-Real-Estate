import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback } from "react";
import {
  Platform,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import RegisterModal from "@/components/RegisterModal";

const DISCOVERY_FILTER_KEY = "rozoz_discovery_filter";

const RESTRICTED_TABS = ["add", "listings", "ai-concierge"];

// ── Native (iOS Liquid Glass) tab layout ──────────────────────────────────────
function NativeTabLayout({ requireAuth }: { requireAuth: (action: () => void) => void }) {
  const { t, isAr } = useLocale();

  const triggers = [
    { name: "index",        sf: { default: "map",                    selected: "map.fill"                    }, label: t.tabs.home       },
    { name: "explore",      sf: { default: "safari",                 selected: "safari.fill"                 }, label: t.tabs.explore    },
    { name: "add",          sf: { default: "plus.circle",            selected: "plus.circle.fill"            }, label: t.tabs.add        },
    { name: "listings",     sf: { default: "list.bullet",            selected: "list.bullet.circle.fill"     }, label: t.tabs.listings   },
    { name: "ai-concierge", sf: { default: "wrench.and.screwdriver", selected: "wrench.and.screwdriver.fill" }, label: t.tabs.myRequests },
    { name: "settings",     sf: { default: "gearshape",              selected: "gearshape.fill"              }, label: t.tabs.settings   },
  ];

  const ordered = isAr ? [...triggers].reverse() : triggers;

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
  const isDark = colorScheme === "dark";
  const isIOS  = Platform.OS === "ios";
  const isWeb  = Platform.OS === "web";

  const tabDefs = [
    {
      name:  "index",
      title: t.tabs.home,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="map" tintColor={color} size={24} />
          : <MaterialIcons name="map" size={24} color={color} />,
    },
    {
      name:  "explore",
      title: t.tabs.explore,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="safari" tintColor={color} size={24} />
          : <MaterialIcons name="explore" size={24} color={color} />,
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
      title: t.tabs.myRequests,
      icon:  (color: string) =>
        isIOS
          ? <SymbolView name="wrench.and.screwdriver" tintColor={color} size={24} />
          : <MaterialIcons name="build-circle" size={24} color={color} />,
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
          listeners={{
            tabPress: (e) => {
              if (RESTRICTED_TABS.includes(tab.name)) {
                e.preventDefault();
                requireAuth(() => router.navigate(`/(tabs)/${tab.name}` as never));
              }
            },
          }}
        />
      ))}
    </Tabs>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user, showRegister } = useApp();

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) { action(); return; }
      showRegister(action);
    },
    [user, showRegister],
  );

  return (
    <>
      <RegisterModal />
      {isLiquidGlassAvailable()
        ? <NativeTabLayout requireAuth={requireAuth} />
        : <ClassicTabLayout requireAuth={requireAuth} />
      }
    </>
  );
}

// keep AsyncStorage available for future DISCOVERY_FILTER_KEY usage
void AsyncStorage;
void DISCOVERY_FILTER_KEY;
