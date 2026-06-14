import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { useLocale } from "@/hooks/useLocale";

const LOGO = require("@/assets/images/rozoz-logo-eagle.png");
const { width } = Dimensions.get("window");

const NAVY   = "#0F2040";
const GOLD   = "#C9A84C";
const BLUE   = "#2563EB";
const TEAL   = "#0D9488";

type Step = "form" | "otp" | "role" | "success";
type RoleChoice = "buyer" | "seller" | "owner";

const ROLE_CARDS: Array<{
  key:   RoleChoice;
  ar:    string;
  en:    string;
  descAr: string;
  descEn: string;
  icon:  React.ComponentProps<typeof MaterialIcons>["name"];
  color: string;
  bg:    string;
}> = [
  {
    key:    "buyer",
    ar:     "مشتري",
    en:     "Buyer",
    descAr: "ابحث عن عقارك المثالي",
    descEn: "Find your ideal property",
    icon:   "search",
    color:  GOLD,
    bg:     GOLD + "22",
  },
  {
    key:    "seller",
    ar:     "بائع",
    en:     "Seller",
    descAr: "أعلن عن عقارك الآن",
    descEn: "List your property now",
    icon:   "add-home-work",
    color:  "#60A5FA",
    bg:     BLUE + "22",
  },
  {
    key:    "owner",
    ar:     "مالك عقار",
    en:     "Property Owner",
    descAr: "أدِر أملاكك وعقودك",
    descEn: "Manage your properties & leases",
    icon:   "apartment",
    color:  "#34D399",
    bg:     TEAL + "22",
  },
];

export default function RegisterModal() {
  const { registerModalVisible, hideRegister, setUser, setSelectedRole } = useApp();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingCb = (useApp() as any)._registerPendingCb as (() => void) | null;
  const { isAr } = useLocale();
  const insets = useSafeAreaInsets();

  const [step, setStep]       = useState<Step>("form");
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [role, setRole]       = useState<RoleChoice | null>(null);

  const otpRefs  = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  }

  function reset() {
    setStep("form");
    setName(""); setPhone(""); setEmail("");
    setOtp(["", "", "", ""]);
    setError(""); setLoading(false);
    setRole(null);
  }

  function handleClose() {
    reset();
    hideRegister();
  }

  async function handleSend() {
    const n = name.trim();
    const p = phone.replace(/\s/g, "");
    const e = email.trim().toLowerCase();
    if (n.length < 2) {
      setError(isAr ? "يرجى إدخال الاسم الكامل" : "Please enter your full name");
      shake(); return;
    }
    if (p.length < 9) {
      setError(isAr ? "رقم الجوال غير صحيح" : "Invalid mobile number");
      shake(); return;
    }
    if (!e.includes("@") || !e.includes(".")) {
      setError(isAr ? "البريد الإلكتروني غير صحيح" : "Invalid email address");
      shake(); return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
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
      void handleVerify(next);
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(digits: string[]) {
    const code = digits.join("");
    if (code.length < 4) { setError(isAr ? "أدخل الكود كاملاً" : "Enter the full code"); shake(); return; }
    setError("");
    setLoading(true);
    Keyboard.dismiss();
    await new Promise((r) => setTimeout(r, 800));
    const fullPhone = phone.startsWith("+") ? phone : `+966${phone}`;
    setUser({ phone: fullPhone, name: name.trim(), email: email.trim(), authorized: true });
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("role");
  }

  async function handleRoleSelect(r: RoleChoice) {
    setRole(r);
    Haptics.selectionAsync();
    setSelectedRole(r);
    await new Promise((x) => setTimeout(x, 220));
    setStep("success");
    setTimeout(() => {
      handleClose();
      if (pendingCb) pendingCb();
    }, 1500);
  }

  const safeTop    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const safeBottom = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const LOGO_W = Math.min(width * 0.42, 180);
  const LOGO_H = Math.round(LOGO_W / 2.6);

  return (
    <Modal
      visible={registerModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: safeTop + 12, paddingBottom: safeBottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header ── */}
          <View style={s.header}>
            <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
            <Pressable style={s.closeBtn} onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>

          {/* ── Success ── */}
          {step === "success" && (
            <View style={s.successBox}>
              <View style={s.successIcon}>
                <MaterialIcons name="check-circle" size={56} color={GOLD} />
              </View>
              <Text style={s.successTitle}>
                {isAr ? "تم التسجيل بنجاح! 🎉" : "Registered Successfully! 🎉"}
              </Text>
              <Text style={s.successSub}>
                {isAr ? `أهلاً بك ${name.trim()}` : `Welcome, ${name.trim()}`}
              </Text>
            </View>
          )}

          {/* ── Form Step ── */}
          {step === "form" && (
            <View style={s.body}>
              <Text style={s.title}>
                {isAr ? "سجّل حسابك" : "Create Your Account"}
              </Text>
              <Text style={s.subtitle}>
                {isAr
                  ? "للتواصل مع المالك أو نشر عقارك، يرجى التسجيل أولاً"
                  : "To contact owners or list your property, register first"}
              </Text>

              <Text style={s.label}>{isAr ? "الاسم الكامل" : "Full Name"}</Text>
              <TextInput
                style={[s.input, isAr && s.inputRtl]}
                value={name}
                onChangeText={(v) => { setName(v); setError(""); }}
                placeholder={isAr ? "محمد عبدالله الأحمد" : "John Smith"}
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="words"
                returnKeyType="next"
                textAlign={isAr ? "right" : "left"}
              />

              <Text style={[s.label, { marginTop: 14 }]}>{isAr ? "رقم الجوال" : "Mobile Number"}</Text>
              <View style={s.phoneRow}>
                <View style={s.prefix}>
                  <Text style={s.prefixText}>+966</Text>
                </View>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setError(""); }}
                  placeholder="5X XXX XXXX"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  textAlign="left"
                />
              </View>

              <Text style={[s.label, { marginTop: 14 }]}>{isAr ? "البريد الإلكتروني" : "Email Address"}</Text>
              <TextInput
                style={[s.input, isAr && s.inputRtl]}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSend}
                textAlign={isAr ? "right" : "left"}
              />

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <Pressable
                style={({ pressed }) => [
                  s.btn,
                  (!name || !phone || !email || loading) && s.btnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleSend}
                disabled={!name || !phone || !email || loading}
              >
                {loading
                  ? <ActivityIndicator color={NAVY} />
                  : <Text style={s.btnText}>{isAr ? "إرسال الكود" : "Send Code"}</Text>
                }
              </Pressable>

              <Text style={s.hint}>
                {isAr
                  ? "سيصلك كود التحقق عبر الرسائل أو الإيميل"
                  : "You'll receive a verification code via SMS or email"}
              </Text>
            </View>
          )}

          {/* ── OTP Step ── */}
          {step === "otp" && (
            <View style={s.body}>
              <Pressable
                style={[s.backBtn, isAr && { alignSelf: "flex-end" }]}
                onPress={() => { setStep("form"); setOtp(["", "", "", ""]); setError(""); }}
              >
                <Ionicons name={isAr ? "chevron-forward" : "chevron-back"} size={18} color="rgba(255,255,255,0.55)" />
                <Text style={s.backText}>{isAr ? "تغيير البيانات" : "Change details"}</Text>
              </Pressable>

              <Text style={s.title}>{isAr ? "أدخل كود التحقق" : "Enter Verification Code"}</Text>
              <Text style={[s.subtitle, { textAlign: "center" }]}>
                {isAr ? `تم إرسال الكود إلى ${email.trim()}` : `Code sent to ${email.trim()}`}
              </Text>

              <Animated.View style={[s.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                {otp.map((digit, i) => (
                  <View key={i} style={[s.otpCell, digit ? s.otpCellFilled : null]}>
                    <Text style={s.otpDigit}>{digit || ""}</Text>
                    <TextInput
                      ref={(r) => { otpRefs.current[i] = r; }}
                      style={s.otpHidden}
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

              {!!error && <Text style={s.errorText}>{error}</Text>}
              {loading && <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />}
              <Text style={s.hint}>{isAr ? "للتجربة: أدخل أي 4 أرقام" : "Demo: enter any 4 digits"}</Text>
            </View>
          )}

          {/* ── Role Selection Step ── */}
          {step === "role" && (
            <View style={s.body}>
              <Text style={s.title}>
                {isAr ? "كيف تريد الاستخدام؟" : "How will you use Rozoz?"}
              </Text>
              <Text style={s.subtitle}>
                {isAr
                  ? "اختر ما يناسبك — يمكن تغييره لاحقاً من الإعدادات"
                  : "Pick your role — you can change it later in settings"}
              </Text>

              <View style={[s.roleGrid, isAr && { direction: "rtl" } as object]}>
                {ROLE_CARDS.map((card) => (
                  <Pressable
                    key={card.key}
                    onPress={() => void handleRoleSelect(card.key)}
                    style={({ pressed }) => [
                      s.roleCard,
                      role === card.key && { borderColor: card.color, backgroundColor: card.bg },
                      pressed && s.roleCardPressed,
                    ]}
                  >
                    <View style={[s.roleIconWrap, { backgroundColor: card.bg }]}>
                      <MaterialIcons name={card.icon} size={32} color={card.color} />
                    </View>
                    <Text style={[s.roleCardTitle, { textAlign: "center" }]}>
                      {isAr ? card.ar : card.en}
                    </Text>
                    <Text style={[s.roleCardDesc, { textAlign: "center" }]}>
                      {isAr ? card.descAr : card.descEn}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[s.hint, { marginTop: 18 }]}>
                {isAr ? "يمكنك التنقل بين الأقسام في أي وقت" : "You can switch sections anytime"}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const CARD_W = (width - 52 - 14) / 2;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: NAVY },
  scroll: { flexGrow: 1, paddingHorizontal: 26 },

  header: { alignItems: "center", marginBottom: 28, position: "relative" },
  closeBtn: { position: "absolute", top: 0, right: 0, padding: 4 },

  body: { flex: 1 },

  title: {
    color:        "#FFFFFF",
    fontSize:     22,
    fontFamily:   "Inter_700Bold",
    textAlign:    "center",
    marginBottom: 8,
  },
  subtitle: {
    color:        "rgba(255,255,255,0.48)",
    fontSize:     13,
    fontFamily:   "Inter_400Regular",
    textAlign:    "center",
    lineHeight:   20,
    marginBottom: 28,
  },

  label: {
    color:        "rgba(255,255,255,0.65)",
    fontSize:     13,
    fontFamily:   "Inter_500Medium",
    marginBottom: 6,
  },
  input: {
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderRadius:      12,
    paddingHorizontal: 16,
    height:            54,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
    color:             "#FFFFFF",
    fontFamily:        "Inter_500Medium",
    fontSize:          16,
  },
  inputRtl: { textAlign: "right" },

  phoneRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  prefix: {
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderRadius:      12,
    paddingHorizontal: 14,
    height:            54,
    justifyContent:    "center",
    alignItems:        "center",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
  },
  prefixText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },

  btn: {
    backgroundColor: GOLD,
    borderRadius:    14,
    height:          54,
    alignItems:      "center",
    justifyContent:  "center",
    marginTop:       22,
    shadowColor:     GOLD,
    shadowOpacity:   0.35,
    shadowRadius:    10,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       5,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: NAVY },

  errorText: {
    color:      "#FC8181",
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    textAlign:  "center",
    marginTop:  10,
  },
  hint: {
    color:      "rgba(255,255,255,0.32)",
    fontFamily: "Inter_400Regular",
    fontSize:   12,
    textAlign:  "center",
    marginTop:  14,
  },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", fontSize: 14 },

  otpRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 8, marginBottom: 8 },
  otpCell: {
    width:           (width - 52 - 60) / 4,
    height:          60,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.15)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  otpCellFilled: { borderColor: GOLD, backgroundColor: "rgba(201,168,76,0.15)" },
  otpHidden:     { position: "absolute", opacity: 0, width: "100%", height: "100%" },
  otpDigit:      { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  roleGrid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            14,
    justifyContent: "center",
  },
  roleCard: {
    width:           CARD_W,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.12)",
    borderRadius:    20,
    alignItems:      "center",
    paddingVertical: 26,
    paddingHorizontal: 10,
    gap:             10,
  },
  roleCardPressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  roleIconWrap: {
    width:          68,
    height:         68,
    borderRadius:   18,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   4,
  },
  roleCardTitle: {
    color:      "#FFFFFF",
    fontSize:   16,
    fontFamily: "Inter_700Bold",
  },
  roleCardDesc: {
    color:      "rgba(255,255,255,0.5)",
    fontSize:   11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },

  successBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 16 },
  successIcon: {
    width:           90,
    height:          90,
    borderRadius:    24,
    backgroundColor: "rgba(201,168,76,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  successTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successSub:   { color: "rgba(255,255,255,0.5)", fontSize: 15, fontFamily: "Inter_400Regular" },
});
