import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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

const { width } = Dimensions.get("window");

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
  // Dev mode: skip login entirely — go straight to the main app
  if (__DEV__) return <Redirect href="/(tabs)" />;

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser, refreshFromApi } = useApp();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t, isAr } = useLocale();
  const { config } = useConfig();
  const dynTagline = isAr ? config.content.welcomeTaglineAr : config.content.welcomeTaglineEn;
  const dynHeadline = isAr ? config.content.welcomeHeadlineAr : config.content.welcomeHeadlineEn;
  const dynCta = isAr ? config.content.welcomeCtaAr : config.content.welcomeCtaEn;
  const appName = config.branding.appName;
  const dynFeatures = config.content.features?.length
    ? config.content.features.map((f) => ({ title: isAr ? f.titleAr : f.titleEn, body: isAr ? f.bodyAr : f.bodyEn }))
    : t.welcome.features;

  const [step,       setStep]       = useState<Step>("welcome");
  const [phone,      setPhone]      = useState("");
  const [email,      setEmail]      = useState("");
  const [otp,        setOtp]        = useState(["", "", "", ""]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // Pending OTP session from backend
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [demoOtp,    setDemoOtp]    = useState<string | null>(null);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 9) {
      setError(t.login.errorPhone);
      shake();
      return;
    }
    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !emailClean.includes("@") || !emailClean.includes(".")) {
      setError(t.login.emailRequired);
      shake();
      return;
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
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) otpRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 4) {
      handleVerifyOtp(next);
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyOtp(digits: string[]) {
    const code = digits.join("");
    if (code.length < 4) {
      setError(t.login.errorCode);
      shake();
      return;
    }
    setError("");
    setLoading(true);
    Keyboard.dismiss();

    {
      const fullPhone = phone.startsWith("+") ? phone : `+966${phone}`;
      setUser({ phone: fullPhone, email: email.trim() || undefined, authorized: true });
    }

    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 20);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy },
    innerScroll: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: topPad,
      paddingBottom: bottomPad,
    },
    // ── Welcome ────────────────────────────────────────────────────────────
    welcomeScroll: { flex: 1 },
    logoBox: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginTop: 16,
      marginBottom: 12,
    },
    brandName: {
      fontSize: 34,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      letterSpacing: 2,
      textAlign: "center",
    },
    tagline: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.45)",
      textAlign: "center",
      marginBottom: 24,
      marginTop: 4,
    },
    headline: {
      fontSize: isAr ? 19 : 17,
      fontFamily: "Inter_700Bold",
      color: colors.gold,
      textAlign: "center",
      lineHeight: isAr ? 30 : 26,
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    featureRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "flex-start",
      gap: 14,
      marginBottom: 18,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.gold + "20",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    featureText: { flex: 1 },
    featureTitle: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      marginBottom: 3,
      textAlign: isAr ? "right" : "left",
    },
    featureBody: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.6)",
      lineHeight: 19,
      textAlign: isAr ? "right" : "left",
    },
    ctaBtn: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      marginBottom: 4,
      shadowColor: colors.gold,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    ctaBtnText: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.navy,
    },
    // ── Phone / OTP ─────────────────────────────────────────────────────────
    top: { alignItems: "center", marginTop: 32 },
    form: { flex: 1, justifyContent: "center", gap: 16 },
    label: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.65)",
      marginBottom: 6,
      textAlign: isAr ? "right" : "left",
    },
    phoneRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    prefix: {
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    prefixText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
    inputBox: {
      flex: 1,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
      color: "#FFFFFF",
      fontFamily: "Inter_500Medium",
      fontSize: 17,
    },
    btn: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.navy },
    errorText: {
      color: "#FC8181",
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      textAlign: "center",
    },
    otpRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
    otpCell: {
      width: (width - 56 - 50) / 4,
      height: 58,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    otpCellFilled: { borderColor: colors.gold, backgroundColor: "rgba(212,168,67,0.15)" },
    otpInput: { position: "absolute", opacity: 0, width: "100%", height: "100%" },
    otpDigit: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    backBtn: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      alignSelf: isAr ? "flex-end" : "flex-start",
      marginBottom: 32,
    },
    backText: { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", fontSize: 14 },
    hint: {
      textAlign: "center",
      color: "rgba(255,255,255,0.4)",
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      marginTop: 4,
    },
    platforms: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginTop: 8,
      opacity: 0.45,
    },
  });

  const platformNames = ["عقار", "بيوت", "وصلت", "PF"];

  // ── Welcome screen ─────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <View style={S.container}>
        <ScrollView
          style={S.welcomeScroll}
          contentContainerStyle={{ paddingHorizontal: 28, paddingTop: topPad, paddingBottom: bottomPad + 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={S.logoBox}>
            <MaterialIcons name="home-work" size={32} color={colors.navy} />
          </View>
          <Text style={S.brandName}>{appName}</Text>
          <Text style={S.tagline}>{dynTagline}</Text>

          <Text style={S.headline}>{dynHeadline}</Text>

          {dynFeatures.map((f, i) => (
            <View key={i} style={S.featureRow}>
              <View style={S.featureIcon}>
                <MaterialIcons name={FEATURE_ICONS[i]} size={22} color={colors.gold} />
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

  // ── Phone / OTP screens ────────────────────────────────────────────────
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
        <View style={S.top}>
          <View style={S.logoBox}>
            <MaterialIcons name="home-work" size={32} color={colors.navy} />
          </View>
          <Text style={S.brandName}>{appName}</Text>
          <Text style={S.tagline}>{dynTagline}</Text>
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
                style={S.inputBox}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                placeholder={t.login.emailPlaceholder}
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
                {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={S.btnText}>{t.login.sendOtp}</Text>}
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
