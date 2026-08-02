import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

function formatSAR(n: number, isAr: boolean): string {
  if (!n || isNaN(n)) return isAr ? "0 ر.س" : "SAR 0";
  if (n >= 1_000_000) return isAr ? `${(n / 1_000_000).toFixed(2)} مليون ر.س` : `SAR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return isAr ? `${Math.round(n / 1_000)} ألف ر.س` : `SAR ${Math.round(n / 1_000)}K`;
  return isAr ? `${n.toLocaleString("en-US")} ر.س` : `SAR ${n.toLocaleString("en-US")}`;
}

interface ValuationResult {
  estimatedMidpoint: number;
  estimatedLow: number;
  estimatedHigh: number;
  estimatedPricePerSqm: number;
  confidence: string;
  confidenceScore: number;
  askingPricePosition: string;
  comparablesUsedCount: number;
  comparables: Array<{
    id: number;
    title: string;
    price: number;
    areaSqm: number;
    pricePerSqm: number;
    district: string;
    similarityScore: number;
  }>;
  factors: Array<{
    titleAr: string;
    titleEn: string;
    impactAr: string;
    impactEn: string;
  }>;
}

interface InvestmentResult {
  metrics: {
    purchasePrice: number;
    downPaymentSAR: number;
    loanAmountSAR: number;
    monthlyMortgageSAR: number;
    grossYieldPercent: number;
    netYieldPercent: number;
    grossAnnualRentSAR: number;
    netOperatingIncomeAnnualSAR: number;
    annualNetCashFlowSAR: number;
  };
  scenarios: Array<{
    id: string;
    titleAr: string;
    titleEn: string;
    metrics: {
      downPaymentSAR: number;
      monthlyMortgageSAR: number;
      netYieldPercent: number;
      annualNetCashFlowSAR: number;
    };
  }>;
}

export default function ValuationScreen() {
  const { t, isAr } = useLocale();
  const insets = useSafeAreaInsets();
  const te = t.detail.estimate;

  const [activeTab, setActiveTab] = useState<"valuation" | "investment">("valuation");

  // Inputs
  const [city, setCity]         = useState("الرياض");
  const [district, setDistrict] = useState("");
  const [area, setArea]         = useState("350");
  const [propType, setType]     = useState<"villa" | "apartment" | "land" | "commercial">("villa");
  const [rooms, setRooms]       = useState("4");
  const [askingPrice, setAskingPrice] = useState("2800000");

  const [loading, setLoading]       = useState(false);
  const [valResult, setValResult]   = useState<ValuationResult | null>(null);
  const [invResult, setInvResult]   = useState<InvestmentResult | null>(null);

  const CITIES_AR = ["الرياض", "جدة", "الدمام", "الخبر", "مكة", "المدينة", "أبها", "نيوم"];
  const CITIES_EN = ["Riyadh", "Jeddah", "Dammam", "Khobar", "Makkah", "Madinah", "Abha", "Neom"];
  const cityList = isAr ? CITIES_AR : CITIES_EN;

  const types = [
    { key: "villa",     labelAr: "فيلا",        labelEn: "Villa" },
    { key: "apartment", labelAr: "شقة",        labelEn: "Apartment" },
    { key: "land",      labelAr: "أرض",         labelEn: "Land" },
    { key: "commercial",labelAr: "تجاري",       labelEn: "Commercial" },
  ] as const;

  async function calculate() {
    const sqm = parseFloat(area);
    if (!city.trim() || isNaN(sqm) || sqm <= 0) return;
    setLoading(true);

    try {
      const ask = parseFloat(askingPrice) || undefined;

      // 1. Fetch Valuation Estimate
      const valRes = await fetch("/api/valuation/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          district: district.trim() || undefined,
          areaSqm: sqm,
          propertyType: propType,
          bedrooms: parseInt(rooms, 10) || 4,
          askingPrice: ask,
        }),
      });

      if (valRes.ok) {
        const data = await valRes.json();
        setValResult(data);
      }

      // 2. Fetch Investment Metrics
      const purchasePrice = ask || valResult?.estimatedMidpoint || sqm * 4500;
      const invRes = await fetch("/api/valuation/investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePrice,
          areaSqm: sqm,
        }),
      });

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvResult(invData);
      }
    } catch (err) {
      console.warn("Valuation error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <View>
          <Text style={s.headerTitle}>OPROX Estimate™</Text>
          <Text style={s.headerSub}>{isAr ? "التقييم العقاري ومحرك الاستثمار الذكي" : "Property Valuation & Investment Engine"}</Text>
        </View>
      </View>

      {/* Subnav Tabs */}
      <View style={s.tabContainer}>
        <Pressable
          onPress={() => setActiveTab("valuation")}
          style={[s.tabBtn, activeTab === "valuation" && s.tabBtnActive]}
        >
          <MaterialIcons name="assessment" size={18} color={activeTab === "valuation" ? NAVY : "rgba(15,32,64,0.6)"} />
          <Text style={[s.tabText, activeTab === "valuation" && s.tabTextActive]}>
            {isAr ? "تقدير القيمة السوقية" : "Valuation Estimate"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("investment")}
          style={[s.tabBtn, activeTab === "investment" && s.tabBtnActive]}
        >
          <MaterialIcons name="trending-up" size={18} color={activeTab === "investment" ? NAVY : "rgba(15,32,64,0.6)"} />
          <Text style={[s.tabText, activeTab === "investment" && s.tabTextActive]}>
            {isAr ? "حاسبة العائد والاستثمار" : "Investment Yield"}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* Input Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{isAr ? "بيانات العقار والمنطقة" : "Property & Location Inputs"}</Text>

          {/* City */}
          <View style={s.field}>
            <Text style={s.label}>{isAr ? "المدينة والحي" : "City & District"}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                style={[s.input, { flex: 1 }, isAr && { textAlign: "right" }]}
                placeholder={isAr ? "المدينة..." : "City..."}
                placeholderTextColor="rgba(15,32,64,0.35)"
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={[s.input, { flex: 1 }, isAr && { textAlign: "right" }]}
                placeholder={isAr ? "الحي (مثال: النرجس)..." : "District (e.g. Al Narjis)..."}
                placeholderTextColor="rgba(15,32,64,0.35)"
                value={district}
                onChangeText={setDistrict}
              />
            </View>

            {/* City chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
              {cityList.map((c) => (
                <Pressable key={c} onPress={() => setCity(c)} style={[s.cityChip, city === c && s.cityChipActive]}>
                  <Text style={[s.cityChipText, city === c && s.cityChipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Type */}
          <View style={s.field}>
            <Text style={s.label}>{isAr ? "نوع العقار" : "Property Type"}</Text>
            <View style={s.typeRow}>
              {types.map((tp) => (
                <Pressable
                  key={tp.key}
                  onPress={() => setType(tp.key)}
                  style={[s.typeBtn, propType === tp.key && s.typeBtnActive]}
                >
                  <Text style={[s.typeBtnText, propType === tp.key && s.typeBtnTextActive]}>
                    {isAr ? tp.labelAr : tp.labelEn}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Area & Asking Price */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>{isAr ? "المساحة (م²)" : "Area (m²)"}</Text>
              <TextInput
                style={[s.input, isAr && { textAlign: "right" }]}
                placeholder="350"
                placeholderTextColor="rgba(15,32,64,0.35)"
                keyboardType="numeric"
                value={area}
                onChangeText={setArea}
              />
            </View>

            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>{isAr ? "السعر المعروض (ر.س)" : "Asking Price (SAR)"}</Text>
              <TextInput
                style={[s.input, isAr && { textAlign: "right" }]}
                placeholder="2,800,000"
                placeholderTextColor="rgba(15,32,64,0.35)"
                keyboardType="numeric"
                value={askingPrice}
                onChangeText={setAskingPrice}
              />
            </View>
          </View>

          <Pressable
            style={[s.calcBtn, (!city.trim() || !area.trim()) && s.calcBtnDisabled]}
            onPress={calculate}
            disabled={!city.trim() || !area.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.calcBtnText}>
                {isAr ? "حساب التقييم والاستثمار" : "Calculate Valuation & Yield"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Tab 1: Valuation Results */}
        {activeTab === "valuation" && valResult && (
          <View style={s.resultCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.resultTitle}>{isAr ? "نطاق التقدير السوقي" : "Market Valuation Range"}</Text>
              <View style={s.confBadge}>
                <Text style={s.confBadgeText}>
                  {isAr ? `درجة الثقة: ${valResult.confidence}` : `Confidence: ${valResult.confidence}`}
                </Text>
              </View>
            </View>

            <Text style={s.resultMid}>{formatSAR(valResult.estimatedMidpoint, isAr)}</Text>

            <View style={s.rangeRow}>
              <View style={s.rangePill}>
                <Text style={s.rangePillLabel}>{isAr ? "الحد الأدنى" : "Low Range"}</Text>
                <Text style={s.rangePillValue}>{formatSAR(valResult.estimatedLow, isAr)}</Text>
              </View>
              <View style={[s.rangePill, s.rangePillHigh]}>
                <Text style={s.rangePillLabel}>{isAr ? "الحد الأعلى" : "High Range"}</Text>
                <Text style={[s.rangePillValue, { color: NAVY }]}>{formatSAR(valResult.estimatedHigh, isAr)}</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statBox}>
                <MaterialIcons name="straighten" size={18} color={GOLD} />
                <Text style={s.statLabel}>{te.pricePerSqm}</Text>
                <Text style={s.statValue}>{formatSAR(valResult.estimatedPricePerSqm, isAr)}/م²</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <MaterialIcons name="grid-on" size={18} color="#22c55e" />
                <Text style={s.statLabel}>{isAr ? "العقارات المماثلة" : "Comparables"}</Text>
                <Text style={s.statValue}>{valResult.comparablesUsedCount} عقارات</Text>
              </View>
            </View>

            {/* Factors */}
            {valResult.factors && valResult.factors.length > 0 && (
              <View style={s.factorsBox}>
                <Text style={s.factorsTitle}>{isAr ? "عوامل تؤثر في التقييم:" : "Key Valuation Factors:"}</Text>
                {valResult.factors.map((f, i) => (
                  <View key={i} style={s.factorItem}>
                    <MaterialIcons name="check-circle" size={16} color={GOLD} />
                    <Text style={s.factorText}>{isAr ? f.titleAr : f.titleEn}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={s.disclaimer}>
              {isAr
                ? "تم حساب التقييم باستخدام خوارزميات OPROX Estimate™ بناءً على العروض الحقيقية والمقارنات الجغرافية."
                : "Valuation computed by OPROX Estimate™ using grounded market inventory and spatial comparables."}
            </Text>
          </View>
        )}

        {/* Tab 2: Investment Results */}
        {activeTab === "investment" && invResult && (
          <View style={s.invCard}>
            <Text style={s.invTitle}>{isAr ? "مؤشرات العائد والأداء المالي" : "Investment & Yield Performance"}</Text>

            <View style={s.invGrid}>
              <View style={s.invStatBox}>
                <Text style={s.invStatLabel}>{isAr ? "العائد الإجمالي (Gross Yield)" : "Gross Yield"}</Text>
                <Text style={s.invStatVal}>{invResult.metrics.grossYieldPercent}%</Text>
              </View>
              <View style={s.invStatBox}>
                <Text style={s.invStatLabel}>{isAr ? "العائد الصافي (Net Yield)" : "Net Yield"}</Text>
                <Text style={[s.invStatVal, { color: "#22c55e" }]}>{invResult.metrics.netYieldPercent}%</Text>
              </View>
              <View style={s.invStatBox}>
                <Text style={s.invStatLabel}>{isAr ? "القسط الشهري (20% دفعة)" : "Monthly Mortgage"}</Text>
                <Text style={s.invStatVal}>{formatSAR(invResult.metrics.monthlyMortgageSAR, isAr)}</Text>
              </View>
              <View style={s.invStatBox}>
                <Text style={s.invStatLabel}>{isAr ? "التدفق النقدي السنوي" : "Annual Cash Flow"}</Text>
                <Text style={s.invStatVal}>{formatSAR(invResult.metrics.annualNetCashFlowSAR, isAr)}</Text>
              </View>
            </View>

            {/* Scenarios */}
            <Text style={[s.factorsTitle, { marginTop: 14 }]}>{isAr ? "خيارات سيناريو التمويل:" : "Financing Scenarios:"}</Text>
            {invResult.scenarios.map((sc) => (
              <View key={sc.id} style={s.scenarioBox}>
                <Text style={s.scenarioName}>{isAr ? sc.titleAr : sc.titleEn}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={s.scenarioSub}>
                    {isAr
                      ? `قسط شهري: ${formatSAR(sc.metrics.monthlyMortgageSAR, isAr)}`
                      : `Monthly: ${formatSAR(sc.metrics.monthlyMortgageSAR, isAr)}`}
                  </Text>
                  <Text style={s.scenarioSubBold}>
                    {isAr ? `صافي العائد: ${sc.metrics.netYieldPercent}%` : `Net Yield: ${sc.metrics.netYieldPercent}%`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:    { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 1 },

  tabContainer: {
    flexDirection: "row", backgroundColor: "#fff", padding: 6, marginHorizontal: 20, marginTop: 12,
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(15,32,64,0.1)", gap: 6,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 10, gap: 6, backgroundColor: "#f8fafc",
  },
  tabBtnActive: { backgroundColor: "rgba(201,168,76,0.15)" },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(15,32,64,0.6)" },
  tabTextActive: { color: NAVY, fontFamily: "Inter_700Bold" },

  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    gap: 14,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: NAVY },

  field:  { gap: 6 },
  label:  { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(15,32,64,0.55)" },
  input:  {
    borderWidth: 1.5, borderColor: "rgba(15,32,64,0.12)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: NAVY,
    backgroundColor: "#f9fafb",
  },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "rgba(15,32,64,0.15)", backgroundColor: "#f9fafb",
  },
  typeBtnActive:    { backgroundColor: NAVY, borderColor: NAVY },
  typeBtnText:      { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(15,32,64,0.55)" },
  typeBtnTextActive:{ color: "#fff" },

  calcBtn: {
    backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15,
    alignItems: "center", marginTop: 4,
  },
  calcBtnDisabled: { opacity: 0.45 },
  calcBtnText:     { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },

  resultCard: {
    backgroundColor: NAVY, borderRadius: 18, padding: 20,
    shadowColor: NAVY, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5,
    gap: 12,
  },
  resultTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
  confBadge: { backgroundColor: "rgba(201,168,76,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  confBadgeText: { fontSize: 11, color: GOLD, fontFamily: "Inter_600SemiBold" },
  resultMid:   { fontSize: 32, fontFamily: "Inter_700Bold", color: GOLD, textAlign: "center" },

  rangeRow: { flexDirection: "row", gap: 10 },
  rangePill: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12,
    padding: 12, alignItems: "center", gap: 4,
  },
  rangePillHigh:  { backgroundColor: GOLD },
  rangePillLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },
  rangePillValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },

  statsRow:    { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 12 },
  statBox:     { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  statLabel:   { fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", textAlign: "center" },
  statValue:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff", textAlign: "center" },

  factorsBox: { backgroundColor: "rgba(255,255,255,0.06)", padding: 12, borderRadius: 12, gap: 8 },
  factorsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GOLD },
  factorItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  factorText: { fontSize: 12, color: "#fff", fontFamily: "Inter_400Regular", flex: 1 },

  disclaimer: {
    fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 17, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 10,
  },

  invCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 3, gap: 12,
  },
  invTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY },
  invGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  invStatBox: {
    width: "48%", backgroundColor: "#f8fafc", padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(15,32,64,0.08)", gap: 4,
  },
  invStatLabel: { fontSize: 11, color: "rgba(15,32,64,0.6)", fontFamily: "Inter_500Medium" },
  invStatVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY },

  scenarioBox: {
    backgroundColor: "#f8fafc", padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(15,32,64,0.08)", marginTop: 4,
  },
  scenarioName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NAVY },
  scenarioSub: { fontSize: 12, color: "rgba(15,32,64,0.6)" },
  scenarioSubBold: { fontSize: 12, fontFamily: "Inter_700Bold", color: GOLD },

  cityChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: "rgba(15,32,64,0.15)", backgroundColor: "#f1f5f9",
  },
  cityChipActive:     { backgroundColor: GOLD, borderColor: GOLD },
  cityChipText:       { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(15,32,64,0.6)" },
  cityChipTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
});
