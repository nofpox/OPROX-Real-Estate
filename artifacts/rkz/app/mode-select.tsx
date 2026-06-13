import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";

const LOGO = require("@/assets/images/rozoz-logo-eagle.png");
const { width } = Dimensions.get("window");
const LOGO_W = Math.min(width * 0.62, 250);
const LOGO_H = Math.round(LOGO_W / 2.5);

const BG   = "#0A0E1A";
const GOLD = "#C9A84C";
const WHITE = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.55)";

export default function ModeSelectScreen() {
  const { setAppMode } = useApp();

  const logoAnim  = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const titleY    = useRef(new Animated.Value(18)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const cardsY    = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleY,    { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardsAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(cardsY,    { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const goRegistered = () => {
    setAppMode("registered");
    router.replace("/(tabs)" as never);
  };

  const goTourist = () => {
    setAppMode("tourist");
    router.replace("/(tabs)/explore" as never);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <LinearGradient
        colors={[BG, "#0D1828", "#0A0E1A"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* subtle gold glow top */}
      <LinearGradient
        colors={["rgba(201,168,76,0.06)", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: "40%" }]}
      />

      <View style={s.content}>
        {/* Logo */}
        <Animated.View style={{ opacity: logoAnim, transform: [{ scale: logoScale }] }}>
          <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
        </Animated.View>

        {/* Title */}
        <Animated.View style={[s.titleWrap, { opacity: titleAnim, transform: [{ translateY: titleY }] }]}>
          <Text style={s.welcome}>مرحبًا بك في ROZOZ</Text>
          <Text style={s.subtitle}>تستكشف ولا تعرض؟</Text>
        </Animated.View>

        {/* Choice cards */}
        <Animated.View style={[s.cards, { opacity: cardsAnim, transform: [{ translateY: cardsY }] }]}>

          {/* Registered card */}
          <Pressable
            onPress={goRegistered}
            style={({ pressed }) => [s.card, s.cardGold, pressed && s.pressed]}
          >
            <View style={s.iconWrapDark}>
              <MaterialIcons name="vpn-key" size={30} color={BG} />
            </View>
            <View style={s.cardText}>
              <Text style={s.cardTitle}>مستثمر / مستأجر / بائع</Text>
              <Text style={s.cardSub}>Investor · Tenant · Seller</Text>
            </View>
            <MaterialIcons name="chevron-left" size={22} color={BG} style={{ opacity: 0.55 }} />
          </Pressable>

          {/* Tourist card */}
          <Pressable
            onPress={goTourist}
            style={({ pressed }) => [s.card, s.cardDark, pressed && s.pressed]}
          >
            <View style={s.iconWrapGold}>
              <MaterialIcons name="camera-alt" size={30} color={GOLD} />
            </View>
            <View style={s.cardText}>
              <Text style={s.cardTitleLight}>أنا سائح</Text>
              <Text style={s.cardSubLight}>Tourist · Explorer</Text>
            </View>
            <MaterialIcons name="chevron-left" size={22} color={GOLD} style={{ opacity: 0.6 }} />
          </Pressable>

        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 32,
  },

  titleWrap: { alignItems: "center", gap: 10 },
  welcome: {
    color: GOLD,
    fontSize: 23,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  cards: { width: "100%", gap: 14 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
  },
  cardGold: { backgroundColor: GOLD },
  cardDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.32)",
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },

  iconWrapDark: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: "rgba(10,14,26,0.22)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  iconWrapGold: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1.5, borderColor: "rgba(201,168,76,0.35)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  cardText: { flex: 1 },
  cardTitle: {
    color: "#0A1628",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  cardSub: {
    color: "rgba(10,14,26,0.58)",
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
});
