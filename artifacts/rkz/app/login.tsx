import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

type Step = "phone" | "otp";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser } = useApp();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("أدخل رقم جوال صحيح");
      shake();
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
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
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "") && next.join("").length === 6) {
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
    if (code.length < 6) {
      setError("أدخل الرمز المكون من 6 أرقام");
      shake();
      return;
    }
    setError("");
    setLoading(true);
    Keyboard.dismiss();
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUser({ phone, authorized: true });
    router.replace("/(tabs)");
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy,
    },
    inner: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
      paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
      justifyContent: "space-between",
    },
    top: {
      alignItems: "center",
      marginTop: 32,
    },
    logoBox: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    brandName: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      letterSpacing: 2,
    },
    tagline: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.55)",
      marginTop: 6,
      textAlign: "center",
    },
    form: {
      flex: 1,
      justifyContent: "center",
      gap: 16,
    },
    label: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.65)",
      marginBottom: 6,
    },
    phoneRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
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
    prefixText: {
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
    },
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
    btnDisabled: {
      opacity: 0.5,
    },
    btnText: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.navy,
    },
    errorText: {
      color: "#FC8181",
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      textAlign: "center",
    },
    otpRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
    },
    otpCell: {
      width: (width - 56 - 50) / 6,
      height: 58,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    otpCellFilled: {
      borderColor: colors.gold,
      backgroundColor: "rgba(212,168,67,0.15)",
    },
    otpInput: {
      position: "absolute",
      opacity: 0,
      width: "100%",
      height: "100%",
    },
    otpDigit: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginBottom: 32,
    },
    backText: {
      color: "rgba(255,255,255,0.55)",
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
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
    platformDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FFFFFF",
    },
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <View style={styles.logoBox}>
            <MaterialIcons name="home-work" size={32} color={colors.navy} />
          </View>
          <Text style={styles.brandName}>RKZ</Text>
          <Text style={styles.tagline}>محرك النشر العقاري الفوري</Text>
        </View>

        <View style={styles.form}>
          {step === "phone" ? (
            <>
              <Text style={styles.label}>رقم الجوال</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>+966</Text>
                </View>
                <TextInput
                  style={styles.inputBox}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setError(""); }}
                  placeholder="5X XXX XXXX"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="phone-pad"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  textAlign="left"
                />
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                style={({ pressed }) => [styles.btn, (!phone || loading) && styles.btnDisabled, pressed && { opacity: 0.85 }]}
                onPress={handleSendOtp}
                disabled={!phone || loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <Text style={styles.btnText}>إرسال رمز التحقق</Text>
                )}
              </Pressable>
              <Text style={styles.hint}>سيُرسَل رمز OTP مكون من 6 أرقام إلى جوالك</Text>
            </>
          ) : (
            <>
              <Pressable style={styles.backBtn} onPress={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }}>
                <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.55)" />
                <Text style={styles.backText}>تغيير الرقم</Text>
              </Pressable>

              <Text style={[styles.label, { textAlign: "center" }]}>
                أدخل الرمز المرسل إلى {"\u202A+966 " + phone + "\u202C"}
              </Text>

              <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                {otp.map((digit, i) => (
                  <View key={i} style={[styles.otpCell, digit ? styles.otpCellFilled : null]}>
                    <Text style={styles.otpDigit}>{digit || ""}</Text>
                    <TextInput
                      ref={(r) => { otpRefs.current[i] = r; }}
                      style={styles.otpInput}
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

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              {loading && (
                <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />
              )}

              <Text style={[styles.hint, { marginTop: 16 }]}>
                للتجربة: أي 6 أرقام
              </Text>
            </>
          )}
        </View>

        <View style={styles.platforms}>
          {["عقار", "بيوت", "وصلت", "PF"].map((p) => (
            <Text key={p} style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Inter_400Regular", fontSize: 11 }}>
              {p}
            </Text>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
