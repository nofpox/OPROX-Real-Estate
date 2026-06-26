import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { logAdminEvent } from "@/hooks/useAIAssistant";
import { useLocale } from "@/hooks/useLocale";

const LOGO  = require("@/assets/images/esteti-logo.png");
const { width } = Dimensions.get("window");
const LOGO_W = Math.min(width * 0.55, 220);
const LOGO_H = Math.round(LOGO_W * 0.75);

const BG    = "#0A0E1A";
const GOLD  = "#C9A84C";
const WHITE = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.58)";

export default function ModeSelectScreen() {
  const { setAppMode } = useApp();
  const { t } = useLocale();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goRegistered = () => {
    void logAdminEvent("property_section", "user_enter_property | button:property_section");
    setAppMode("registered");
    router.replace("/(tabs)" as never);
  };

  const goTourism = () => {
    void logAdminEvent("tourism_section", "user_enter_tourism | button:tourism_section");
    setAppMode("tourist");
    router.replace("/tourism-map" as never);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <Animated.View
        style={[
          s.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo */}
        <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />

        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.welcome}>مرحبًا بك في ESTETI IN</Text>
          <Text style={s.subtitle}>اختر وجهتك</Text>
        </View>

        {/* Real-estate card — gold */}
        <Pressable
          onPress={goRegistered}
          style={({ pressed }) => [s.card, s.cardGold, pressed && s.pressed]}
        >
          <View style={s.iconWrapDark}>
            <MaterialIcons name="domain" size={28} color={BG} />
          </View>
          <View style={s.cardText}>
            <Text style={s.cardTitle}>العقارات</Text>
            <Text style={s.cardSub}>بحث · إيجار · بيع · إدارة</Text>
          </View>
          <MaterialIcons name="chevron-left" size={22} color="rgba(10,14,26,0.5)" />
        </Pressable>

        {/* Tourism card — dark bordered */}
        <Pressable
          onPress={goTourism}
          style={({ pressed }) => [s.card, s.cardDark, pressed && s.pressed]}
        >
          <View style={s.iconWrapGold}>
            <MaterialIcons name="explore" size={28} color={GOLD} />
          </View>
          <View style={s.cardText}>
            <Text style={s.cardTitleLight}>السياحة في المملكة</Text>
            <Text style={s.cardSubLight}>استكشف المعالم والوجهات السياحية</Text>
          </View>
          <MaterialIcons name="chevron-left" size={22} color={GOLD} />
        </Pressable>

        {/* Legal disclaimer */}
        <Text style={s.disclaimer}>{t.explore.tourismDisclaimer}</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 20,
  },

  titleWrap: { alignItems: "center", gap: 8, marginTop: 8 },
  welcome: {
    color: GOLD,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  card: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  cardGold: { backgroundColor: GOLD },
  cardDark: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.3)",
  },
  pressed: { opacity: 0.83 },

  iconWrapDark: {
    width: 48, height: 48, borderRadius: 13,
    backgroundColor: "rgba(10,14,26,0.2)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  iconWrapGold: {
    width: 48, height: 48, borderRadius: 13,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1.5, borderColor: "rgba(201,168,76,0.3)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  cardText: { flex: 1 },
  cardTitle: {
    color: "#0F2040",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  cardSub: {
    color: "rgba(10,14,26,0.55)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 3,
  },
  cardTitleLight: {
    color: WHITE,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  cardSubLight: {
    color: MUTED,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 3,
  },
  disclaimer: {
    color:      "rgba(255,255,255,0.35)",
    fontSize:   10,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    lineHeight: 16,
    paddingHorizontal: 8,
    marginTop:  4,
  },
});
