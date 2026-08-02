import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/hooks/useLocale";
import HeatmapMapView, { type MapProperty } from "@/components/HeatmapMapView.web";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

export type HeatmapMetric = "markers" | "density" | "price_sqm" | "price" | "yield";

interface DistrictIntelligence {
  city: string;
  district: string;
  listingCount: number;
  medianPrice: number;
  medianPricePerSqm: number;
  confidence: string;
}

export default function MapDiscoveryScreen() {
  const { t, isAr } = useLocale();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  // Filters state
  const [selectedCity, setSelectedCity] = useState("الرياض");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [listingType, setListingType]   = useState<"all" | "sale" | "rent">("all");
  const [activeMetric, setActiveMetric] = useState<HeatmapMetric>("markers");
  const [searchQuery, setSearchQuery]   = useState("");

  // Data state
  const [loading, setLoading]           = useState(false);
  const [properties, setProperties]     = useState<MapProperty[]>([]);
  const [districtInfo, setDistrictInfo] = useState<DistrictIntelligence | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);
  const [viewMode, setViewMode]         = useState<"split" | "map" | "list">(isDesktop ? "split" : "map");

  const CITIES_AR = ["الرياض", "جدة", "الدمام", "الخبر", "مكة المكرمة", "المدينة المنورة", "نيوم"];
  const CITIES_EN = ["Riyadh", "Jeddah", "Dammam", "Khobar", "Makkah", "Madinah", "Neom"];
  const cityList  = isAr ? CITIES_AR : CITIES_EN;

  const METRICS: Array<{ key: HeatmapMetric; labelAr: string; labelEn: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
    { key: "markers",   labelAr: "أسعار العقارات",  labelEn: "Price Markers", icon: "place" },
    { key: "density",   labelAr: "كثافة العروض",   labelEn: "Density Heatmap", icon: "grain" },
    { key: "price_sqm", labelAr: "متوسط سعر المتر", labelEn: "Price / m²", icon: "grid-on" },
    { key: "price",     labelAr: "أسعار المعروض",  labelEn: "Median Price", icon: "payments" },
    { key: "yield",     labelAr: "العائد الاستثماري", labelEn: "Yield Layer", icon: "trending-up" },
  ];

  async function fetchMapData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append("city", selectedCity);
      if (selectedType !== "all") params.append("propertyType", selectedType);
      if (listingType !== "all") params.append("type", listingType);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      // Fetch listings
      const res = await fetch(`/api/listings?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.data) ? json.data : [];
        const mapped: MapProperty[] = rawList.map((item: any) => ({
          id: String(item.id),
          city: item.city || selectedCity,
          district: item.district || "عام",
          type: item.propertyType || "villa",
          price: Number(item.price) || 2000000,
          area: Number(item.areaSqm) || 350,
          bedrooms: item.bedrooms,
          badge: item.verificationStatus === "verified" ? (isAr ? "موثوق" : "Verified") : undefined,
        }));
        setProperties(mapped);
      }

      // Fetch district summary
      const distRes = await fetch(`/api/valuation/district-summary?city=${encodeURIComponent(selectedCity)}`);
      if (distRes.ok) {
        const distData = await distRes.json();
        setDistrictInfo(distData);
      }
    } catch (err) {
      console.warn("Map data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMapData();
  }, [selectedCity, selectedType, listingType]);

  function formatPrice(n: number): string {
    if (n >= 1_000_000) return isAr ? `${(n / 1_000_000).toFixed(1)} مليون ر.س` : `SAR ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return isAr ? `${Math.round(n / 1_000)} ألف ر.س` : `SAR ${Math.round(n / 1_000)}K`;
    return isAr ? `${n.toLocaleString("en-US")} ر.س` : `SAR ${n.toLocaleString("en-US")}`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{isAr ? "استكشاف الخريطة والطبقات الحرارية" : "Map Discovery & GIS Heatmap"}</Text>
          <Text style={s.headerSub}>OPROX Spatial Intelligence™ — {properties.length} {isAr ? "عقار متاح" : "listings"}</Text>
        </View>

        {!isDesktop && (
          <View style={s.toggleGroup}>
            <Pressable
              onPress={() => setViewMode("map")}
              style={[s.toggleBtn, viewMode === "map" && s.toggleBtnActive]}
            >
              <MaterialIcons name="map" size={18} color={viewMode === "map" ? NAVY : "#fff"} />
            </Pressable>
            <Pressable
              onPress={() => setViewMode("list")}
              style={[s.toggleBtn, viewMode === "list" && s.toggleBtnActive]}
            >
              <MaterialIcons name="list" size={18} color={viewMode === "list" ? NAVY : "#fff"} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Control Bar: City & Heatmap Layer Selector */}
      <View style={s.controlsContainer}>
        {/* Cities */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {cityList.map((c) => (
            <Pressable key={c} onPress={() => setSelectedCity(c)} style={[s.cityChip, selectedCity === c && s.cityChipActive]}>
              <Text style={[s.cityChipText, selectedCity === c && s.cityChipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Heatmap Layer Switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, marginTop: 8 }}>
          {METRICS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setActiveMetric(m.key)}
              style={[s.metricChip, activeMetric === m.key && s.metricChipActive]}
            >
              <MaterialIcons name={m.icon} size={15} color={activeMetric === m.key ? NAVY : GOLD} />
              <Text style={[s.metricText, activeMetric === m.key && s.metricTextActive]}>
                {isAr ? m.labelAr : m.labelEn}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Body: Split View or Full Map/List */}
      <View style={{ flex: 1, flexDirection: isDesktop ? "row" : "column" }}>
        
        {/* Left Side (Desktop) or Mobile List View */}
        {(isDesktop || viewMode === "list") && (
          <View style={[s.sidePanel, isDesktop && { width: 380 }]}>
            
            {/* Search Input */}
            <View style={s.searchBox}>
              <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={[s.searchInput, isAr && { textAlign: "right" }]}
                placeholder={isAr ? "بحث بالحي أو اسم المشروع..." : "Search district or project..."}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={fetchMapData}
              />
            </View>

            {/* District Intelligence Summary */}
            {districtInfo && (
              <View style={s.intelBox}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={s.intelTitle}>{isAr ? `ذكاء منطقة ${districtInfo.city}` : `${districtInfo.city} Intelligence`}</Text>
                  <Text style={s.intelBadge}>{districtInfo.confidence}</Text>
                </View>

                <View style={s.intelGrid}>
                  <View style={s.intelItem}>
                    <Text style={s.intelVal}>{districtInfo.listingCount}</Text>
                    <Text style={s.intelLbl}>{isAr ? "عروض حقيقية" : "Listings"}</Text>
                  </View>
                  <View style={s.intelItem}>
                    <Text style={s.intelVal}>{formatPrice(districtInfo.medianPrice)}</Text>
                    <Text style={s.intelLbl}>{isAr ? "متوسط السعر" : "Median Price"}</Text>
                  </View>
                  <View style={s.intelItem}>
                    <Text style={s.intelVal}>{districtInfo.medianPricePerSqm.toLocaleString()} ر.س/م²</Text>
                    <Text style={s.intelLbl}>{isAr ? "سعر المتر" : "Price/m²"}</Text>
                  </View>
                </View>

                <Pressable
                  style={s.aiPromptBtn}
                  onPress={() => router.push({ pathname: "/(tabs)/ai-concierge", params: { q: `احسب لي متوسط الأسعار والاستثمار في ${districtInfo.city}` } })}
                >
                  <MaterialIcons name="smart-toy" size={16} color={NAVY} />
                  <Text style={s.aiPromptText}>{isAr ? "استفسر من الذكاء الاصطناعي عن هذه المنطقة" : "Ask AI Concierge about this area"}</Text>
                </Pressable>
              </View>
            )}

            {/* Property Cards List */}
            <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
              {loading ? (
                <ActivityIndicator size="large" color={GOLD} style={{ marginVertical: 30 }} />
              ) : properties.length === 0 ? (
                <Text style={s.emptyMsg}>{isAr ? "لا توجد عقارات مطابقة لنطاق الخريطة" : "No listings in this map area"}</Text>
              ) : (
                properties.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setSelectedProperty(p);
                      router.push(`/property/${p.id}`);
                    }}
                    style={[s.propCard, selectedProperty?.id === p.id && s.propCardSelected]}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Text style={s.propTitle}>{p.city} — {p.district}</Text>
                      <Text style={s.propPrice}>{formatPrice(p.price)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                      <Text style={s.propSub}>{p.type} • {p.area} م²</Text>
                      {p.bedrooms && <Text style={s.propSub}>{p.bedrooms} غرف</Text>}
                      {p.badge && <Text style={s.propBadge}>{p.badge}</Text>}
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Right Side: Interactive Leaflet Map View */}
        {(isDesktop || viewMode === "map") && (
          <View style={{ flex: 1, position: "relative" }}>
            
            {/* Map Canvas */}
            <HeatmapMapView properties={properties} isAr={isAr} />

            {/* Floating "Search This Area" Action Button */}
            <View style={s.floatingBar}>
              <Pressable style={s.searchAreaBtn} onPress={fetchMapData}>
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={s.searchAreaText}>{isAr ? "إعادة البحث في هذه المنطقة" : "Search this area"}</Text>
              </Pressable>
            </View>

            {/* Heatmap Active Legend Overlay */}
            <View style={s.legendOverlay}>
              <Text style={s.legendTitle}>
                {METRICS.find((m) => m.key === activeMetric)?.[isAr ? "labelAr" : "labelEn"]}
              </Text>
              <View style={s.gradientBar} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={s.legendLbl}>{isAr ? "منخفض" : "Low"}</Text>
                <Text style={s.legendLbl}>{isAr ? "مرتفع" : "High"}</Text>
              </View>
            </View>

          </View>
        )}

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: NAVY, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:    { fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },

  toggleGroup:  { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 2 },
  toggleBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: GOLD },

  controlsContainer: {
    backgroundColor: NAVY, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },

  cityChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  cityChipActive:     { backgroundColor: GOLD, borderColor: GOLD },
  cityChipText:       { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  cityChipTextActive: { color: NAVY, fontFamily: "Inter_700Bold" },

  metricChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)",
  },
  metricChipActive:   { backgroundColor: GOLD, borderColor: GOLD },
  metricText:         { fontSize: 11, fontFamily: "Inter_600SemiBold", color: GOLD },
  metricTextActive:   { color: NAVY },

  sidePanel: {
    backgroundColor: "#0f2040", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.1)",
  },

  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)", margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 13, fontFamily: "Inter_400Regular" },

  intelBox: {
    backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 12, marginBottom: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(201,168,76,0.2)", gap: 10,
  },
  intelTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: GOLD },
  intelBadge: { fontSize: 10, backgroundColor: "rgba(201,168,76,0.2)", color: GOLD, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  intelGrid:  { flexDirection: "row", justifyContent: "space-between" },
  intelItem:  { alignItems: "center" },
  intelVal:   { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  intelLbl:   { fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },

  aiPromptBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: GOLD, paddingVertical: 8, borderRadius: 8, marginTop: 4,
  },
  aiPromptText: { fontSize: 11, fontFamily: "Inter_700Bold", color: NAVY },

  propCard: {
    backgroundColor: "rgba(255,255,255,0.06)", padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  propCardSelected: { borderColor: GOLD, backgroundColor: "rgba(201,168,76,0.12)" },
  propTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  propPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: GOLD },
  propSub:   { fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },
  propBadge: { fontSize: 10, color: "#22c55e", backgroundColor: "rgba(34,197,94,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  emptyMsg:  { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", marginVertical: 20 },

  floatingBar: {
    position: "absolute", top: 16, alignSelf: "center", zIndex: 10,
  },
  searchAreaBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: NAVY, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: GOLD, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  searchAreaText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  legendOverlay: {
    position: "absolute", bottom: 20, right: 20,
    backgroundColor: "rgba(15,32,64,0.9)", padding: 10, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", width: 140, gap: 4, zIndex: 10,
  },
  legendTitle: { fontSize: 10, color: GOLD, fontFamily: "Inter_700Bold", textAlign: "center" },
  gradientBar: { height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  legendLbl:   { fontSize: 9, color: "rgba(255,255,255,0.6)" },
});
