import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
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

import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

// ── API base URL ──────────────────────────────────────────────────────────────
function getApiBase(): string {
  if (Platform.OS === "web") return "/api";
  return "https://property-dashboard-nofabark.replit.app/api";
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  eligibility_score: number;
  recommended_payment_method: string;
  reasoning_summary: string;
}

type BuyerStep  = "form" | "result";
type Portal     = "buyer" | "seller";
type SellerStep = "form" | "sent";
type SellerPay  = "cash" | "financing" | "both";

// ── Score utilities ───────────────────────────────────────────────────────────
function scoreColor(score: number, _colors: ReturnType<typeof useColors>): string {
  if (score >= 75) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  if (score >= 25) return "#F97316";
  return "#EF4444";
}

function scoreLabel(
  score: number,
  t: { excellent: string; good: string; moderate: string; low: string }
): string {
  if (score >= 75) return t.excellent;
  if (score >= 50) return t.good;
  if (score >= 25) return t.moderate;
  return t.low;
}

function paymentLabel(
  method: string,
  t: { cash: string; mortgage: string; installment: string; leaseToOwn: string }
): string {
  switch (method) {
    case "cash":          return t.cash;
    case "mortgage":      return t.mortgage;
    case "installment":   return t.installment;
    case "lease_to_own":  return t.leaseToOwn;
    default:              return method;
  }
}

function paymentIcon(method: string): keyof typeof MaterialIcons.glyphMap {
  switch (method) {
    case "cash":          return "payments";
    case "mortgage":      return "account-balance";
    case "installment":   return "calendar-today";
    case "lease_to_own":  return "home";
    default:              return "payments";
  }
}

// ── Animated Score Gauge ──────────────────────────────────────────────────────
function ScoreGauge({ score, color }: { score: number; color: string }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  React.useEffect(() => {
    const numAnim = new Animated.Value(0);
    const listener = numAnim.addListener(({ value }) => {
      setDisplayed(Math.round(value));
    });
    Animated.parallel([
      Animated.timing(progressAnim, { toValue: score / 100, duration: 1100, useNativeDriver: false }),
      Animated.timing(numAnim,      { toValue: score,       duration: 1100, useNativeDriver: false }),
    ]).start(() => { numAnim.removeListener(listener); });
    return () => numAnim.removeListener(listener);
  }, [score]);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Text style={{ fontSize: 56, fontFamily: "Inter_700Bold", color, letterSpacing: -2 }}>{displayed}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color, opacity: 0.8, marginTop: -4, marginBottom: 12 }}>/ 100</Text>
      <View style={{ width: "100%", height: 10, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
        <Animated.View style={{ height: "100%", borderRadius: 10, backgroundColor: color, width: barWidth }} />
      </View>
    </View>
  );
}

// ── Selector Pill Row ─────────────────────────────────────────────────────────
function PillSelector({
  options, value, onChange, colors, gold,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  gold: string;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => { void Haptics.selectionAsync(); onChange(opt.key); }}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: active ? gold : colors.card,
              borderWidth: 1.5,
              borderColor: active ? gold : colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#0A1628" : colors.mutedForeground }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Portal Tab Bar (Buyer / Seller) ───────────────────────────────────────────
function PortalTabBar({
  portal, setPortal, gold, colors, isAr,
}: {
  portal: Portal;
  setPortal: (p: Portal) => void;
  gold: string;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
}) {
  const tabs: { key: Portal; labelAr: string; labelEn: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: "buyer",  labelAr: "مشتري",  labelEn: "Buyer",  icon: "search" },
    { key: "seller", labelAr: "بائع",   labelEn: "Seller", icon: "sell"   },
  ];
  const ordered = isAr ? [...tabs].reverse() : tabs;

  return (
    <View style={{
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.06)",
      marginHorizontal: 20,
      marginTop: 14,
      borderRadius: 14,
      padding: 4,
      gap: 4,
    }}>
      {ordered.map((tab) => {
        const active = portal === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => { void Haptics.selectionAsync(); setPortal(tab.key); }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 10,
              borderRadius: 11,
              backgroundColor: active ? gold : "transparent",
            }}
          >
            <MaterialIcons name={tab.icon} size={16} color={active ? "#0A1628" : "rgba(255,255,255,0.5)"} />
            <Text style={{
              fontSize: 14, fontFamily: "Inter_700Bold",
              color: active ? "#0A1628" : "rgba(255,255,255,0.5)",
            }}>
              {isAr ? tab.labelAr : tab.labelEn}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Seller Portal ─────────────────────────────────────────────────────────────
function SellerPortal({
  colors, gold, isAr, bottomPad,
}: {
  colors: ReturnType<typeof useColors>;
  gold: string;
  isAr: boolean;
  bottomPad: number;
}) {
  const [sellerStep,    setSellerStep]    = useState<SellerStep>("form");
  const [propType,      setPropType]      = useState("apartment");
  const [city,          setCity]          = useState("");
  const [price,         setPrice]         = useState("");
  const [payPref,       setPayPref]       = useState<SellerPay>("both");
  const [notes,         setNotes]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  const propTypeOptions = [
    { key: "apartment", label: isAr ? "شقة"       : "Apartment" },
    { key: "villa",     label: isAr ? "فيلا"      : "Villa"     },
    { key: "land",      label: isAr ? "أرض"       : "Land"      },
    { key: "commercial",label: isAr ? "تجاري"     : "Commercial"},
  ];

  const payOptions: { key: SellerPay; labelAr: string; labelEn: string; color: string }[] = [
    { key: "cash",      labelAr: "كاش فقط",        labelEn: "Cash only",       color: "#22C55E" },
    { key: "financing", labelAr: "تمويل عقاري",    labelEn: "Financing",       color: "#2563EB" },
    { key: "both",      labelAr: "كلاهما",          labelEn: "Both",            color: gold      },
  ];

  async function handleSubmit() {
    if (!price || parseFloat(price.replace(/,/g, "")) <= 0) {
      setErrorMsg(isAr ? "الرجاء إدخال السعر المطلوب" : "Please enter the asking price");
      return;
    }
    setErrorMsg(null);
    Keyboard.dismiss();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const request = {
        id:          Date.now().toString(),
        type:        "seller_negotiation",
        propType,
        city:        city.trim(),
        price:       parseFloat(price.replace(/,/g, "")),
        payPref,
        notes:       notes.trim(),
        submittedAt: new Date().toISOString(),
      };
      const existing = await AsyncStorage.getItem("rkz_negotiation_requests");
      const list     = existing ? (JSON.parse(existing) as unknown[]) : [];
      list.unshift(request);
      await AsyncStorage.setItem("rkz_negotiation_requests", JSON.stringify(list));
      await new Promise((r) => setTimeout(r, 800));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSellerStep("sent");
    } catch {
      setErrorMsg(isAr ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSellerStep("form");
    setPrice(""); setCity(""); setNotes(""); setPayPref("both");
    void Haptics.selectionAsync();
  }

  const S = StyleSheet.create({
    section:      { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, textAlign: isAr ? "right" : "left" },
    card:         { backgroundColor: colors.card, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 12 },
    label:        { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8, textAlign: isAr ? "right" : "left" },
    input: {
      height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular",
      color: colors.foreground, backgroundColor: colors.background,
      textAlign: isAr ? "right" : "left",
    },
    notesInput: {
      height: 88, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, fontFamily: "Inter_400Regular",
      color: colors.foreground, backgroundColor: colors.background,
      textAlign: isAr ? "right" : "left",
      textAlignVertical: "top",
    },
    payPill: {
      flex: 1, paddingVertical: 12, borderRadius: 12,
      alignItems: "center", justifyContent: "center", borderWidth: 1.5,
    },
    payPillLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
    submitBtn: {
      marginHorizontal: 16, marginTop: 8, height: 56, borderRadius: 16,
      backgroundColor: gold, alignItems: "center", justifyContent: "center",
      flexDirection: "row", gap: 8,
      shadowColor: gold, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
    },
    submitBtnText:  { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A1628" },
    errorText:      { color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginHorizontal: 16, marginTop: 8 },
    successCard: {
      backgroundColor: colors.navy, borderRadius: 24, padding: 36, marginHorizontal: 16, marginTop: 32,
      alignItems: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 20, elevation: 6,
    },
    successIcon: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: `${gold}22`, alignItems: "center", justifyContent: "center", marginBottom: 20,
    },
    successTitle:   { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center", marginBottom: 10 },
    successSub:     { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 22, marginBottom: 24 },
    successDetail: {
      width: "100%", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 14,
      flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 24,
    },
    successDetailText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", flex: 1 },
    newReqBtn: {
      height: 50, borderRadius: 13, borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.2)", paddingHorizontal: 28,
      alignItems: "center", justifyContent: "center",
    },
    newReqText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)" },
  });

  // ── Success state ─────────────────────────────────────────────────────────
  if (sellerStep === "sent") {
    const payLabel = payOptions.find((p) => p.key === payPref);
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <View style={S.successCard}>
          <View style={S.successIcon}>
            <MaterialIcons name="check-circle" size={40} color={gold} />
          </View>
          <Text style={S.successTitle}>
            {isAr ? "تم إرسال طلبك بنجاح" : "Request Sent Successfully"}
          </Text>
          <Text style={S.successSub}>
            {isAr
              ? "سيتواصل معك مفاوضنا خلال 24 ساعة لمناقشة التفاصيل وأفضل عروض السوق"
              : "Our negotiator will contact you within 24 hours to discuss details and the best market offers"}
          </Text>
          <View style={S.successDetail}>
            <MaterialIcons name="payments" size={18} color={gold} />
            <Text style={S.successDetailText}>
              {isAr
                ? `تفضيل الدفع: ${payLabel?.labelAr ?? payPref}`
                : `Payment preference: ${payLabel?.labelEn ?? payPref}`}
            </Text>
          </View>
          <View style={[S.successDetail, { marginBottom: 0 }]}>
            <MaterialIcons name="support-agent" size={18} color={gold} />
            <Text style={S.successDetailText}>
              {isAr
                ? "تمت إحالة طلبك إلى فريق التفاوض اليدوي"
                : "Your request has been routed to the manual negotiation team"}
            </Text>
          </View>
          <View style={{ height: 24 }} />
          <Pressable style={S.newReqBtn} onPress={handleReset}>
            <Text style={S.newReqText}>
              {isAr ? "طلب جديد" : "New Request"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Seller form ───────────────────────────────────────────────────────────
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Property details */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>{isAr ? "بيانات العقار" : "Property Details"}</Text>
        <View style={S.card}>
          <Text style={S.label}>{isAr ? "نوع العقار" : "Property Type"}</Text>
          <PillSelector
            options={propTypeOptions}
            value={propType}
            onChange={setPropType}
            colors={colors}
            gold={gold}
          />
          <Text style={[S.label, { marginTop: 16 }]}>{isAr ? "المدينة / الحي" : "City / District"}</Text>
          <TextInput
            style={S.input}
            value={city}
            onChangeText={setCity}
            placeholder={isAr ? "مثال: الرياض، العليا" : "e.g. Riyadh, Al Olaya"}
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
          <Text style={[S.label, { marginTop: 16 }]}>{isAr ? "السعر المطلوب (ريال) *" : "Asking Price (SAR) *"}</Text>
          <TextInput
            style={S.input}
            value={price}
            onChangeText={setPrice}
            placeholder={isAr ? "مثال: 1,500,000" : "e.g. 1,500,000"}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Payment preference — mirrors map filter logic */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>{isAr ? "تفضيل طريقة الدفع" : "Payment Preference"}</Text>
        <View style={{ flexDirection: isAr ? "row-reverse" : "row", gap: 8 }}>
          {payOptions.map((opt) => {
            const active = payPref === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[
                  S.payPill,
                  {
                    backgroundColor: active ? opt.color + "20" : colors.card,
                    borderColor:     active ? opt.color : colors.border,
                  },
                ]}
                onPress={() => { void Haptics.selectionAsync(); setPayPref(opt.key); }}
              >
                <Text style={[S.payPillLabel, { color: active ? opt.color : colors.mutedForeground }]}>
                  {isAr ? opt.labelAr : opt.labelEn}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 8, textAlign: isAr ? "right" : "left" }}>
          {isAr
            ? "يساعدنا تفضيلك في تحديد المشترين المناسبين وخيارات التفاوض"
            : "Your preference helps us identify suitable buyers and negotiation options"}
        </Text>
      </View>

      {/* Optional notes */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>{isAr ? "ملاحظات إضافية (اختياري)" : "Additional Notes (optional)"}</Text>
        <TextInput
          style={S.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={isAr ? "أي تفاصيل إضافية تود مشاركتها..." : "Any additional details you'd like to share..."}
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
          returnKeyType="done"
        />
      </View>

      {errorMsg && <Text style={S.errorText}>{errorMsg}</Text>}

      <Pressable
        style={({ pressed }) => [S.submitBtn, { marginTop: 20, opacity: pressed || loading ? 0.85 : 1 }]}
        onPress={() => { void handleSubmit(); }}
        disabled={loading}
      >
        {loading ? (
          <>
            <MaterialIcons name="hourglass-empty" size={20} color="#0A1628" />
            <Text style={S.submitBtnText}>{isAr ? "جارٍ الإرسال..." : "Sending..."}</Text>
          </>
        ) : (
          <>
            <MaterialIcons name="send" size={20} color="#0A1628" />
            <Text style={S.submitBtnText}>{isAr ? "إرسال للتفاوض" : "Send for Negotiation"}</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AIDecisionEngineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const at = t.analysis;

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16;

  // ── Portal selection ────────────────────────────────────────────────────────
  const [portal, setPortal] = useState<Portal>("buyer");

  // ── Buyer form state ────────────────────────────────────────────────────────
  const [income,      setIncome]      = useState("");
  const [budget,      setBudget]      = useState("");
  const [commitments, setCommitments] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [city,        setCity]        = useState("");
  const [paymentPref, setPaymentPref] = useState("mortgage");
  const [step,        setStep]        = useState<BuyerStep>("form");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<AnalysisResult | null>(null);
  const [killswitch,  setKillswitch]  = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  // ── Option lists (buyer) ────────────────────────────────────────────────────
  const propertyTypeOptions = [
    { key: "apartment",  label: t.propertyTypes.apartment  },
    { key: "villa",      label: t.propertyTypes.villa       },
    { key: "land",       label: t.propertyTypes.land        },
    { key: "commercial", label: t.propertyTypes.commercial  },
  ];

  // Payment options mirror the map's Cash / Financing filter
  const paymentOptions = [
    { key: "mortgage",     label: at.mortgage    },
    { key: "installment",  label: at.installment },
    { key: "cash",         label: at.cash        },
    { key: "lease_to_own", label: at.leaseToOwn  },
  ];

  // ── Buyer: Analyze ──────────────────────────────────────────────────────────
  async function handleAnalyze() {
    const inc = parseFloat(income.replace(/,/g, ""));
    const bud = parseFloat(budget.replace(/,/g, ""));
    if (!inc || !bud || inc <= 0 || bud <= 0) { setErrorMsg(at.required); return; }
    setErrorMsg(null);
    Keyboard.dismiss();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/rkz/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income: inc, budget: bud,
          existingCommitments: parseFloat(commitments.replace(/,/g, "")) || 0,
          propertyType, city: city.trim() || undefined,
          paymentPreference: paymentPref,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.killswitch) { setKillswitch(true); setStep("result"); return; }
      setResult(data as AnalysisResult);
      setKillswitch(false);
      setStep("result");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setErrorMsg(at.errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    void Haptics.selectionAsync();
    setStep("form"); setResult(null); setKillswitch(false); setErrorMsg(null);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const gold = colors.gold ?? "#C9A84C";

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 16,
      paddingBottom: 18,
      paddingHorizontal: 20,
    },
    headerRow: { flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 12 },
    headerIconBox: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: "rgba(201,168,76,0.18)",
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold", textAlign: isAr ? "right" : "left" },
    headerSub:   { color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: isAr ? "right" : "left" },
    stepBarRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      marginHorizontal: 20, marginTop: 14, marginBottom: 4, gap: 8,
    },
    stepPill: { flex: 1, height: 4, borderRadius: 2 },
    scroll:    { flex: 1 },
    section:   { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, textAlign: isAr ? "right" : "left" },
    card:      { backgroundColor: colors.card, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 12 },
    label:     { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8, textAlign: isAr ? "right" : "left" },
    input: {
      height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular",
      color: colors.foreground, backgroundColor: colors.background,
      textAlign: isAr ? "right" : "left",
    },
    analyzeBtn: {
      marginHorizontal: 16, marginTop: 8, height: 56, borderRadius: 16,
      backgroundColor: gold, alignItems: "center", justifyContent: "center",
      flexDirection: "row", gap: 8,
      shadowColor: gold, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
    },
    analyzeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A1628" },
    errorText:      { color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginHorizontal: 16, marginTop: 8 },
    gaugeCard: {
      backgroundColor: colors.navy, borderRadius: 20, padding: 28,
      alignItems: "center", marginHorizontal: 16, marginTop: 20,
      shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 16, elevation: 4,
    },
    gaugeLabel:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 },
    scoreBadge:    { marginTop: 16, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    scoreBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A1628" },
    paymentCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 20,
      marginHorizontal: 16, marginTop: 12,
      flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 16,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    paymentIconBox:  { width: 48, height: 48, borderRadius: 24, backgroundColor: `${gold}22`, alignItems: "center", justifyContent: "center" },
    paymentTitle:    { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" },
    paymentValue:    { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: isAr ? "right" : "left", marginTop: 2 },
    reasoningCard:   { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginHorizontal: 16, marginTop: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    reasoningLabel:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: isAr ? "right" : "left" },
    reasoningText:   { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 24, textAlign: isAr ? "right" : "left" },
    actionRow:       { flexDirection: isAr ? "row-reverse" : "row", marginHorizontal: 16, marginTop: 16, gap: 12 },
    resetBtn:        { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    resetBtnText:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    contactBtn:      { flex: 1, height: 50, borderRadius: 14, backgroundColor: gold, alignItems: "center", justifyContent: "center" },
    contactBtnText:  { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A1628" },
    killswitchCard:  { backgroundColor: colors.card, borderRadius: 20, padding: 32, marginHorizontal: 16, marginTop: 32, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    killswitchIcon:  { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginBottom: 20 },
    killswitchTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center", marginBottom: 10 },
    killswitchMsg:   { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  });

  const sColor = result ? scoreColor(result.eligibility_score, colors) : gold;
  const sLabel  = result ? scoreLabel(result.eligibility_score, at) : "";

  return (
    <KeyboardAvoidingView
      style={S.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerRow}>
          <View style={S.headerIconBox}>
            <MaterialIcons name="query-stats" size={22} color={gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.headerTitle}>{at.title}</Text>
            <Text style={S.headerSub}>{at.subtitle}</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}
          >
            <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        {/* Buyer / Seller tab selector */}
        <PortalTabBar
          portal={portal}
          setPortal={(p) => { setPortal(p); handleReset(); }}
          gold={gold}
          colors={colors}
          isAr={isAr}
        />

        {/* Buyer-only step progress bar */}
        {portal === "buyer" && (
          <>
            <View style={S.stepBarRow}>
              <View style={[S.stepPill, { backgroundColor: gold }]} />
              <View style={[S.stepPill, { backgroundColor: step === "result" ? gold : "rgba(255,255,255,0.2)" }]} />
            </View>
            <View style={{ flexDirection: isAr ? "row-reverse" : "row", justifyContent: "space-between", paddingHorizontal: 2, marginTop: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: gold }}>{at.stepInput}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: step === "result" ? gold : "rgba(255,255,255,0.35)" }}>{at.stepResult}</Text>
            </View>
          </>
        )}
      </View>

      {/* ── Seller Portal ─────────────────────────────────────────────────── */}
      {portal === "seller" && (
        <SellerPortal colors={colors} gold={gold} isAr={isAr} bottomPad={bottomPad} />
      )}

      {/* ── Buyer Portal ──────────────────────────────────────────────────── */}
      {portal === "buyer" && (
        <ScrollView
          style={S.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── FORM STEP ─────────────────────────────────────────────────── */}
          {step === "form" && (
            <>
              <View style={S.section}>
                <Text style={S.sectionTitle}>{at.stepInput}</Text>
                <View style={S.card}>
                  <Text style={S.label}>{at.income} *</Text>
                  <TextInput
                    style={S.input} value={income} onChangeText={setIncome}
                    placeholder={at.incomePlaceholder} placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric" returnKeyType="next"
                  />
                  <Text style={[S.label, { marginTop: 16 }]}>{at.budget} *</Text>
                  <TextInput
                    style={S.input} value={budget} onChangeText={setBudget}
                    placeholder={at.budgetPlaceholder} placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric" returnKeyType="next"
                  />
                  <Text style={[S.label, { marginTop: 16 }]}>{at.commitments}</Text>
                  <TextInput
                    style={S.input} value={commitments} onChangeText={setCommitments}
                    placeholder={at.commitmentsPlaceholder} placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric" returnKeyType="done"
                  />
                </View>
              </View>

              <View style={S.section}>
                <Text style={S.label}>{at.propertyType}</Text>
                <PillSelector options={propertyTypeOptions} value={propertyType} onChange={setPropertyType} colors={colors} gold={gold} />
              </View>

              {/* Payment preference — same Cash/Financing axis as the map */}
              <View style={S.section}>
                <Text style={S.label}>{at.paymentPref}</Text>
                <PillSelector options={paymentOptions} value={paymentPref} onChange={setPaymentPref} colors={colors} gold={gold} />
              </View>

              <View style={S.section}>
                <Text style={S.label}>{at.city}</Text>
                <TextInput
                  style={S.input} value={city} onChangeText={setCity}
                  placeholder={at.cityPlaceholder} placeholderTextColor={colors.mutedForeground}
                  returnKeyType="done"
                />
              </View>

              {errorMsg && <Text style={S.errorText}>{errorMsg}</Text>}

              <Pressable
                style={({ pressed }) => [S.analyzeBtn, { marginTop: 20, opacity: pressed || loading ? 0.85 : 1 }]}
                onPress={() => { void handleAnalyze(); }}
                disabled={loading}
              >
                {loading ? (
                  <><MaterialIcons name="hourglass-empty" size={20} color="#0A1628" /><Text style={S.analyzeBtnText}>{at.analyzing}</Text></>
                ) : (
                  <><MaterialIcons name="query-stats" size={20} color="#0A1628" /><Text style={S.analyzeBtnText}>{at.analyzeBtn}</Text></>
                )}
              </Pressable>
            </>
          )}

          {/* ── RESULT STEP: killswitch ────────────────────────────────────── */}
          {step === "result" && killswitch && (
            <View style={S.killswitchCard}>
              <View style={S.killswitchIcon}>
                <MaterialIcons name="pause-circle-outline" size={36} color="#EF4444" />
              </View>
              <Text style={S.killswitchTitle}>{at.killswitchTitle}</Text>
              <Text style={S.killswitchMsg}>{at.killswitchMsg}</Text>
              <Pressable style={[S.contactBtn, { width: "100%", height: 52, borderRadius: 14 }]}>
                <Text style={S.contactBtnText}>{at.contactAdvisor}</Text>
              </Pressable>
              <Pressable onPress={handleReset} style={{ marginTop: 16 }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>← {at.resetBtn}</Text>
              </Pressable>
            </View>
          )}

          {/* ── RESULT STEP: score ────────────────────────────────────────── */}
          {step === "result" && !killswitch && result && (
            <>
              <View style={S.gaugeCard}>
                <Text style={S.gaugeLabel}>{at.eligibilityScore}</Text>
                <ScoreGauge score={result.eligibility_score} color={sColor} />
                <View style={[S.scoreBadge, { backgroundColor: sColor, marginTop: 16 }]}>
                  <Text style={S.scoreBadgeText}>{sLabel}</Text>
                </View>
              </View>

              <View style={S.paymentCard}>
                <View style={S.paymentIconBox}>
                  <MaterialIcons name={paymentIcon(result.recommended_payment_method)} size={24} color={gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.paymentTitle}>{at.paymentMethod}</Text>
                  <Text style={S.paymentValue}>{paymentLabel(result.recommended_payment_method, at)}</Text>
                </View>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: `${gold}22` }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: gold }}>✓</Text>
                </View>
              </View>

              {result.reasoning_summary.length > 0 && (
                <View style={S.reasoningCard}>
                  <Text style={S.reasoningLabel}>{at.reasoning}</Text>
                  <Text style={S.reasoningText}>{result.reasoning_summary}</Text>
                </View>
              )}

              <View style={S.actionRow}>
                <Pressable style={S.resetBtn} onPress={handleReset}>
                  <Text style={S.resetBtnText}>{at.resetBtn}</Text>
                </Pressable>
                <Pressable style={S.contactBtn}>
                  <Text style={S.contactBtnText}>{at.contactAdvisor}</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
