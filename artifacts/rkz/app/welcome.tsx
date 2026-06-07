import React, { useCallback, useEffect, useRef } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const LOGO = require("@/assets/images/rozoz-logo.png");
const { width } = Dimensions.get("window");

const BG_DARK = "#0A0E1A";
const GOLD = "#C9A84C";
const TEXT_PRIMARY = "#F5F0E8";
const TEXT_MUTED = "rgba(245,240,232,0.55)";

const LOGO_W = Math.min(width * 0.52, 220);
const LOGO_H = Math.round(LOGO_W / 2.4);

const FEATURES = [
  { icon: "flash_on",    ar: "نشر فوري على جميع المنصات",  en: "Instant multi-platform publishing"  },
  { icon: "map",         ar: "خريطة اكتشاف العقارات",       en: "Interactive property discovery map"  },
  { icon: "assignment",  ar: "متابعة طلباتك بسهولة",        en: "Easy request tracking"               },
];

export default function WelcomeScreen() {
  const bgOpacity   = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.88)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyY       = useRef(new Animated.Value(16)).current;
  const ctaOpacity  = useRef(new Animated.Value(0)).current;
  const ctaY        = useRef(new Animated.Value(12)).current;
  const skipOpacity = useRef(new Animated.Value(0)).current;

  const navigated = useRef(false);

  const doNavigate = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace("/(tabs)");
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgOpacity,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();

    const bodyTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(bodyOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(bodyY,       { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 900);

    const skipTimer = setTimeout(() => {
      Animated.timing(skipOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 1000);

    const ctaTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ctaY,       { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 1800);

    const navTimer = setTimeout(doNavigate, 4500);

    return () => {
      clearTimeout(bodyTimer);
      clearTimeout(skipTimer);
      clearTimeout(ctaTimer);
      clearTimeout(navTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={[BG_DARK, "#0D1525", BG_DARK]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(201,168,76,0.05)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Skip */}
      <Animated.View style={[styles.skipWrap, { opacity: skipOpacity }]}>
        <Pressable
          onPress={doNavigate}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>تخطي</Text>
          <Text style={styles.skipChevron}>›</Text>
        </Pressable>
      </Animated.View>

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], marginBottom: 36 }}>
          <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
        </Animated.View>

        {/* Tagline + features */}
        <Animated.View style={[styles.body, { opacity: bodyOpacity, transform: [{ translateY: bodyY }] }]}>
          <Text style={styles.tagline}>محرك النشر العقاري الفوري</Text>
          <Text style={styles.taglineEn}>Instant Real Estate Publishing Engine</Text>

          <View style={styles.divider} />

          {FEATURES.map((f) => (
            <View key={f.en} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={{ fontSize: 16 }}>
                  {f.icon === "flash_on" ? "⚡" : f.icon === "map" ? "🗺️" : "📋"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureAr}>{f.ar}</Text>
                <Text style={styles.featureEn}>{f.en}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.ctaWrap, { opacity: ctaOpacity, transform: [{ translateY: ctaY }] }]}>
          <Pressable
            onPress={doNavigate}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.ctaBtnText}>ابدأ الآن  ›</Text>
          </Pressable>
          <Text style={styles.ctaSub}>Get Started</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK },

  skipWrap: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    right: 24,
    zIndex: 10,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    backgroundColor: "rgba(201,168,76,0.06)",
  },
  skipText: { color: "rgba(245,240,232,0.65)", fontSize: 13, fontFamily: "Inter_500Medium" },
  skipChevron: { color: GOLD, fontSize: 16, lineHeight: 18 },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  body: { width: "100%", maxWidth: 340, alignItems: "center" },

  tagline: {
    color: GOLD,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  taglineEn: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 0.3,
  },

  divider: {
    width: 40,
    height: 1.5,
    backgroundColor: GOLD,
    opacity: 0.4,
    borderRadius: 1,
    marginVertical: 20,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
    marginBottom: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(201,168,76,0.1)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureAr: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  featureEn: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 2,
  },

  ctaWrap: {
    marginTop: 36,
    alignItems: "center",
    gap: 10,
  },
  ctaBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
  },
  ctaBtnText: {
    color: "#0A1628",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  ctaSub: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});
