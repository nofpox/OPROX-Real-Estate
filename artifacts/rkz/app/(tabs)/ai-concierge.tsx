// Financing calculator — replaces old AI Concierge tab
import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

interface BankOffer {
  name: string;
  nameEn: string;
  rate: number;
  logo: string;
}

const BANKS: BankOffer[] = [
  { name: "بنك الإنماء",   nameEn: "Alinma Bank",        rate: 3.85, logo: "🌟" },
  { name: "البنك الأهلي", nameEn: "Al-Ahli Bank",        rate: 3.99, logo: "🏦" },
  { name: "مصرف الراجحي", nameEn: "Al-Rajhi Bank",       rate: 4.00, logo: "💰" },
  { name: "بنك الرياض",   nameEn: "Riyad Bank",          rate: 4.15, logo: "🏛️" },
  { name: "البنك العربي", nameEn: "Arab National Bank",  rate: 4.30, logo: "🏢" },
];

function calcMonthly(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function fmtSAR(n: number, isAr: boolean): string {
  const s = Math.round(n).toLocaleString("en-US");
  return isAr ? `${s} ر.س` : `SAR ${s}`;
}

// Simple stepper row
function Stepper({
  label,
  value,
  display,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  display: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={s.stepperCard}>
      <Text style={s.stepperLabel}>{label}</Text>
      <View style={s.stepperRow}>
        <Pressable style={s.stepBtn} onPress={onDec}>
          <MaterialIcons name="remove" size={22} color={NAVY} />
        </Pressable>
        <Text style={s.stepValue}>{display}</Text>
        <Pressable style={s.stepBtn} onPress={onInc}>
          <MaterialIcons name="add" size={22} color={NAVY} />
        </Pressable>
      </View>
    </View>
  );
}

export default function FinancingScreen() {
  const { t, isAr } = useLocale();
  const insets       = useSafeAreaInsets();

  const [priceStr,  setPriceStr]  = useState("1500000");
  const [downPct,   setDownPct]   = useState(20);   // 5..50 step 5
  const [years,     setYears]     = useState(20);   // 5..30 step 5
  const [rate,      setRate]      = useState(400);  // stored ×100 to avoid float drift
  const [income,    setIncome]    = useState("");
  const [activeTab, setActiveTab] = useState<"calc" | "afford">("calc");

  const price    = Number(priceStr.replace(/[^0-9]/g, "")) || 0;
  const downAmt  = (price * downPct) / 100;
  const loanAmt  = price - downAmt;
  const rateReal = rate / 100;
  const monthly  = useMemo(() => calcMonthly(loanAmt, rateReal, years), [loanAmt, rateReal, years]);
  const total    = monthly * years * 12;
  const profit   = total - loanAmt;

  const incomeNum   = Number(income.replace(/[^0-9]/g, "")) || 0;
  const maxMonthly  = incomeNum * 0.33;
  const affordAmt   = useMemo(() => {
    if (maxMonthly <= 0) return 0;
    const r = rateReal / 100 / 12;
    const n = years * 12;
    if (r === 0) return maxMonthly * n;
    return (maxMonthly * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
  }, [maxMonthly, rateReal, years]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={s.headerTitle}>{t.financing.title}</Text>
        <Text style={s.headerSub}>{t.financing.subtitle}</Text>
        <View style={s.tabRow}>
          {(["calc", "afford"] as const).map((tab) => (
            <Pressable key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab === "calc"
                  ? (isAr ? "حاسبة التمويل" : "Calculator")
                  : (isAr ? "قدرتي الشرائية" : "Affordability")}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 100 }}>
        {activeTab === "calc" ? (
          <>
            {/* Price */}
            <View style={s.inputCard}>
              <Text style={s.inputLabel}>{t.financing.propPrice}</Text>
              <TextInput
                style={[s.priceInput, { textAlign: isAr ? "right" : "left" }]}
                value={price > 0 ? price.toLocaleString("en-US") : ""}
                onChangeText={(v) => setPriceStr(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholder="1,500,000"
                placeholderTextColor="rgba(15,32,64,0.3)"
              />
            </View>

            {/* Down payment */}
            <Stepper
              label={`${t.financing.downPayment}  (${downPct}%  —  ${fmtSAR(downAmt, isAr)})`}
              value={downPct}
              display={`${downPct}%`}
              onDec={() => setDownPct((p) => Math.max(5, p - 5))}
              onInc={() => setDownPct((p) => Math.min(50, p + 5))}
            />

            {/* Years */}
            <Stepper
              label={t.financing.years}
              value={years}
              display={t.financing.yearsLabel(years)}
              onDec={() => setYears((y) => Math.max(5, y - 5))}
              onInc={() => setYears((y) => Math.min(30, y + 5))}
            />

            {/* Rate */}
            <Stepper
              label={t.financing.rate}
              value={rate}
              display={`${rateReal.toFixed(2)}%`}
              onDec={() => setRate((r) => Math.max(200, r - 25))}
              onInc={() => setRate((r) => Math.min(800, r + 25))}
            />

            {/* Result */}
            <View style={s.resultCard}>
              <View style={s.resultMain}>
                <Text style={s.resultLabel}>{t.financing.monthly}</Text>
                <Text style={s.resultAmount}>{fmtSAR(monthly, isAr)}</Text>
                <Text style={s.resultSub}>{isAr ? "في الشهر" : "per month"}</Text>
              </View>
              <View style={s.resultDivider} />
              <View style={s.resultRows}>
                {[
                  { label: t.financing.loanAmt,   value: fmtSAR(loanAmt, isAr) },
                  { label: t.financing.downAmt,    value: fmtSAR(downAmt, isAr) },
                  { label: t.financing.bankProfit, value: fmtSAR(profit, isAr) },
                  { label: t.financing.totalCost,  value: fmtSAR(total, isAr) },
                ].map((row) => (
                  <View key={row.label} style={s.resultRow}>
                    <Text style={s.resultRowLabel}>{row.label}</Text>
                    <Text style={s.resultRowValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={s.disclaimer}>{t.financing.disclaimer}</Text>

            {/* Banks */}
            <Text style={s.sectionTitle}>{t.financing.banks}</Text>
            {BANKS.map((bank) => {
              const m = calcMonthly(loanAmt, bank.rate, years);
              const cheapest = bank.rate === Math.min(...BANKS.map((b) => b.rate));
              return (
                <View key={bank.name} style={[s.bankRow, cheapest && s.bankRowBest]}>
                  <Text style={s.bankLogo}>{bank.logo}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bankName}>{isAr ? bank.name : bank.nameEn}</Text>
                    <Text style={s.bankRate}>{bank.rate}%</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.bankMonthly}>{fmtSAR(m, isAr)}</Text>
                    <Text style={s.bankMo}>{isAr ? "/شهر" : "/mo"}</Text>
                  </View>
                  {cheapest && (
                    <View style={s.bestBadge}>
                      <Text style={s.bestBadgeText}>{isAr ? "الأفضل" : "Best"}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        ) : (
          <>
            <View style={s.inputCard}>
              <Text style={s.inputLabel}>{t.financing.monthlyIncome}</Text>
              <TextInput
                style={[s.priceInput, { textAlign: isAr ? "right" : "left" }]}
                value={income}
                onChangeText={setIncome}
                keyboardType="numeric"
                placeholder="15,000"
                placeholderTextColor="rgba(15,32,64,0.3)"
              />
            </View>

            <Stepper
              label={t.financing.years}
              value={years}
              display={t.financing.yearsLabel(years)}
              onDec={() => setYears((y) => Math.max(5, y - 5))}
              onInc={() => setYears((y) => Math.min(30, y + 5))}
            />

            {affordAmt > 0 && (
              <View style={s.affordCard}>
                <MaterialIcons name="home" size={44} color={GOLD} />
                <Text style={s.affordAmount}>{fmtSAR(affordAmt + affordAmt * (downPct / 100), isAr)}</Text>
                <Text style={s.affordDesc}>
                  {isAr
                    ? `بناءً على 33% من راتبك، تستطيع تمويل عقار بقيمة تصل إلى ${fmtSAR(affordAmt + affordAmt * (downPct / 100), isAr)}`
                    : `Based on 33% of your income, you can afford a property up to ${fmtSAR(affordAmt + affordAmt * (downPct / 100), false)}`}
                </Text>
                <View style={s.affordDetail}>
                  <Text style={s.affordDetailText}>
                    {isAr ? `قسط شهري: ${fmtSAR(maxMonthly, isAr)}` : `Monthly: ${fmtSAR(maxMonthly, false)}`}
                  </Text>
                  <Text style={s.affordDetailText}>
                    {isAr ? `دفعة أولى (${downPct}%): ${fmtSAR(affordAmt * (downPct / 100), isAr)}` : `Down (${downPct}%): ${fmtSAR(affordAmt * (downPct / 100), false)}`}
                  </Text>
                </View>
              </View>
            )}

            <Text style={s.disclaimer}>{t.financing.disclaimer}</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:       { backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
  headerTitle:  { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:    { fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 18 },
  tabRow:       { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 3, marginTop: 8, gap: 2 },
  tab:          { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive:    { backgroundColor: GOLD },
  tabText:      { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },
  tabTextActive: { color: NAVY },

  inputCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  inputLabel:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(15,32,64,0.6)" },
  priceInput:   { fontSize: 22, fontFamily: "Inter_700Bold", color: NAVY, borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 6 },

  stepperCard:  { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  stepperLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(15,32,64,0.65)" },
  stepperRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn:      { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(15,32,64,0.07)", alignItems: "center", justifyContent: "center" },
  stepValue:    { fontSize: 22, fontFamily: "Inter_700Bold", color: NAVY, minWidth: 80, textAlign: "center" },

  resultCard:   { backgroundColor: NAVY, borderRadius: 20, padding: 20, gap: 16 },
  resultMain:   { alignItems: "center", gap: 4 },
  resultLabel:  { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  resultAmount: { fontSize: 36, fontFamily: "Inter_700Bold", color: GOLD },
  resultSub:    { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  resultDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  resultRows:   { gap: 10 },
  resultRow:    { flexDirection: "row", justifyContent: "space-between" },
  resultRowLabel: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  resultRowValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },

  disclaimer:   { fontSize: 11, color: "rgba(15,32,64,0.45)", textAlign: "center", lineHeight: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: NAVY },

  bankRow:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  bankRowBest:  { borderWidth: 2, borderColor: GOLD },
  bankLogo:     { fontSize: 28 },
  bankName:     { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NAVY },
  bankRate:     { fontSize: 11, color: "rgba(15,32,64,0.5)" },
  bankMonthly:  { fontSize: 15, fontFamily: "Inter_700Bold", color: GOLD },
  bankMo:       { fontSize: 10, color: "rgba(15,32,64,0.45)" },
  bestBadge:    { position: "absolute", top: -1, right: -1, backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderTopRightRadius: 14 },
  bestBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: NAVY },

  affordCard:   { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  affordAmount: { fontSize: 30, fontFamily: "Inter_700Bold", color: NAVY },
  affordDesc:   { fontSize: 13, color: "rgba(15,32,64,0.6)", textAlign: "center", lineHeight: 20 },
  affordDetail: { width: "100%", gap: 6, borderTopWidth: 1, borderTopColor: "rgba(15,32,64,0.08)", paddingTop: 12, marginTop: 4 },
  affordDetailText: { fontSize: 12, color: "rgba(15,32,64,0.6)", textAlign: "center" },
});
