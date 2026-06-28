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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

const CITY_PRICE_PER_SQM: Record<string, number> = {
  "الرياض": 4800, "Riyadh": 4800,
  "جدة": 4200,   "Jeddah": 4200,
  "الدمام": 3100, "Dammam": 3100,
  "أبها": 2400,   "Abha": 2400,
  "مكة": 5200,   "Makkah": 5200,
  "المدينة": 3800, "Madinah": 3800,
  "نيوم": 8500,   "Neom": 8500,
  "القصيم": 1900, "Qassim": 1900,
};

const TYPE_MULT: Record<string, number> = {
  villa: 1.35, apartment: 1.0, land: 0.55, commercial: 1.2,
};

function formatSAR(n: number, isAr: boolean): string {
  if (n >= 1_000_000) return isAr ? `${(n / 1_000_000).toFixed(2)} مليون ر.س` : `SAR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return isAr ? `${Math.round(n / 1_000)} ألف ر.س` : `SAR ${Math.round(n / 1_000)}K`;
  return isAr ? `${n} ر.س` : `SAR ${n}`;
}

export default function ValuationScreen() {
  const { t, isAr } = useLocale();
  const insets = useSafeAreaInsets();
  const te = isAr ? (t as any).property.estimate : (t as any).property.estimate;

  const [city, setCity]     = useState("");
  const [area, setArea]     = useState("");
  const [propType, setType] = useState<"villa" | "apartment" | "land" | "commercial">("apartment");
  const [rooms, setRooms]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<null | { low: number; high: number; mid: number; perSqm: number; trend: string; confidence: string }>(null);

  const types = [
    { key: "apartment", labelAr: "شقة",        labelEn: "Apartment" },
    { key: "villa",     labelAr: "فيلا",        labelEn: "Villa" },
    { key: "land",      labelAr: "أرض",         labelEn: "Land" },
    { key: "commercial",labelAr: "تجاري",       labelEn: "Commercial" },
  ] as const;

  function calculate() {
    const sqm = parseFloat(area);
    if (!city.trim() || isNaN(sqm) || sqm <= 0) return;
    setLoading(true);
    setTimeout(() => {
      const basePpm = CITY_PRICE_PER_SQM[city.trim()] ?? 3500;
      const mult    = TYPE_MULT[propType] ?? 1.0;
      const roomBonus = propType !== "land" ? (parseInt(rooms) || 0) * 0.03 : 0;
      const mid     = Math.round(sqm * basePpm * mult * (1 + roomBonus));
      const variance = 0.12;
      setResult({
        low:  Math.round(mid * (1 - variance)),
        high: Math.round(mid * (1 + variance)),
        mid,
        perSqm: Math.round(basePpm * mult),
        trend: basePpm > 4000 ? "up" : basePpm > 2500 ? "flat" : "down",
        confidence: sqm > 100 && city.trim().length > 2 ? "high" : "medium",
      });
      setLoading(false);
    }, 1400);
  }

  const trendLabel = result
    ? result.trend === "up"   ? te.trendUp
    : result.trend === "down" ? te.trendDown
    : te.trendFlat
    : "";

  const confLabel = result?.confidence === "high" ? te.high : te.medium;

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <View>
          <Text style={s.headerTitle}>{te.title}</Text>
          <Text style={s.headerSub}>{te.subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* Input card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{isAr ? "بيانات العقار" : "Property Details"}</Text>

          {/* City */}
          <View style={s.field}>
            <Text style={s.label}>{isAr ? "المدينة" : "City"}</Text>
            <TextInput
              style={[s.input, isAr && { textAlign: "right" }]}
              placeholder={isAr ? "مثال: الرياض، جدة..." : "e.g. Riyadh, Jeddah..."}
              placeholderTextColor="rgba(15,32,64,0.35)"
              value={city}
              onChangeText={setCity}
            />
          </View>

          {/* Type */}
          <View style={s.field}>
            <Text style={s.label}>{isAr ? "نوع العقار" : "Property Type"}</Text>
            <View style={s.typeRow}>
              {types.map(tp => (
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

          {/* Area */}
          <View style={s.field}>
            <Text style={s.label}>{isAr ? "المساحة (م²)" : "Area (m²)"}</Text>
            <TextInput
              style={[s.input, isAr && { textAlign: "right" }]}
              placeholder={isAr ? "مثال: 200" : "e.g. 200"}
              placeholderTextColor="rgba(15,32,64,0.35)"
              keyboardType="numeric"
              value={area}
              onChangeText={setArea}
            />
          </View>

          {/* Rooms (not for land) */}
          {propType !== "land" && (
            <View style={s.field}>
              <Text style={s.label}>{isAr ? "عدد الغرف" : "Bedrooms"}</Text>
              <View style={s.typeRow}>
                {["1","2","3","4","5+"].map(n => (
                  <Pressable key={n} onPress={() => setRooms(n)} style={[s.typeBtn, rooms === n && s.typeBtnActive]}>
                    <Text style={[s.typeBtnText, rooms === n && s.typeBtnTextActive]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Pressable
            style={[s.calcBtn, (!city.trim() || !area.trim()) && s.calcBtnDisabled]}
            onPress={calculate}
            disabled={!city.trim() || !area.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.calcBtnText}>{isAr ? "احسب التقييم" : "Calculate Estimate"}</Text>
            }
          </Pressable>
        </View>

        {/* Result card */}
        {result && (
          <View style={s.resultCard}>
            <Text style={s.resultTitle}>{te.range}</Text>

            <Text style={s.resultMid}>{formatSAR(result.mid, isAr)}</Text>

            <View style={s.rangeRow}>
              <View style={s.rangePill}>
                <Text style={s.rangePillLabel}>{isAr ? "أدنى" : "Low"}</Text>
                <Text style={s.rangePillValue}>{formatSAR(result.low, isAr)}</Text>
              </View>
              <View style={[s.rangePill, s.rangePillHigh]}>
                <Text style={s.rangePillLabel}>{isAr ? "أعلى" : "High"}</Text>
                <Text style={[s.rangePillValue, { color: NAVY }]}>{formatSAR(result.high, isAr)}</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statBox}>
                <MaterialIcons name="straighten" size={18} color={GOLD} />
                <Text style={s.statLabel}>{te.pricePerSqm}</Text>
                <Text style={s.statValue}>{formatSAR(result.perSqm, isAr)}</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <MaterialIcons
                  name={result.trend === "up" ? "trending-up" : result.trend === "down" ? "trending-down" : "trending-flat"}
                  size={18}
                  color={result.trend === "up" ? "#22c55e" : result.trend === "down" ? "#ef4444" : "#f59e0b"}
                />
                <Text style={s.statLabel}>{te.marketTrend}</Text>
                <Text style={[s.statValue, { color: result.trend === "up" ? "#22c55e" : result.trend === "down" ? "#ef4444" : "#f59e0b" }]}>
                  {trendLabel}
                </Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <MaterialIcons name="verified" size={18} color={NAVY} />
                <Text style={s.statLabel}>{te.confidence}</Text>
                <Text style={s.statValue}>{confLabel}</Text>
              </View>
            </View>

            <Text style={s.disclaimer}>{te.disclaimer}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 20,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:    { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 1 },

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
  calcBtnText:     { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  resultCard: {
    backgroundColor: NAVY, borderRadius: 18, padding: 20,
    shadowColor: NAVY, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5,
    gap: 12,
  },
  resultTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  resultMid:   { fontSize: 34, fontFamily: "Inter_700Bold", color: GOLD, textAlign: "center" },

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

  disclaimer: {
    fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 17, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 10,
  },
});
