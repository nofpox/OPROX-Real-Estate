import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice, MOCK_LISTINGS, type Listing } from "@/constants/mockListings";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const W    = Dimensions.get("window").width;

// ── API fetch ─────────────────────────────────────────────────────────────────
async function fetchListings(): Promise<Listing[]> {
  try {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return MOCK_LISTINGS;
    const res = await fetch(`https://${domain}/realestate-api/listings?status=active&limit=50`);
    if (!res.ok) return MOCK_LISTINGS;
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.listings ?? json.data ?? []);
    if (!items.length) return MOCK_LISTINGS;
    return items.map((l: Record<string, unknown>) => ({
      id:       String(l.id ?? l._id),
      titleAr:  String(l.title_ar ?? l.title ?? l.titleAr ?? ""),
      titleEn:  String(l.title_en ?? l.titleEn ?? l.title ?? ""),
      type:     String(l.property_type ?? l.type ?? "apartment") as Listing["type"],
      status:   String(l.listing_type ?? l.status ?? "sale") === "rent" ? "rent" : "sale",
      price:    Number(l.price ?? 0),
      currency: "SAR",
      city:     String(l.city ?? "الرياض"),
      district: String(l.district ?? l.neighborhood ?? ""),
      beds:     l.bedrooms != null ? Number(l.bedrooms) : undefined,
      baths:    l.bathrooms != null ? Number(l.bathrooms) : undefined,
      area:     l.area_sqm != null ? Number(l.area_sqm) : undefined,
      lat:      Number(l.lat ?? l.latitude ?? 24.7136),
      lng:      Number(l.lng ?? l.longitude ?? 46.6753),
      image:    String(l.main_image ?? l.image ?? MOCK_LISTINGS[0].image),
      featured: Boolean(l.featured),
      agentName:  String(l.agent_name ?? "وكيل HousIn"),
      agentPhone: String(l.agent_phone ?? "0500000000"),
      description: String(l.description ?? ""),
      listedAt:   String(l.created_at ?? l.listedAt ?? "2026-01-01"),
    })) as Listing[];
  } catch {
    return MOCK_LISTINGS;
  }
}

// ── Property card ─────────────────────────────────────────────────────────────
function PropCard({ listing, isAr }: { listing: Listing; isAr: boolean }) {
  const { t }               = useLocale();
  const { isFavorite, toggleFavorite } = useApp();
  const title               = isAr ? listing.titleAr : listing.titleEn;
  const isFav               = isFavorite(listing.id);

  return (
    <Pressable
      style={s.card}
      onPress={() => router.push(`/property/${listing.id}` as never)}
    >
      <View style={s.cardImgWrap}>
        <Image source={{ uri: listing.image }} style={s.cardImg} resizeMode="cover" />
        {listing.featured && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{t.prop.featured}</Text>
          </View>
        )}
        <Pressable
          style={s.heartBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            toggleFavorite(listing.id);
          }}
        >
          <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={22} color={isFav ? "#e53e3e" : "#fff"} />
        </Pressable>
      </View>

      <View style={s.cardBody}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.cardStatus}>
            {listing.status === "sale" ? t.prop.forSale : t.prop.forRent}
          </Text>
          <Text style={s.cardCity}>{listing.city}</Text>
        </View>
        <Text style={s.cardTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.cardPrice}>
          {formatPrice(listing.price, isAr)} {isAr ? "ر.س" : "SAR"}
          {listing.status === "rent" && (isAr ? "/سنة" : "/yr")}
        </Text>
        <View style={s.row}>
          {listing.beds   && <Tag icon="hotel"       label={t.prop.beds(listing.beds)} />}
          {listing.baths  && <Tag icon="bathtub"     label={t.prop.baths(listing.baths)} />}
          {listing.area   && <Tag icon="square-foot" label={t.prop.sqm(listing.area)} />}
        </View>
      </View>
    </Pressable>
  );
}

function Tag({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.tag}>
      <MaterialIcons name={icon as never} size={13} color={NAVY} />
      <Text style={s.tagText}>{label}</Text>
    </View>
  );
}

// ── City pill ─────────────────────────────────────────────────────────────────
const CITIES = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر"];
const CITIES_EN = ["Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah", "Al-Khobar"];

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { t, isAr } = useLocale();
  const insets       = useSafeAreaInsets();
  const [listings, setListings]       = useState<Listing[]>(MOCK_LISTINGS);
  const [activeTab, setActiveTab]     = useState<"sale" | "rent">("sale");
  const [query, setQuery]             = useState("");
  const fadeAnim                      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchListings().then(setListings);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const featured = listings.filter((l) => l.featured && l.status === activeTab).slice(0, 5);
  const rest     = listings.filter((l) => !l.featured && l.status === activeTab).slice(0, 6);

  const onSearch = () => {
    if (query.trim()) {
      router.push({ pathname: "/(tabs)/add", params: { q: query } } as never);
    } else {
      router.push("/(tabs)/add" as never);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ── */}
        <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
          <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
            <View style={{ backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Image
                source={require("@/assets/images/housin-logo.png")}
                style={{ width: 90, height: 30 }}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={s.heroTitle}>{t.home.hero}</Text>
          <Text style={s.heroSub}>{t.home.sub}</Text>

          {/* Buy / Rent */}
          <View style={s.tabs}>
            {(["sale", "rent"] as const).map((tab) => (
              <Pressable
                key={tab}
                style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.tabBtnText, activeTab === tab && s.tabBtnTextActive]}>
                  {tab === "sale" ? t.home.tabBuy : t.home.tabRent}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Search bar */}
          <View style={s.searchRow}>
            <View style={[s.searchBar, { flexDirection: isAr ? "row-reverse" : "row" }]}>
              <MaterialIcons name="search" size={20} color={NAVY} style={{ opacity: 0.5 }} />
              <TextInput
                style={[s.searchInput, { textAlign: isAr ? "right" : "left" }]}
                placeholder={t.home.searchPlaceholder}
                placeholderTextColor="rgba(15,32,64,0.4)"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={onSearch}
                returnKeyType="search"
              />
            </View>
            <Pressable style={s.searchBtn} onPress={onSearch}>
              <MaterialIcons name="search" size={20} color={NAVY} />
            </Pressable>
          </View>
        </View>

        {/* ── Featured ── */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={[s.sectionHeader, { flexDirection: isAr ? "row-reverse" : "row" }]}>
            <Text style={s.sectionTitle}>{t.home.featured}</Text>
            <Pressable onPress={() => router.push("/(tabs)/add" as never)}>
              <Text style={s.viewAll}>{t.home.viewAll}</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cardScroll}>
            {featured.map((l) => (
              <View key={l.id} style={{ width: W * 0.72, marginRight: 12 }}>
                <PropCard listing={l} isAr={isAr} />
              </View>
            ))}
          </ScrollView>

          {/* ── Cities ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t.home.cities}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cardScroll}>
            {CITIES.map((city, i) => (
              <Pressable
                key={city}
                style={s.cityPill}
                onPress={() => router.push({ pathname: "/(tabs)/add", params: { city } } as never)}
              >
                <Text style={s.cityIcon}>🏙️</Text>
                <Text style={s.cityLabel}>{isAr ? city : CITIES_EN[i]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* ── More properties ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{isAr ? "عقارات أخرى" : "More Properties"}</Text>
          </View>
          <View style={s.gridWrap}>
            {rest.map((l) => (
              <View key={l.id} style={{ width: (W - 48) / 2 }}>
                <SmallCard listing={l} isAr={isAr} />
              </View>
            ))}
          </View>

          {/* ── Estimate Banner ── */}
          <Pressable
            style={s.estimateBanner}
            onPress={() => router.push("/valuation" as never)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.estimateTitle}>{t.home.estimate}</Text>
              <Text style={s.estimateDesc}>{t.home.estimateDesc}</Text>
              <Text style={s.estimateCta}>{t.home.estimateCta} ←</Text>
            </View>
            <Text style={{ fontSize: 48 }}>🏡</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SmallCard({ listing, isAr }: { listing: Listing; isAr: boolean }) {
  const { t }                          = useLocale();
  const { isFavorite, toggleFavorite } = useApp();
  const isFav                          = isFavorite(listing.id);
  const title                          = isAr ? listing.titleAr : listing.titleEn;

  return (
    <Pressable style={s.smallCard} onPress={() => router.push(`/property/${listing.id}` as never)}>
      <Image source={{ uri: listing.image }} style={s.smallImg} resizeMode="cover" />
      <Pressable
        style={s.smallHeart}
        onPress={() => toggleFavorite(listing.id)}
      >
        <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={18} color={isFav ? "#e53e3e" : "#fff"} />
      </Pressable>
      <View style={s.smallBody}>
        <Text style={s.smallTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.smallPrice}>{formatPrice(listing.price, isAr)} {isAr ? "ر.س" : "SAR"}</Text>
        {listing.beds != null && (
          <Text style={s.smallMeta}>{t.prop.beds(listing.beds)}</Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  hero:          { backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  logo:          { fontSize: 28, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 1 },
  logoSub:       { fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  heroTitle:     { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 8 },
  heroSub:       { fontSize: 13, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular" },

  tabs:          { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 3, gap: 2 },
  tabBtn:        { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive:  { backgroundColor: GOLD },
  tabBtnText:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },
  tabBtnTextActive: { color: NAVY },

  searchRow:     { flexDirection: "row", gap: 8 },
  searchBar:     { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, alignItems: "center", gap: 8, height: 48 },
  searchInput:   { flex: 1, fontSize: 14, color: NAVY, fontFamily: "Inter_400Regular" },
  searchBtn:     { width: 48, height: 48, backgroundColor: GOLD, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  sectionTitle:  { fontSize: 18, fontFamily: "Inter_700Bold", color: NAVY },
  viewAll:       { fontSize: 13, color: GOLD, fontFamily: "Inter_600SemiBold" },

  cardScroll:    { paddingHorizontal: 20 },
  card:          { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, marginBottom: 2 },
  cardImgWrap:   { position: "relative" },
  cardImg:       { width: "100%", height: 180 },
  badge:         { position: "absolute", top: 10, left: 10, backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { fontSize: 11, fontFamily: "Inter_700Bold", color: NAVY },
  heartBtn:      { position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  cardBody:      { padding: 14, gap: 6 },
  cardStatus:    { fontSize: 11, fontFamily: "Inter_600SemiBold", color: GOLD, backgroundColor: "rgba(201,168,76,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  cardCity:      { fontSize: 11, color: "rgba(15,32,64,0.5)", fontFamily: "Inter_400Regular" },
  cardTitle:     { fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY },
  cardPrice:     { fontSize: 17, fontFamily: "Inter_700Bold", color: GOLD },
  row:           { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag:           { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f0f4f8", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagText:       { fontSize: 11, color: NAVY, fontFamily: "Inter_400Regular" },

  cityPill:      { alignItems: "center", gap: 6, marginRight: 12, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cityIcon:      { fontSize: 22 },
  cityLabel:     { fontSize: 12, fontFamily: "Inter_600SemiBold", color: NAVY },

  gridWrap:      { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12 },
  smallCard:     { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  smallImg:      { width: "100%", height: 120 },
  smallHeart:    { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  smallBody:     { padding: 10, gap: 3 },
  smallTitle:    { fontSize: 12, fontFamily: "Inter_600SemiBold", color: NAVY },
  smallPrice:    { fontSize: 13, fontFamily: "Inter_700Bold", color: GOLD },
  smallMeta:     { fontSize: 11, color: "rgba(15,32,64,0.5)" },

  estimateBanner: { margin: 20, backgroundColor: NAVY, borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  estimateTitle:  { fontSize: 16, fontFamily: "Inter_700Bold", color: GOLD, marginBottom: 4 },
  estimateDesc:   { fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 18, marginBottom: 8 },
  estimateCta:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GOLD },
});
