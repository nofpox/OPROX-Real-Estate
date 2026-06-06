import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

type Step = "form" | "result";

// ── Score utilities ───────────────────────────────────────────────────────────
function scoreColor(score: number, colors: ReturnType<typeof useColors>): string {
  if (score >= 75) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  if (score >= 25) return "#F97316";
  return "#EF4444";
}

function scoreLabel(score: number, t: { excellent: string; good: string; moderate: string; low: string }): string {
  if (score >= 75) return t.excellent;
  if (score >= 50) return t.good;
  if (score >= 25) return t.moderate;
  return t.low;
}

// ── Payment method labels ─────────────────────────────────────────────────────
function paymentLabel(method: string, t: { cash: string; mortgage: string; installment: string; leaseToOwn: string }): string {
  switch (method) {
    case "cash": return t.cash;
    case "mortgage": return t.mortgage;
    case "installment": return t.installment;
    case "lease_to_own": return t.leaseToOwn;
    default: return method;
  }
}

function paymentIcon(method: string): keyof typeof MaterialIcons.glyphMap {
  switch (method) {
    case "cash": return "payments";
    case "mortgage": return "account-balance";
    case "installment": return "calendar-today";
    case "lease_to_own": return "home";
    default: return "payments";
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
      Animated.timing(progressAnim, {
        toValue: score / 100,
        duration: 1100,
        useNativeDriver: false,
      }),
      Animated.timing(numAnim, {
        toValue: score,
        duration: 1100,
        useNativeDriver: false,
      }),
    ]).start(() => {
      numAnim.removeListener(listener);
    });
    return () => numAnim.removeListener(listener);
  }, [score]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Text style={{ fontSize: 56, fontFamily: "Inter_700Bold", color, letterSpacing: -2 }}>
        {displayed}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color, opacity: 0.8, marginTop: -4, marginBottom: 12 }}>
        / 100
      </Text>
      <View style={{ width: "100%", height: 10, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
        <Animated.View
          style={{
            height: "100%",
            borderRadius: 10,
            backgroundColor: color,
            width: barWidth,
          }}
        />
      </View>
    </View>
  );
}

// ── Selector Pill Row ─────────────────────────────────────────────────────────
function PillSelector({
  options,
  value,
  onChange,
  colors,
  gold,
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
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: active ? gold : colors.card,
              borderWidth: 1.5,
              borderColor: active ? gold : colors.border,
            }}
          >
            <Text style={{
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: active ? "#0A1628" : colors.mutedForeground,
            }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AIDecisionEngineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const at = t.analysis;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");
  const [commitments, setCommitments] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [city, setCity] = useState("");
  const [paymentPref, setPaymentPref] = useState("mortgage");

  // ── Screen state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [killswitch, setKillswitch] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Option lists ───────────────────────────────────────────────────────────
  const propertyTypeOptions = [
    { key: "apartment", label: t.propertyTypes.apartment },
    { key: "villa", label: t.propertyTypes.villa },
    { key: "land", label: t.propertyTypes.land },
    { key: "commercial", label: t.propertyTypes.commercial },
  ];

  const paymentOptions = [
    { key: "mortgage", label: at.mortgage },
    { key: "installment", label: at.installment },
    { key: "cash", label: at.cash },
    { key: "lease_to_own", label: at.leaseToOwn },
  ];

  // ── Analyze ────────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    const inc = parseFloat(income.replace(/,/g, ""));
    const bud = parseFloat(budget.replace(/,/g, ""));

    if (!inc || !bud || inc <= 0 || bud <= 0) {
      setErrorMsg(at.required);
      return;
    }
    setErrorMsg(null);
    Keyboard.dismiss();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const res = await fetch(`${getApiBase()}/rkz/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income: inc,
          budget: bud,
          existingCommitments: parseFloat(commitments.replace(/,/g, "")) || 0,
          propertyType,
          city: city.trim() || undefined,
          paymentPreference: paymentPref,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.killswitch) {
        setKillswitch(true);
        setStep("result");
        return;
      }

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
    setStep("form");
    setResult(null);
    setKillswitch(false);
    setErrorMsg(null);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const gold = colors.gold ?? "#C9A84C";

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 16,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 12,
    },
    headerIconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(201,168,76,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      textAlign: isAr ? "right" : "left",
    },
    headerSub: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
      textAlign: isAr ? "right" : "left",
    },
    stepBar: {
      flexDirection: isAr ? "row-reverse" : "row",
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 4,
      gap: 8,
    },
    stepPill: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    scroll: { flex: 1 },
    section: { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      textAlign: isAr ? "right" : "left",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 12,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 8,
      textAlign: isAr ? "right" : "left",
    },
    input: {
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
      textAlign: isAr ? "right" : "left",
    },
    analyzeBtn: {
      marginHorizontal: 16,
      marginTop: 8,
      height: 56,
      borderRadius: 16,
      backgroundColor: gold,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      shadowColor: gold,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 4,
    },
    analyzeBtnText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: "#0A1628",
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      textAlign: "center",
      marginHorizontal: 16,
      marginTop: 8,
    },
    gaugeCard: {
      backgroundColor: colors.navy,
      borderRadius: 20,
      padding: 28,
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 20,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
    },
    gaugeLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "rgba(255,255,255,0.6)",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 16,
    },
    scoreBadge: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
    },
    scoreBadgeText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: "#0A1628",
    },
    paymentCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 12,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 16,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    paymentIconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${gold}22`,
      alignItems: "center",
      justifyContent: "center",
    },
    paymentTitle: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      textAlign: isAr ? "right" : "left",
    },
    paymentValue: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
      marginTop: 2,
    },
    reasoningCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 12,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    reasoningLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
      textAlign: isAr ? "right" : "left",
    },
    reasoningText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 24,
      textAlign: isAr ? "right" : "left",
    },
    actionRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      marginHorizontal: 16,
      marginTop: 16,
      gap: 12,
    },
    resetBtn: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    resetBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    contactBtn: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      backgroundColor: gold,
      alignItems: "center",
      justifyContent: "center",
    },
    contactBtnText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: "#0A1628",
    },
    killswitchCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 32,
      marginHorizontal: 16,
      marginTop: 32,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    killswitchIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    killswitchTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 10,
    },
    killswitchMsg: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
  });

  const sColor = result ? scoreColor(result.eligibility_score, colors) : gold;
  const sLabel = result ? scoreLabel(result.eligibility_score, at) : "";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <MaterialIcons name="query-stats" size={22} color={gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{at.title}</Text>
            <Text style={styles.headerSub}>{at.subtitle}</Text>
          </View>
        </View>

        {/* Step indicator */}
        <View style={styles.stepBar}>
          <View style={[styles.stepPill, { backgroundColor: gold }]} />
          <View style={[styles.stepPill, { backgroundColor: step === "result" ? gold : "rgba(255,255,255,0.2)" }]} />
        </View>
        <View style={{ flexDirection: isAr ? "row-reverse" : "row", justifyContent: "space-between", paddingHorizontal: 2, marginTop: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: gold }}>{at.stepInput}</Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: step === "result" ? gold : "rgba(255,255,255,0.35)" }}>{at.stepResult}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── FORM STEP ─────────────────────────────────────────────────────── */}
        {step === "form" && (
          <>
            {/* Financial inputs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{at.stepInput}</Text>

              <View style={styles.card}>
                <Text style={styles.label}>{at.income} *</Text>
                <TextInput
                  style={styles.input}
                  value={income}
                  onChangeText={setIncome}
                  placeholder={at.incomePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  returnKeyType="next"
                />

                <Text style={[styles.label, { marginTop: 16 }]}>{at.budget} *</Text>
                <TextInput
                  style={styles.input}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder={at.budgetPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  returnKeyType="next"
                />

                <Text style={[styles.label, { marginTop: 16 }]}>{at.commitments}</Text>
                <TextInput
                  style={styles.input}
                  value={commitments}
                  onChangeText={setCommitments}
                  placeholder={at.commitmentsPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Property type */}
            <View style={styles.section}>
              <Text style={styles.label}>{at.propertyType}</Text>
              <PillSelector
                options={propertyTypeOptions}
                value={propertyType}
                onChange={setPropertyType}
                colors={colors}
                gold={gold}
              />
            </View>

            {/* Payment preference */}
            <View style={styles.section}>
              <Text style={styles.label}>{at.paymentPref}</Text>
              <PillSelector
                options={paymentOptions}
                value={paymentPref}
                onChange={setPaymentPref}
                colors={colors}
                gold={gold}
              />
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.label}>{at.city}</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder={at.cityPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
              />
            </View>

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <Pressable
              style={({ pressed }) => [styles.analyzeBtn, { marginTop: 20, opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={() => { void handleAnalyze(); }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <MaterialIcons name="hourglass-empty" size={20} color="#0A1628" />
                  <Text style={styles.analyzeBtnText}>{at.analyzing}</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="query-stats" size={20} color="#0A1628" />
                  <Text style={styles.analyzeBtnText}>{at.analyzeBtn}</Text>
                </>
              )}
            </Pressable>
          </>
        )}

        {/* ── RESULT STEP ───────────────────────────────────────────────────── */}
        {step === "result" && killswitch && (
          <View style={styles.killswitchCard}>
            <View style={styles.killswitchIcon}>
              <MaterialIcons name="pause-circle-outline" size={36} color="#EF4444" />
            </View>
            <Text style={styles.killswitchTitle}>{at.killswitchTitle}</Text>
            <Text style={styles.killswitchMsg}>{at.killswitchMsg}</Text>
            <Pressable style={[styles.contactBtn, { width: "100%", height: 52, borderRadius: 14 }]}>
              <Text style={styles.contactBtnText}>{at.contactAdvisor}</Text>
            </Pressable>
            <Pressable onPress={handleReset} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                ← {at.resetBtn}
              </Text>
            </Pressable>
          </View>
        )}

        {step === "result" && !killswitch && result && (
          <>
            {/* Eligibility gauge */}
            <View style={styles.gaugeCard}>
              <Text style={styles.gaugeLabel}>{at.eligibilityScore}</Text>
              <ScoreGauge score={result.eligibility_score} color={sColor} />
              <View style={[styles.scoreBadge, { backgroundColor: sColor, marginTop: 16 }]}>
                <Text style={styles.scoreBadgeText}>{sLabel}</Text>
              </View>
            </View>

            {/* Payment method */}
            <View style={styles.paymentCard}>
              <View style={styles.paymentIconBox}>
                <MaterialIcons name={paymentIcon(result.recommended_payment_method)} size={24} color={gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>{at.paymentMethod}</Text>
                <Text style={styles.paymentValue}>
                  {paymentLabel(result.recommended_payment_method, at)}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: `${gold}22` }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: gold }}>✓</Text>
              </View>
            </View>

            {/* Reasoning summary */}
            {result.reasoning_summary.length > 0 && (
              <View style={styles.reasoningCard}>
                <Text style={styles.reasoningLabel}>{at.reasoning}</Text>
                <Text style={styles.reasoningText}>{result.reasoning_summary}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <Pressable style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetBtnText}>{at.resetBtn}</Text>
              </Pressable>
              <Pressable style={styles.contactBtn}>
                <Text style={styles.contactBtnText}>{at.contactAdvisor}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
