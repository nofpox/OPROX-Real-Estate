import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";


const NAVY  = "#0F2040";
const GOLD  = "#C9A84C";
const WHITE = "#F5F0E8";
const { width } = Dimensions.get("window");

const ROLES = [
  {
    id:   "buyer"  as const,
    icon: "🗺️",
    ar:   "سائح / زائر",
    sub:  "أستكشف العقارات المتاحة",
  },
  {
    id:   "owner"  as const,
    icon: "🏠",
    ar:   "مستأجر",
    sub:  "أبحث عن وحدة للإيجار",
  },
  {
    id:   "seller" as const,
    icon: "🏢",
    ar:   "مالك / مستثمر",
    sub:  "أريد نشر أو إدارة عقاراتي",
  },
];

export default function GateScreen() {
  const insets = useSafeAreaInsets();
  const { setSelectedRole } = useApp();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(role: "buyer" | "seller" | "owner") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRole(role);
    if (role === "buyer") {
      router.replace("/(tabs)/explore" as never);
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Brand name */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: GOLD, fontSize: 30, fontWeight: "800", letterSpacing: 3 }}>ESTETI IN</Text>
      </Animated.View>

      {/* Heading */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: "center", marginBottom: 32 }}>
        <Text style={s.prompt}>كيف تريد الاستفادة؟</Text>
        <Text style={s.sub}>اختر ما يناسب وضعك للمتابعة</Text>
      </Animated.View>

      {/* Role cards */}
      <Animated.View style={[s.cards, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {ROLES.map((r) => (
          <Pressable
            key={r.id}
            style={({ pressed }) => [s.card, pressed && s.cardPressed]}
            onPress={() => choose(r.id)}
          >
            <Text style={s.cardIcon}>{r.icon}</Text>
            <View style={s.cardText}>
              <Text style={s.cardTitle}>{r.ar}</Text>
              <Text style={s.cardSub}>{r.sub}</Text>
            </View>
            <Text style={s.arrow}>‹</Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: NAVY,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 24,
  },

  prompt: {
    color:         WHITE,
    fontSize:      24,
    fontFamily:    "Inter_700Bold",
    textAlign:     "center",
    marginBottom:  8,
  },
  sub: {
    color:      "rgba(245,240,232,0.50)",
    fontSize:   13,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
  },

  cards: {
    width:  "100%",
    maxWidth: 400,
    gap:    14,
  },

  card: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             14,
    backgroundColor: "rgba(201,168,76,0.08)",
    borderWidth:     1,
    borderColor:     "rgba(201,168,76,0.28)",
    borderRadius:    18,
    paddingHorizontal: 20,
    paddingVertical:   18,
  },
  cardPressed: {
    backgroundColor: "rgba(201,168,76,0.18)",
    borderColor:     GOLD,
  },

  cardIcon: {
    fontSize: 28,
    width:    40,
    textAlign: "center",
  },
  cardText: { flex: 1 },
  cardTitle: {
    color:      WHITE,
    fontSize:   16,
    fontFamily: "Inter_700Bold",
    textAlign:  "right",
    marginBottom: 3,
  },
  cardSub: {
    color:      "rgba(245,240,232,0.50)",
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    textAlign:  "right",
  },

  arrow: {
    color:    GOLD,
    fontSize: 22,
    lineHeight: 24,
    fontFamily: "Inter_700Bold",
  },
});
