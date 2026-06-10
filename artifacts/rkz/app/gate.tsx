import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";

const LOGO = require("@/assets/images/rozoz-logo.png");
const { width } = Dimensions.get("window");
const LOGO_W = Math.min(width * 0.52, 220);
const LOGO_H = Math.round(LOGO_W / 2.6);

const NAVY  = "#0A1628";
const GOLD  = "#C9A84C";
const WHITE = "#F5F0E8";

export default function GateScreen() {
  const { user, isLoading, appMode, setAppMode } = useApp();
  const { isAr } = useLocale();
  const insets = useSafeAreaInsets();

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Dev shortcut
  if (__DEV__) return <Redirect href="/(tabs)" />;

  // Already chose a mode or already logged in → redirect appropriately
  if (!isLoading) {
    if (user)                     return <Redirect href="/(tabs)" />;
    if (appMode === "tourist")    return <Redirect href="/(tabs)/explore" />;
    if (appMode === "registered") return <Redirect href="/login" />;
  }

  // Still loading
  if (isLoading) return null;

  function handleTourist() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppMode("tourist");
    router.replace("/(tabs)/explore");
  }

  function handleRealEstate() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppMode("registered");
    router.replace("/login");
  }

  return (
    <View style={[s.root, { paddingTop: topPad, paddingBottom: bottomPad + 16 }]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <View style={s.logoWrap}>
        <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
        <Text style={s.tagline}>
          {isAr ? "محرك النشر العقاري الفوري" : "Instant Real Estate Publishing Engine"}
        </Text>
      </View>

      {/* ── Prompt ────────────────────────────────────────────────────────── */}
      <Text style={s.prompt}>
        {isAr ? "كيف يمكننا مساعدتك؟" : "How can we help you?"}
      </Text>
      <Text style={s.promptSub}>
        {isAr
          ? "اختر نوع الاستخدام للمتابعة"
          : "Choose how you'd like to use the app"}
      </Text>

      {/* ── Cards ─────────────────────────────────────────────────────────── */}
      <View style={[s.cards, isAr && { flexDirection: "row-reverse" }]}>

        {/* Tourist card */}
        <Pressable
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}
          onPress={handleTourist}
        >
          <View style={[s.iconCircle, { backgroundColor: "#16783A22" }]}>
            <Text style={{ fontSize: 36 }}>🗺️</Text>
          </View>
          <Text style={s.cardTitle}>
            {isAr ? "سائح / زائر" : "Tourist / Visitor"}
          </Text>
          <Text style={s.cardDesc}>
            {isAr
              ? "استكشف الأماكن السياحية والثقافية والفعاليات في السعودية — بدون تسجيل"
              : "Explore Saudi attractions, culture & events — no registration needed"}
          </Text>
          <View style={s.cardTag}>
            <MaterialIcons name="check-circle" size={13} color="#22c55e" />
            <Text style={[s.cardTagText, { color: "#22c55e" }]}>
              {isAr ? "بدون تسجيل" : "No sign-up required"}
            </Text>
          </View>
        </Pressable>

        {/* Real estate card */}
        <Pressable
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}
          onPress={handleRealEstate}
        >
          <View style={[s.iconCircle, { backgroundColor: GOLD + "22" }]}>
            <Text style={{ fontSize: 36 }}>🏠</Text>
          </View>
          <Text style={s.cardTitle}>
            {isAr ? "عقارات" : "Real Estate"}
          </Text>
          <Text style={s.cardDesc}>
            {isAr
              ? "ابحث عن عقار، أو أعلن عن عقارك على جميع المنصات فوراً"
              : "Find a property or list yours instantly across all platforms"}
          </Text>
          <View style={s.cardTag}>
            <MaterialIcons name="person" size={13} color={GOLD} />
            <Text style={[s.cardTagText, { color: GOLD }]}>
              {isAr ? "يتطلب تسجيلاً" : "Registration required"}
            </Text>
          </View>
        </Pressable>

      </View>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Text style={s.footer}>
        {isAr
          ? "يمكنك تغيير هذا الاختيار لاحقاً من الإعدادات"
          : "You can change this choice later in Settings"}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: NAVY,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 22,
  },

  logoWrap: {
    alignItems:   "center",
    marginBottom: 40,
  },
  tagline: {
    color:       "rgba(245,240,232,0.40)",
    fontSize:    12,
    fontFamily:  "Inter_400Regular",
    marginTop:   8,
    textAlign:   "center",
    letterSpacing: 0.3,
  },

  prompt: {
    color:        WHITE,
    fontSize:     22,
    fontFamily:   "Inter_700Bold",
    textAlign:    "center",
    marginBottom: 8,
  },
  promptSub: {
    color:        "rgba(245,240,232,0.45)",
    fontSize:     13,
    fontFamily:   "Inter_400Regular",
    textAlign:    "center",
    marginBottom: 36,
  },

  cards: {
    flexDirection: "row",
    gap:           14,
    width:         "100%",
    marginBottom:  28,
  },
  card: {
    flex:              1,
    backgroundColor:   "rgba(255,255,255,0.05)",
    borderWidth:       1.5,
    borderColor:       "rgba(255,255,255,0.10)",
    borderRadius:      20,
    alignItems:        "center",
    paddingVertical:   24,
    paddingHorizontal: 14,
    gap:               10,
  },
  cardPressed: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor:     GOLD,
  },
  iconCircle: {
    width:          68,
    height:         68,
    borderRadius:   18,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   4,
  },
  cardTitle: {
    color:      WHITE,
    fontSize:   16,
    fontFamily: "Inter_700Bold",
    textAlign:  "center",
  },
  cardDesc: {
    color:      "rgba(245,240,232,0.50)",
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    lineHeight: 18,
  },
  cardTag: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    marginTop:     4,
  },
  cardTagText: {
    fontSize:   11,
    fontFamily: "Inter_500Medium",
  },

  footer: {
    color:      "rgba(245,240,232,0.25)",
    fontSize:   11,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
  },
});
