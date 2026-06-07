import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useConfig } from "@/context/DynamicConfig";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { setAuthToken } from "@/constants/api";

const RKAZ_LOGO = require("@/assets/images/rkaz-logo.png");

const { width, height } = Dimensions.get("window");

// Responsive breakpoint
const isSmallScreen = height < 700;
const isTinyScreen  = height < 600;

// Logo scales with screen width — 55% wide, aspect-ratio locked (≈2.6:1)
const LOGO_W = Math.min(width * 0.55, 240);
const LOGO_H = Math.round(LOGO_W / 2.6);

type Step = "welcome" | "phone" | "otp";

const FEATURE_ICONS: React.ComponentProps<typeof MaterialIcons>["name"][] = [
  "public",
  "people",
  "security",
  "bar-chart",
];

interface LoginResponse {
  token: string;
  user: { id: number; phone: string; name?: string; email?: string; authorized: boolean };
}

export default function LoginScreen() {
  if (__DEV__) return <Redirect href="/(tabs)" />;

  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { setUser } = useApp();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t, isAr } = useLocale();
  const { config } = useConfig();

  const dynTagline  = isAr ? config.content.welcomeTaglineAr  : config.content.welcomeTaglineEn;
  const dynHeadline = isAr ? config.content.welcomeHeadlineAr : config.content.welcomeHeadlineEn;
  const dynCta      = isAr ? config.content.welcomeCtaAr      : config.content.welcomeCtaEn;
  const dynFeatures = config.content.features?.length
    ? config.content.features.map((f) => ({
        title: isAr ? f.titleAr : f.titleEn,
        body:  isAr ? f.bodyAr  : f.bodyEn,
      }))
    : t.welcome.features;

  const [step,       setStep]       = useState<Step>("welcome");
  const [phone,      setPhone]      = useState("");
  const [email,      setEmail]      = useState("");
  const [otp,        setOtp]        = useState(["", "", "", ""]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [demoOtp,    setDemoOtp]    = useState<string | null>(null);

  const otpRefs  = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 9) { setError(t.login.errorPhone); shake(); return; }
    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !emailClean.includes("@") || !emailClean.includes(".")) {
      setError(t.login.emailRequired); shake(); return;
    }
    setError("");
    setLoading(true);
    setPendingKey(null);
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 300);
  }

  function handleOtpChange(value: string, index: number) {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) otpRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 4) handleVerifyOtp(next);
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  async function handleVerifyOtp(digits: string[]) {
    const code = digits.join("");
    if (code.length < 4) { setError(t.login.errorCode); shake(); return; }
    setError("");
    setLoading(true);
    Keyboard.dismiss();
    const fullPhone = phone.startsWith("+") ? phone : `+966${phone}`;
    setUser({ phone: fullPhone, email: email.trim() || undefined, authorized: true });
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace("/welcome" as any);
  }

  // ── Spacing tokens (responsive) ──────────────────────────────────────────
  const safeTop    = insets.top + (Platform.OS === "web" ? 67 : 0);
  const safeBottom = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Header: exactly 25% of screen height, minus safe-area top
  const HEADER_H      = height * 0.25;
  const featureGap    = isSmallScreen ? 12 : 16;
  const headlineMB    = isSmallScreen ? 16 : 22;
  const featureIconSz = isTinyScreen  ? 36 : 40;
  const featureTitleSz = isTinyScreen ? 13 : 14;
  const featureBodySz  = isTinyScreen ? 12 : 13;

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy },

    // ── Welcome ─────────────────────────────────────────────────────────────
    welcomeScroll: { flex: 1 },

    // Header zone: fixed 25% of screen, centres logo vertically
    header: {
      height: HEADER_H,
      paddingTop: safeTop + 8,
      alignItems: "center",
      justifyContent: "center",
    },
    logoImage: {
      width:       LOGO_W,
      height:      LOGO_H,
      resizeMode:  "contain",
    },
    tagline: {
      fontSize:    12,
      fontFamily:  "Inter_400Regular",
      color:       "rgba(255,255,255,0.45)",
      textAlign:   "center",
      marginTop:   8,
      letterSpacing: 0.3,
    },

    // Thin divider line beneath header
    divider: {
      height:          1,
      backgroundColor: "rgba(255,255,255,0.08)",
      marginHorizontal: 28,
      marginBottom:    isSmallScreen ? 16 : 22,
    },

    // Content zone
    content: {
      paddingHorizontal: 28,
      paddingBottom:     safeBottom + 16,
    },
    headline: {
      fontSize:    isAr ? 18 : 16,
      fontFamily:  "Inter_700Bold",
      color:       colors.gold,
      textAlign:   "center",
      lineHeight:  isAr ? 28 : 24,
      marginBottom: headlineMB,
      paddingHorizontal: 4,
    },
    featureRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems:    "flex-start",
      gap:           12,
      marginBottom:  featureGap,
    },
    featureIcon: {
      width:           featureIconSz,
      height:          featureIconSz,
      borderRadius:    11,
      backgroundColor: colors.gold + "1A",
      alignItems:      "center",
      justifyContent:  "center",
      flexShrink:      0,
    },
    featureText: { flex: 1 },
    featureTitle: {
      fontSize:   featureTitleSz,
      fontFamily: "Inter_700Bold",
      color:      "#FFFFFF",
      marginBottom: 2,
      textAlign:  isAr ? "right" : "left",
    },
    featureBody: {
      fontSize:   featureBodySz,
      fontFamily: "Inter_400Regular",
      color:      "rgba(255,255,255,0.58)",
      lineHeight: featureBodySz + 6,
      textAlign:  isAr ? "right" : "left",
    },
    ctaBtn: {
      backgroundColor: colors.gold,
      borderRadius:    14,
      height:          54,
      alignItems:      "center",
      justifyContent:  "center",
      marginTop:       isSmallScreen ? 12 : 18,
      shadowColor:     colors.gold,
      shadowOpacity:   0.38,
      shadowRadius:    12,
      shadowOffset:    { width: 0, height: 4 },
      elevation:       6,
    },
    ctaBtnText: {
      fontSize:   17,
      fontFamily: "Inter_700Bold",
      color:      colors.navy,
    },
    platforms: {
      flexDirection:  "row",
      justifyContent: "center",
      gap:            16,
      marginTop:      12,
      opacity:        0.4,
    },

    // ── Phone / OTP ──────────────────────────────────────────────────────────
    innerScroll: {
      flexGrow:          1,
      paddingHorizontal: 28,
      paddingTop:        safeTop + (Platform.OS === "web" ? 20 : 16),
      paddingBottom:     safeBottom + 20,
    },
    top: { alignItems: "center", marginBottom: 28 },
    otpLogoImage: {
      width:      LOGO_W * 0.75,
      height:     LOGO_H * 0.75,
      resizeMode: "contain",
      marginBottom: 6,
    },
    otpTagline: {
      fontSize:   12,
      fontFamily: "Inter_400Regular",
      color:      "rgba(255,255,255,0.4)",
      textAlign:  "center",
    },
    form: { flex: 1, justifyContent: "center", gap: 16 },
    label: {
      fontSize:   13,
      fontFamily: "Inter_500Medium",
      color:      "rgba(255,255,255,0.65)",
      marginBottom: 6,
      textAlign:  isAr ? "right" : "left",
    },
    phoneRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    prefix: {
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius:    12,
      paddingHorizontal: 14,
      height:          56,
      justifyContent:  "center",
      alignItems:      "center",
      borderWidth:     1,
      borderColor:     "rgba(255,255,255,0.15)",
    },
    prefixText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
    inputBox: {
      flex:            1,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius:    12,
      paddingHorizontal: 16,
      height:          56,
      borderWidth:     1,
      borderColor:     "rgba(255,255,255,0.15)",
      color:           "#FFFFFF",
      fontFamily:      "Inter_500Medium",
      fontSize:        17,
    },
    emailBox: {
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius:    12,
      paddingHorizontal: 16,
      height:          56,
      borderWidth:     1,
      borderColor:     "rgba(255,255,255,0.15)",
      color:           "#FFFFFF",
      fontFamily:      "Inter_500Medium",
      fontSize:        17,
    },
    btn: {
      backgroundColor: colors.gold,
      borderRadius:    14,
      height:          56,
      alignItems:      "center",
      justifyContent:  "center",
      marginTop:       8,
    },
    btnDisabled: { opacity: 0.5 },
    btnText:     { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.navy },
    errorText: {
      color:      "#FC8181",
      fontFamily: "Inter_400Regular",
      fontSize:   13,
      textAlign:  "center",
    },
    otpRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
    otpCell: {
      width:           (width - 56 - 50) / 4,
      height:          58,
      borderRadius:    12,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth:     1.5,
      borderColor:     "rgba(255,255,255,0.15)",
      alignItems:      "center",
      justifyContent:  "center",
    },
    otpCellFilled: { borderColor: colors.gold, backgroundColor: "rgba(212,168,67,0.15)" },
    otpInput:      { position: "absolute", opacity: 0, width: "100%", height: "100%" },
    otpDigit:      { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    backBtn: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems:    "center",
      gap:           6,
      alignSelf:     isAr ? "flex-end" : "flex-start",
      marginBottom:  28,
    },
    backText: { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", fontSize: 14 },
    hint: {
      textAlign:  "center",
      color:      "rgba(255,255,255,0.4)",
      fontFamily: "Inter_400Regular",
      fontSize:   12,
      marginTop:  4,
    },
  });

  const platformNames = ["عقار", "بيوت", "وصلت", "PF"];

  // ── Welcome screen ──────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <View style={S.container}>
        {/* ── Fixed header: top 25% of screen ─────────────────────────── */}
        <View style={S.header}>
          <Image source={RKAZ_LOGO} style={S.logoImage} />
          <Text style={S.tagline}>{dynTagline}</Text>
        </View>

        {/* ── Subtle separator ─────────────────────────────────────────── */}
        <View style={S.divider} />

        {/* ── Scrollable content: headline + features + CTA ────────────── */}
        <ScrollView
          style={S.welcomeScroll}
          contentContainerStyle={S.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={S.headline}>{dynHeadline}</Text>

          {dynFeatures.map((f, i) => (
            <View key={i} style={S.featureRow}>
              <View style={S.featureIcon}>
                <MaterialIcons name={FEATURE_ICONS[i]} size={isSmallScreen ? 19 : 22} color={colors.gold} />
              </View>
              <View style={S.featureText}>
                <Text style={S.featureTitle}>{f.title}</Text>
                <Text style={S.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}

          <Pressable
            style={({ pressed }) => [S.ctaBtn, pressed && { opacity: 0.88 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setStep("phone");
            }}
          >
            <Text style={S.ctaBtnText}>{dynCta}</Text>
          </Pressable>

          <View style={S.platforms}>
            {platformNames.map((p) => (
              <Text key={p} style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Inter_400Regular", fontSize: 11 }}>
                {p}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Phone / OTP screens ─────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={S.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView
        contentContainerStyle={S.innerScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Logo header — slightly smaller on phone/OTP screens */}
        <View style={S.top}>
          <Image source={RKAZ_LOGO} style={S.otpLogoImage} />
          <Text style={S.otpTagline}>{dynTagline}</Text>
        </View>

        <View style={S.form}>
          {step === "phone" ? (
            <>
              <Text style={S.label}>{t.login.phoneLabel}</Text>
              <View style={S.phoneRow}>
                <View style={S.prefix}>
                  <Text style={S.prefixText}>+966</Text>
                </View>
                <TextInput
                  style={S.inputBox}
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setError(""); }}
                  placeholder={t.login.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="phone-pad"
                  autoFocus
                  returnKeyType="next"
                  textAlign="left"
                />
              </View>

              <Text style={[S.label, { marginTop: 16 }]}>{t.login.emailLabel}</Text>
              <TextInput
                style={S.emailBox}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                placeholder={t.login.emailPlaceholder}
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                multiline={false}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
                textAlign={isAr ? "right" : "left"}
              />

              {!!error && <Text style={S.errorText}>{error}</Text>}

              <Pressable
                style={({ pressed }) => [S.btn, (!phone || !email || loading) && S.btnDisabled, pressed && { opacity: 0.85 }]}
                onPress={handleSendOtp}
                disabled={!phone || !email || loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.navy} />
                  : <Text style={S.btnText}>{t.login.sendOtp}</Text>
                }
              </Pressable>
              <Text style={S.hint}>{t.login.hint}</Text>
            </>
          ) : (
            <>
              <Pressable
                style={S.backBtn}
                onPress={() => {
                  setStep("phone");
                  setOtp(["", "", "", ""]);
                  setError("");
                  setPendingKey(null);
                  setDemoOtp(null);
                }}
              >
                <Ionicons name={isAr ? "chevron-forward" : "chevron-back"} size={18} color="rgba(255,255,255,0.55)" />
                <Text style={S.backText}>{t.login.changePhone}</Text>
              </Pressable>

              <Text style={[S.label, { textAlign: "center" }]}>
                {t.login.codeLabel(email.trim())}
              </Text>

              <Animated.View style={[S.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                {otp.map((digit, i) => (
                  <View key={i} style={[S.otpCell, digit ? S.otpCellFilled : null]}>
                    <Text style={S.otpDigit}>{digit || ""}</Text>
                    <TextInput
                      ref={(r) => { otpRefs.current[i] = r; }}
                      style={S.otpInput}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  </View>
                ))}
              </Animated.View>

              {!!error && <Text style={S.errorText}>{error}</Text>}
              {loading && <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />}
              {demoOtp
                ? <Text style={[S.hint, { marginTop: 16, color: colors.gold }]}>{t.login.demoOtpHint(demoOtp)}</Text>
                : <Text style={[S.hint, { marginTop: 16 }]}>{t.login.demoHint}</Text>
              }
            </>
          )}
        </View>

        <View style={S.platforms}>
          {platformNames.map((p) => (
            <Text key={p} style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Inter_400Regular", fontSize: 11 }}>
              {p}
            </Text>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
