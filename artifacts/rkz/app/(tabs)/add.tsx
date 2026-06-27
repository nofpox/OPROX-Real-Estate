// Search screen — replaces old "Add listing" tab
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
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

const TYPES = ["all", "villa", "apartment", "land", "commercial"] as const;
type TypeFilter = typeof TYPES[number];

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
      id: String(l.id ?? l._id),
      titleAr: String(l.title_ar ?? l.titleAr ?? l.title ?? ""),
      titleEn: String(l.title_en ?? l.titleEn ?? l.title ?? ""),
      type: String(l.property_type ?? l.type ?? "apartment") as Listing["type"],
      status: String(l.listing_type ?? l.status ?? "sale") === "rent" ? "rent" : "sale",
      price: Number(l.price ?? 0),
      currency: "SAR",
      city: String(l.city ?? "الرياض"),
      district: String(l.district ?? l.neighborhood ?? ""),
      beds: l.bedrooms != null ? Number(l.bedrooms) : undefined,
      baths: l.bathrooms != null ? Number(l.bathrooms) : undefined,
      area: l.area_sqm != null ? Number(l.area_sqm) : undefined,
      lat: Number(l.lat ?? 24.7136),
      lng: Number(l.lng ?? 46.6753),
      image: String(l.main_image ?? l.image ?? MOCK_LISTINGS[0].image),
      featured: Boolean(l.featured),
      agentName: String(l.agent_name ?? "وكيل روزوز"),
      agentPhone: String(l.agent_phone ?? "0500000000"),
      description: String(l.description ?? ""),
      listedAt: String(l.created_at ?? l.listedAt ?? ""),
    })) as Listing[];
  } catch {
    return MOCK_LISTINGS;
  }
}

export default function SearchScreen() {
  const { t, isAr }                    = useLocale();
  const { isFavorite, toggleFavorite } = useApp();
  const insets                         = useSafeAreaInsets();
  const params                         = useLocalSearchParams<{ q?: string; city?: string }>();

  const [all, setAll]           = useState<Listing[]>(MOCK_LISTINGS);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState(params.q ?? "");
  const [status, setStatus]     = useState<"sale" | "rent">("sale");
  const [typeF, setTypeF]       = useState<TypeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const filtersH                = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchListings().then((data) => { setAll(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (params.city) setQuery(params.city);
  }, [params.city]);

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    Animated.timing(filtersH, { toValue, duration: 220, useNativeDriver: false }).start();
  };

  const filtered = useMemo(() => {
    let res = all.filter((l) => l.status === status);
    if (typeF !== "all") res = res.filter((l) => l.type === typeF);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      res = res.filter((l) =>
        l.titleAr.includes(q) || l.titleEn.toLowerCase().includes(q) ||
        l.city.includes(q) || l.district.includes(q),
      );
    }
    return res;
  }, [all, status, typeF, query]);

  const renderItem = ({ item }: { item: Listing }) => {
    const isFav = isFavorite(item.id);
    const title = isAr ? item.titleAr : item.titleEn;
    return (
      <Pressable style={s.card} onPress={() => router.push(`/property/${item.id}` as never)}>
        <Image source={{ uri: item.image }} style={s.img} resizeMode="cover" />
        <Pressable style={s.heartBtn} onPress={() => toggleFavorite(item.id)}>
          <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={20} color={isFav ? "#e53e3e" : "#fff"} />
        </Pressable>
        <View style={s.body}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={s.statusBadge}>
              <Text style={s.statusText}>{item.status === "sale" ? t.prop.forSale : t.prop.forRent}</Text>
            </View>
            <Text style={s.cityText}>{item.city}</Text>
          </View>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.price}>{formatPrice(item.price, isAr)} {isAr ? "ر.س" : "SAR"}{item.status === "rent" ? (isAr ? "/سنة" : "/yr") : ""}</Text>
          <View style={s.row}>
            {item.beds  && <Meta icon="hotel"       label={t.prop.beds(item.beds)} />}
            {item.baths && <Meta icon="bathtub"     label={t.prop.baths(item.baths)} />}
            {item.area  && <Meta icon="square-foot" label={t.prop.sqm(item.area)} />}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={s.headerTitle}>{t.search.title}</Text>

        {/* Search bar */}
        <View style={[s.searchRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
          <View style={[s.searchBar, { flexDirection: isAr ? "row-reverse" : "row" }]}>
            <MaterialIcons name="search" size={18} color="rgba(15,32,64,0.4)" />
            <TextInput
              style={[s.searchInput, { textAlign: isAr ? "right" : "left" }]}
              placeholder={t.search.placeholder}
              placeholderTextColor="rgba(15,32,64,0.4)"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <MaterialIcons name="close" size={18} color="rgba(15,32,64,0.4)" />
              </Pressable>
            )}
          </View>
          <Pressable style={s.filterBtn} onPress={toggleFilters}>
            <MaterialIcons name="tune" size={20} color={NAVY} />
          </Pressable>
        </View>

        {/* Buy / Rent */}
        <View style={s.statusRow}>
          {(["sale", "rent"] as const).map((v) => (
            <Pressable
              key={v}
              style={[s.statusPill, status === v && s.statusPillActive]}
              onPress={() => setStatus(v)}
            >
              <Text style={[s.statusPillText, status === v && s.statusPillTextActive]}>
                {v === "sale" ? t.search.forSale : t.search.forRent}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Type filters */}
        <Animated.View style={{ overflow: "hidden", maxHeight: filtersH.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) }}>
          <View style={s.typeRow}>
            {TYPES.map((type) => {
              const label = t.search.filter[type as keyof typeof t.search.filter] ?? type;
              return (
                <Pressable
                  key={type}
                  style={[s.typePill, typeF === type && s.typePillActive]}
                  onPress={() => setTypeF(type)}
                >
                  <Text style={[s.typePillText, typeF === type && s.typePillTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>

      {/* Results count */}
      <View style={[s.resultsRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
        <Text style={s.resultsText}>{t.search.results(filtered.length)}</Text>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTitle}>{t.search.noResults}</Text>
          <Text style={s.emptyHint}>{t.search.noResultsHint}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function Meta({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.meta}>
      <MaterialIcons name={icon as never} size={12} color={NAVY} />
      <Text style={s.metaText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { backgroundColor: NAVY, paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  searchRow:   { gap: 8 },
  searchBar:   { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 44, alignItems: "center", gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: NAVY, fontFamily: "Inter_400Regular" },
  filterBtn:   { width: 44, height: 44, backgroundColor: GOLD, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statusRow:   { flexDirection: "row", gap: 8 },
  statusPill:  { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  statusPillActive: { backgroundColor: GOLD, borderColor: GOLD },
  statusPillText:     { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },
  statusPillTextActive: { color: NAVY },
  typeRow:     { flexDirection: "row", gap: 8, paddingTop: 4 },
  typePill:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  typePillActive: { backgroundColor: "#fff" },
  typePillText:   { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  typePillTextActive: { color: NAVY, fontFamily: "Inter_600SemiBold" },
  resultsRow:  { paddingHorizontal: 16, paddingVertical: 10 },
  resultsText: { fontSize: 13, color: "rgba(15,32,64,0.55)", fontFamily: "Inter_400Regular" },
  card:        { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 3, flexDirection: "row" },
  img:         { width: W * 0.34, height: 120 },
  heartBtn:    { position: "absolute", top: 8, left: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  body:        { flex: 1, padding: 12, gap: 5 },
  row:         { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusBadge: { backgroundColor: "rgba(201,168,76,0.12)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText:  { fontSize: 10, fontFamily: "Inter_600SemiBold", color: GOLD },
  cityText:    { fontSize: 10, color: "rgba(15,32,64,0.45)", fontFamily: "Inter_400Regular" },
  title:       { fontSize: 13, fontFamily: "Inter_700Bold", color: NAVY },
  price:       { fontSize: 15, fontFamily: "Inter_700Bold", color: GOLD },
  meta:        { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f0f4f8", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  metaText:    { fontSize: 10, color: NAVY, fontFamily: "Inter_400Regular" },
  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyIcon:   { fontSize: 48 },
  emptyTitle:  { fontSize: 18, fontFamily: "Inter_700Bold", color: NAVY },
  emptyHint:   { fontSize: 14, color: "rgba(15,32,64,0.5)", textAlign: "center" },
});
