import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { Circle, Svg } from "react-native-svg";
import { useApp } from "@/context/AppContext";

// ─── Constants ──────────────────────────────────────────────────────────────
const LOGO = require("@/assets/images/rkaz-logo.png");
const { width, height } = Dimensions.get("window");

const BG_DARK = "#0A0E1A";
const GOLD = "#C9A84C";
const GREEN = "#22c55e";
const TEXT_PRIMARY = "#F5F0E8";
const TEXT_MUTED = "rgba(245,240,232,0.55)";

const GAUGE_R = 72;
const GAUGE_STROKE = 7;
const GAUGE_CIRCUM = 2 * Math.PI * GAUGE_R;
const TARGET_SCORE = 82;
const TARGET_FILL = TARGET_SCORE / 100;

const LOGO_W = Math.min(width * 0.48, 200);
const LOGO_H = Math.round(LOGO_W / 2.6);

// ─── Timing (ms) ────────────────────────────────────────────────────────────
const T = {
  BG_FADE: 0,
  LOGO_FADE: 200,
  LOGO_DONE: 800,
  GAUGE_START: 900,
  GAUGE_DURATION: 1000,
  SCORE_APPEAR: 1700,
  CHIP_APPEAR: 2000,
  SKIP_APPEAR: 2000,
  REASON_APPEAR: 2500,
  CTA_APPEAR: 3800,
  AUTO_NAV: 5000,
};

// ─── AnimatedCircle ──────────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Component ───────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const { user } = useApp();

  // Animation values
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const gaugeProgress = useRef(new Animated.Value(0)).current;
  const scoreOpacity = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0.6)).current;
  const chipOpacity = useRef(new Animated.Value(0)).current;
  const chipY = useRef(new Animated.Value(8)).current;
  const reasonOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaY = useRef(new Animated.Value(10)).current;
  const skipOpacity = useRef(new Animated.Value(0)).current;

  const [navigated, setNavigated] = useState(false);

  const doNavigate = useCallback(() => {
    if (navigated) return;
    setNavigated(true);
    router.replace("/(tabs)/ai-concierge");
  }, [navigated]);

  useEffect(() => {
    // Staggered animation sequence
    const seq = Animated.sequence([
      // BG + logo fade in
      Animated.delay(T.BG_FADE),
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(T.LOGO_FADE - T.BG_FADE),
          Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(logoScale, {
              toValue: 1,
              tension: 60,
              friction: 10,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
      // Gauge + score
      Animated.sequence([
        Animated.delay(T.GAUGE_START - T.LOGO_DONE),
        Animated.timing(gaugeProgress, {
          toValue: TARGET_FILL,
          duration: T.GAUGE_DURATION,
          easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
          useNativeDriver: false, // SVG props can't use native driver
        }),
      ]),
    ]);

    // Run score + chip + skip in parallel with gauge, keyed off absolute time
    const scoreTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scoreOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scoreScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, T.SCORE_APPEAR);

    const chipTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(chipOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(chipY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }, T.CHIP_APPEAR);

    const skipTimer = setTimeout(() => {
      Animated.timing(skipOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, T.SKIP_APPEAR);

    const reasonTimer = setTimeout(() => {
      Animated.timing(reasonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, T.REASON_APPEAR);

    const ctaTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ctaY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, T.CTA_APPEAR);

    const navTimer = setTimeout(doNavigate, T.AUTO_NAV);

    seq.start();

    return () => {
      seq.stop();
      clearTimeout(scoreTimer);
      clearTimeout(chipTimer);
      clearTimeout(skipTimer);
      clearTimeout(reasonTimer);
      clearTimeout(ctaTimer);
      clearTimeout(navTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Interpolate gauge progress to strokeDashoffset
  const strokeDashoffset = gaugeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [GAUGE_CIRCUM, GAUGE_CIRCUM - GAUGE_CIRCUM * TARGET_FILL],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />

      {/* Background gradient */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={[BG_DARK, "#0D1525", BG_DARK]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Radial-ish glow at center */}
        <LinearGradient
          colors={["rgba(201,168,76,0.06)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Skip button */}
      <Animated.View style={[styles.skipWrap, { opacity: skipOpacity }]}>
        <Pressable
          onPress={doNavigate}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Skip intro"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip</Text>
          <Text style={styles.skipChevron}>›</Text>
        </Pressable>
      </Animated.View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
            marginBottom: 32,
          }}
        >
          <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
        </Animated.View>

        {/* Gauge card */}
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.cardHeader}>Eligibility Analysis Engine</Text>
          <View style={styles.goldRule} />

          {/* SVG Gauge */}
          <View style={styles.gaugeWrap}>
            <Svg width={GAUGE_R * 2 + GAUGE_STROKE * 2} height={GAUGE_R * 2 + GAUGE_STROKE * 2}>
              {/* Track */}
              <Circle
                cx={GAUGE_R + GAUGE_STROKE}
                cy={GAUGE_R + GAUGE_STROKE}
                r={GAUGE_R}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={GAUGE_STROKE}
                fill="none"
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <AnimatedCircle
                cx={GAUGE_R + GAUGE_STROKE}
                cy={GAUGE_R + GAUGE_STROKE}
                r={GAUGE_R}
                stroke={GREEN}
                strokeWidth={GAUGE_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={GAUGE_CIRCUM}
                strokeDashoffset={strokeDashoffset}
                rotation="-90"
                origin={`${GAUGE_R + GAUGE_STROKE}, ${GAUGE_R + GAUGE_STROKE}`}
              />
            </Svg>

            {/* Score number */}
            <Animated.View
              style={[
                styles.scoreOverlay,
                { opacity: scoreOpacity, transform: [{ scale: scoreScale }] },
              ]}
            >
              <Text style={styles.scoreNumber}>82</Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </Animated.View>
          </View>

          {/* Recommendation chip */}
          <Animated.View
            style={[
              styles.chipWrap,
              { opacity: chipOpacity, transform: [{ translateY: chipY }] },
            ]}
          >
            <View style={styles.chip}>
              <View style={styles.chipDot} />
              <Text style={styles.chipText}>Recommended: Mortgage</Text>
            </View>
          </Animated.View>

          {/* Reasoning */}
          <Animated.Text style={[styles.reasonText, { opacity: reasonOpacity }]}>
            Strong repayment profile — 27% DTI ratio
          </Animated.Text>
        </View>

        {/* CTA */}
        <Animated.View
          style={[
            styles.ctaWrap,
            { opacity: ctaOpacity, transform: [{ translateY: ctaY }] },
          ]}
        >
          <Text style={styles.ctaText}>Download the Rkz app now</Text>
          <View style={styles.ctaLine} />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
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
  skipText: {
    color: "rgba(245,240,232,0.65)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  skipChevron: {
    color: GOLD,
    fontSize: 16,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${GOLD}28`,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 8,
  },
  cardHeader: {
    color: GOLD,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 10,
  },
  goldRule: {
    width: 36,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.5,
    marginBottom: 24,
  },
  gaugeWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  scoreOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    color: TEXT_PRIMARY,
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    lineHeight: 56,
    letterSpacing: -1,
  },
  scoreLabel: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  chipWrap: {
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${GREEN}18`,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: `${GREEN}40`,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  chipText: {
    color: GREEN,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  reasonText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  ctaWrap: {
    marginTop: 28,
    alignItems: "center",
    gap: 10,
  },
  ctaText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  ctaLine: {
    width: 32,
    height: 1.5,
    backgroundColor: GOLD,
    borderRadius: 1,
  },
});
