import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs, router } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const DISCOVERY_FILTER_KEY = "rkz_discovery_filter";

// ── Role Gate (full-screen modal shown once until user picks a role) ──────────
function RoleGate() {
  const { selectedRole, setSelectedRole } = useApp();
  const colors = useColors();
  const { isAr } = useLocale();

  const handleSelect = useCallback(
    async (role: "buyer" | "seller") => {
      setSelectedRole(role);
      if (role === "buyer") {
        // Pre-select "all" on the discovery map
        await AsyncStorage.setItem(DISCOVERY_FILTER_KEY, "all").catch(() => {});
        // Default tab is index — nothing extra needed
      } else {
        // Seller → go to Property Registration tab
        setTimeout(() => router.navigate("/(tabs)/add"), 80);
      }
    },
    [setSelectedRole],
  );

  return (
    <Modal
      visible={!selectedRole}
      animationType="fade"
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <View style={[gate.container, { backgroundColor: colors.navy }]}>
        {/* Logo area */}
        <View style={gate.logoArea}>
          <Image
            source={require("@/assets/images/rozoz-logo.png")}
            style={gate.logo}
            resizeMode="contain"
          />
          <Text style={gate.tagline}>
            {isAr ? "محرك النشر العقاري الفوري" : "Instant Real Estate Publishing Engine"}
          </Text>
        </View>

        {/* Prompt */}
        <Text style={[gate.prompt, isAr && { textAlign: "right" }]}>
          {isAr ? "كيف تريد الاستخدام؟" : "How would you like to proceed?"}
        </Text>

        {/* Role Cards */}
        <View style={[gate.cardRow, isAr && { flexDirection: "row-reverse" }]}>
          {/* Buyer */}
          <Pressable
            onPress={() => void handleSelect("buyer")}
            style={({ pressed }) => [gate.card, pressed && gate.cardPressed]}
          >
            <View style={[gate.cardIcon, { backgroundColor: colors.gold + "22" }]}>
              <MaterialIcons name="search" size={36} color={colors.gold} />
            </View>
            <Text style={gate.cardTitle}>{isAr ? "مشتري" : "Buyer"}</Text>
            <Text style={[gate.cardDesc, isAr && { textAlign: "center" }]}>
              {isAr ? "ابحث عن عقارك المثالي" : "Find your ideal property"}
            </Text>
          </Pressable>

          {/* Seller */}
          <Pressable
            onPress={() => void handleSelect("seller")}
            style={({ pressed }) => [gate.card, pressed && gate.cardPressed]}
          >
            <View style={[gate.cardIcon, { backgroundColor: "#2563EB22" }]}>
              <MaterialIcons name="add-home-work" size={36} color="#60A5FA" />
            </View>
            <Text style={gate.cardTitle}>{isAr ? "بائع" : "Seller"}</Text>
            <Text style={[gate.cardDesc, isAr && { textAlign: "center" }]}>
              {isAr ? "أعلن عن عقارك الآن" : "List your property now"}
            </Text>
          </Pressable>
        </View>

        <Text style={gate.footer}>
          {isAr ? "يمكنك التنقل بين الأقسام في أي وقت" : "You can switch sections anytime"}
        </Text>
      </View>
    </Modal>
  );
}

// ── Native (iOS Liquid Glass) tab layout ──────────────────────────────────────
function NativeTabLayout() {
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
function ClassicTabLayout() {
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
        />
      ))}
    </Tabs>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user, appMode } = useApp();

  // Allow tourist (guest) access without login
  if (!user && appMode !== "tourist") {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <RoleGate />
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
    </>
  );
}

// ── Role Gate Styles ──────────────────────────────────────────────────────────
const gate = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoArea: {
    alignItems:   "center",
    marginBottom: 48,
  },
  logo: {
    width:  200,
    height: 80,
    marginBottom: 8,
  },
  tagline: {
    color:       "rgba(255,255,255,0.45)",
    fontSize:    13,
    fontFamily:  "Inter_400Regular",
    marginTop:   6,
    textAlign:   "center",
  },
  prompt: {
    color:        "#FFFFFF",
    fontSize:     22,
    fontFamily:   "Inter_700Bold",
    marginBottom: 28,
    textAlign:    "center",
  },
  cardRow: {
    flexDirection: "row",
    gap:           14,
    width:         "100%",
    marginBottom:  32,
  },
  card: {
    flex:           1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth:    1.5,
    borderColor:    "rgba(255,255,255,0.12)",
    borderRadius:   20,
    alignItems:     "center",
    paddingVertical: 28,
    paddingHorizontal: 12,
    gap:            10,
  },
  cardPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor:     "#D4A843",
  },
  cardIcon: {
    width:          70,
    height:         70,
    borderRadius:   18,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   4,
  },
  cardTitle: {
    color:      "#FFFFFF",
    fontSize:   20,
    fontFamily: "Inter_700Bold",
  },
  cardDesc: {
    color:      "rgba(255,255,255,0.5)",
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    lineHeight: 18,
  },
  footer: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
  },
});
