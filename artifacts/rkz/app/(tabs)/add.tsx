/**
 * add.tsx — Map-First Property Search
 * الخريطة تظهر مباشرة، العقارات كـ price pins.
 * يمكن الضغط على pin لتظهر بطاقة العقار في الأسفل.
 * زر قائمة للتبديل بين الخريطة والقائمة.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import PropertyMapWebView, { type MapListing } from "@/components/PropertyMapWebView";
import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice, MOCK_LISTINGS, type Listing } from "@/constants/mockListings";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const W    = Dimensions.get("window").width;

const TYPES = ["all", "villa", "apartment", "land", "commercial"] as const;
type TypeFilter = typeof TYPES[number];

// ── Convert Listing → MapListing ────────────────────────────────────────────
function toMapListing(l: Listing): MapListing {
  return {
    id:       l.id,
    type:     l.type,
    city:     l.city,
    district: l.district,
    price:    l.price,
    area:     l.area ?? 0,
    bedrooms: l.beds,
    badge:    l.featured ? "★" : undefined,
  };
}

// ── Fetch listings ────────────────────────────────────────────────────────────
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
      id:          String(l.id ?? l._id),
      titleAr:     String(l.title_ar ?? l.titleAr ?? l.title ?? ""),
      titleEn:     String(l.title_en ?? l.titleEn ?? l.title ?? ""),
      type:        String(l.property_type ?? l.type ?? "apartment") as Listing["type"],
      status:      String(l.listing_type ?? l.status ?? "sale") === "rent" ? "rent" : "sale",
      price:       Number(l.price ?? 0),
      currency:    "SAR",
      city:        String(l.city ?? "الرياض"),
      district:    String(l.district ?? l.neighborhood ?? ""),
      beds:        l.bedrooms != null ? Number(l.bedrooms) : undefined,
      baths:       l.bathrooms != null ? Number(l.bathrooms) : undefined,
      area:        l.area_sqm != null ? Number(l.area_sqm) : undefined,
      lat:         Number(l.lat ?? 24.7136),
      lng:         Number(l.lng ?? 46.6753),
      image:       String(l.main_image ?? l.image ?? MOCK_LISTINGS[0].image),
      featured:    Boolean(l.featured),
      agentName:   String(l.agent_name ?? "وكيل OPROX"),
      agentPhone:  String(l.agent_phone ?? "0500000000"),
      description: String(l.description ?? ""),
      listedAt:    String(l.created_at ?? l.listedAt ?? ""),
    })) as Listing[];
  } catch {
    return MOCK_LISTINGS;
  }
}

// ── Type icon map ─────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, string> = {
  all: "🏘️", villa: "🏡", apartment: "🏢", land: "🌿", commercial: "🏪",
};

// ── Small property card (bottom sheet) ───────────────────────────────────────
function SelectedCard({
  listing,
  isAr,
  t,
  onClose,
  isFav,
  onFav,
}: {
  listing: Listing;
  isAr: boolean;
  t: ReturnType<typeof useLocale>["t"];
  onClose: () => void;
  isFav: boolean;
  onFav: () => void;
}) {
  return (
    <Pressable
      style={s.selectedCard}
      onPress={() => router.push(`/property/${listing.id}` as never)}
    >
      {/* Close */}
      <Pressable style={s.closeBtn} onPress={onClose}>
        <MaterialIcons name="close" size={18} color={NAVY} />
      </Pressable>

      <View style={[s.cardInner, isAr && { flexDirection: "row-reverse" }]}>
        <Image source={{ uri: listing.image }} style={s.cardImg} resizeMode="cover" />
        <View style={s.cardBody}>
          <View style={[s.cardRow, isAr && { flexDirection: "row-reverse" }]}>
            <View style={[s.badge, { backgroundColor: listing.status === "sale" ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)" }]}>
              <Text style={[s.badgeTxt, { color: listing.status === "sale" ? "#16a34a" : "#3b82f6" }]}>
                {listing.status === "sale" ? t.prop.forSale : t.prop.forRent}
              </Text>
            </View>
            <Text style={s.citySmall}>{listing.city}</Text>
          </View>
          <Text style={[s.cardTitle, isAr && { textAlign: "right" }]} numberOfLines={2}>
            {isAr ? listing.titleAr : listing.titleEn}
          </Text>
          <Text style={s.cardPrice}>
            {formatPrice(listing.price, isAr)} {isAr ? "ر.س" : "SAR"}
          </Text>
          <View style={[s.cardRow, isAr && { flexDirection: "row-reverse" }]}>
            {listing.beds  && <Chip label={t.prop.beds(listing.beds)} />}
            {listing.baths && <Chip label={t.prop.baths(listing.baths)} />}
            {listing.area  && <Chip label={t.prop.sqm(listing.area)} />}
          </View>
        </View>
        {/* Fav */}
        <Pressable style={s.favBtn} onPress={onFav}>
          <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={20} color={isFav ? "#e53e3e" : "rgba(15,32,64,0.3)"} />
        </Pressable>
      </View>

      {/* CTA */}
      <View style={s.ctaRow}>
        <MaterialIcons name="arrow-forward" size={14} color={GOLD} />
        <Text style={s.ctaTxt}>{t.prop.viewDetails}</Text>
      </View>
    </Pressable>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipTxt}>{label}</Text>
    </View>
  );
}

// ── List-view card ────────────────────────────────────────────────────────────
function ListCard({ item, isAr, t, isFav, onFav }: { item: Listing; isAr: boolean; t: ReturnType<typeof useLocale>["t"]; isFav: boolean; onFav: () => void }) {
  return (
    <Pressable style={s.listCard} onPress={() => router.push(`/property/${item.id}` as never)}>
      <Image source={{ uri: item.image }} style={s.listImg} resizeMode="cover" />
      <Pressable style={s.listHeart} onPress={onFav}>
        <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={18} color={isFav ? "#e53e3e" : "#fff"} />
      </Pressable>
      <View style={s.listBody}>
        <View style={[s.cardRow, isAr && { flexDirection: "row-reverse" }]}>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{item.status === "sale" ? t.prop.forSale : t.prop.forRent}</Text>
          </View>
          <Text style={s.citySmall}>{item.city}</Text>
        </View>
        <Text style={[s.cardTitle, isAr && { textAlign: "right" }]} numberOfLines={1}>
          {isAr ? item.titleAr : item.titleEn}
        </Text>
        <Text style={s.cardPrice}>{formatPrice(item.price, isAr)} {isAr ? "ر.س" : "SAR"}</Text>
        <View style={[s.cardRow, isAr && { flexDirection: "row-reverse" }]}>
          {item.beds  && <Chip label={t.prop.beds(item.beds)} />}
          {item.baths && <Chip label={t.prop.baths(item.baths)} />}
          {item.area  && <Chip label={t.prop.sqm(item.area)} />}
        </View>
      </View>
    </Pressable>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const { t, isAr }                    = useLocale();
  const { isFavorite, toggleFavorite } = useApp();
  const insets                         = useSafeAreaInsets();
  const params                         = useLocalSearchParams<{ q?: string; city?: string }>();

  const [all, setAll]         = useState<Listing[]>(MOCK_LISTINGS);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState(params.q ?? "");
  const [status, setStatus]   = useState<"sale" | "rent">("sale");
  const [typeF, setTypeF]     = useState<TypeFilter>("all");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Slide-up animation for selected card
  const cardY = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    fetchListings().then((data) => { setAll(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (params.city) setQuery(params.city);
  }, [params.city]);

  const filtered = useMemo(() => {
    let res = all.filter((l) => l.status === status);
    if (typeF !== "all") res = res.filter((l) => l.type === typeF);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      res = res.filter((l) =>
        l.titleAr.includes(q) || l.titleEn.toLowerCase().includes(q) ||
        l.city.includes(q)    || l.district.includes(q),
      );
    }
    return res;
  }, [all, status, typeF, query]);

  const mapListings: MapListing[] = useMemo(() => filtered.map(toMapListing), [filtered]);

  const selectedListing = useMemo(
    () => selectedId ? all.find((l) => l.id === selectedId) ?? null : null,
    [selectedId, all],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    Animated.spring(cardY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
  }, [cardY]);

  const handleDeselect = useCallback(() => {
    Animated.timing(cardY, { toValue: 200, useNativeDriver: true, duration: 200 }).start(() => setSelectedId(null));
  }, [cardY]);

  const headerTop = insets.top + 8;

  // Type filter pills labels
  const typeLabels: Record<TypeFilter, string> = {
    all:        t.search.filter.all,
    villa:      t.search.filter.villa,
    apartment:  t.search.filter.apartment,
    land:       t.search.filter.land,
    commercial: t.search.filter.commercial,
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── MAP VIEW ── */}
      {viewMode === "map" && (
        <>
          {/* Full-screen map — absoluteFill, no overflow:hidden */}
          {loading ? (
            <View style={[StyleSheet.absoluteFill, s.loadingBox]}>
              <ActivityIndicator color={GOLD} size="large" />
            </View>
          ) : (
            <PropertyMapWebView
              listings={mapListings}
              activeFilter={typeF}
              onSelect={handleSelect}
              onDeselect={handleDeselect}
            />
          )}

          {/* Overlay header — sibling of map, pointerEvents box-none on wrapper */}
          <View style={[s.overlay, { top: 0 }]} pointerEvents="box-none">
            <View style={[s.headerCard, { paddingTop: headerTop }]}>
              {/* Search row */}
              <View style={[s.searchRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[s.searchBar, isAr && { flexDirection: "row-reverse" }]}>
                  <MaterialIcons name="search" size={18} color="rgba(15,32,64,0.45)" />
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
                      <MaterialIcons name="close" size={16} color="rgba(15,32,64,0.4)" />
                    </Pressable>
                  )}
                </View>
                {/* List toggle */}
                <Pressable style={s.modeBtn} onPress={() => { setViewMode("list"); setSelectedId(null); }}>
                  <MaterialIcons name="format-list-bulleted" size={20} color={NAVY} />
                </Pressable>
              </View>

              {/* Status pills */}
              <View style={[s.pillsRow, isAr && { flexDirection: "row-reverse" }]}>
                {(["sale", "rent"] as const).map((v) => (
                  <Pressable
                    key={v}
                    style={[s.statusPill, status === v && s.statusPillActive]}
                    onPress={() => setStatus(v)}
                  >
                    <Text style={[s.statusTxt, status === v && s.statusTxtActive]}>
                      {v === "sale" ? t.search.forSale : t.search.forRent}
                    </Text>
                  </Pressable>
                ))}
                <View style={s.divider} />
                {/* Type pills */}
                {TYPES.map((tp) => (
                  <Pressable
                    key={tp}
                    style={[s.typePill, typeF === tp && s.typePillActive]}
                    onPress={() => setTypeF(tp)}
                  >
                    <Text style={s.typeEmoji}>{TYPE_ICONS[tp]}</Text>
                    <Text style={[s.typeTxt, typeF === tp && s.typeTxtActive]}>{typeLabels[tp]}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Count */}
              <Text style={[s.countTxt, isAr && { textAlign: "right" }]}>
                {t.search.results(filtered.length)}
              </Text>
            </View>
          </View>

          {/* Selected listing card — slides up from bottom */}
          {selectedListing && (
            <Animated.View
              style={[s.bottomCard, { transform: [{ translateY: cardY }] }]}
              pointerEvents="box-none"
            >
              <SelectedCard
                listing={selectedListing}
                isAr={isAr}
                t={t}
                onClose={handleDeselect}
                isFav={isFavorite(selectedListing.id)}
                onFav={() => toggleFavorite(selectedListing.id)}
              />
            </Animated.View>
          )}
        </>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
          {/* List header */}
          <View style={[s.listHeader, { paddingTop: headerTop }]}>
            <View style={[s.searchRow, isAr && { flexDirection: "row-reverse" }]}>
              <View style={[s.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }, isAr && { flexDirection: "row-reverse" }]}>
                <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.6)" />
                <TextInput
                  style={[s.searchInput, { color: "#fff" }, { textAlign: isAr ? "right" : "left" }]}
                  placeholder={t.search.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
              {/* Map toggle */}
              <Pressable style={[s.modeBtn, { backgroundColor: GOLD }]} onPress={() => setViewMode("map")}>
                <MaterialIcons name="map" size={20} color={NAVY} />
              </Pressable>
            </View>
            {/* Status + type */}
            <View style={[s.pillsRow, isAr && { flexDirection: "row-reverse" }, { flexWrap: "wrap" }]}>
              {(["sale", "rent"] as const).map((v) => (
                <Pressable key={v} style={[s.statusPill, status === v && s.statusPillActive]} onPress={() => setStatus(v)}>
                  <Text style={[s.statusTxt, status === v && s.statusTxtActive]}>
                    {v === "sale" ? t.search.forSale : t.search.forRent}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Results */}
          {loading ? (
            <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={s.emptyTitle}>{t.search.noResults}</Text>
              <Text style={s.emptyHint}>{t.search.noResultsHint}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ListCard
                  item={item}
                  isAr={isAr}
                  t={t}
                  isFav={isFavorite(item.id)}
                  onFav={() => toggleFavorite(item.id)}
                />
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8e8e8" },

  loadingBox: { alignItems: "center", justifyContent: "center", backgroundColor: "#d4d4d4" },

  // Overlay container — covers full screen but passes touches to map
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0 },

  // Header card floating over map
  headerCard: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 18,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  searchRow:  { flexDirection: "row", gap: 8, alignItems: "center" },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12, paddingHorizontal: 10, height: 40, gap: 6,
    borderWidth: 1, borderColor: "rgba(15,32,64,0.12)",
  },
  searchInput: { flex: 1, fontSize: 13, color: NAVY, fontFamily: "Inter_400Regular", backgroundColor: "transparent", outlineStyle: "none" } as any,

  modeBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(15,32,64,0.08)",
    alignItems: "center", justifyContent: "center",
  },

  pillsRow: { flexDirection: "row", flexWrap: "nowrap", gap: 6, alignItems: "center" },

  statusPill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(15,32,64,0.2)",
    backgroundColor: "transparent",
  },
  statusPillActive: { backgroundColor: NAVY, borderColor: NAVY },
  statusTxt:        { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(15,32,64,0.6)" },
  statusTxtActive:  { color: "#fff" },

  divider: { width: 1, height: 20, backgroundColor: "rgba(15,32,64,0.12)", marginHorizontal: 2 },

  typePill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(15,32,64,0.12)",
    backgroundColor: "transparent",
  },
  typePillActive: { backgroundColor: "rgba(201,168,76,0.12)", borderColor: GOLD },
  typeEmoji: { fontSize: 12 },
  typeTxt:   { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(15,32,64,0.6)" },
  typeTxtActive: { color: GOLD, fontFamily: "Inter_700Bold" },

  countTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.4)" },

  // Selected card
  bottomCard: {
    position: "absolute",
    bottom: 88, // above tab bar
    left: 12,
    right: 12,
  },
  selectedCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    padding: 12,
    gap: 8,
  },
  closeBtn: {
    position: "absolute", top: 10, right: 10, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(15,32,64,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  cardInner: { flexDirection: "row", gap: 10 },
  cardImg:   { width: 90, height: 80, borderRadius: 12 },
  cardBody:  { flex: 1, gap: 4 },
  cardRow:   { flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" },
  badge:     { backgroundColor: "rgba(201,168,76,0.12)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:  { fontSize: 10, fontFamily: "Inter_600SemiBold", color: GOLD },
  citySmall: { fontSize: 10, color: "rgba(15,32,64,0.4)", fontFamily: "Inter_400Regular" },
  cardTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: NAVY },
  cardPrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: GOLD },
  chip:      { backgroundColor: "#f0f4f8", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  chipTxt:   { fontSize: 10, color: NAVY, fontFamily: "Inter_400Regular" },
  favBtn:    { padding: 4, alignSelf: "flex-start" },
  ctaRow:    { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" },
  ctaTxt:    { fontSize: 12, fontFamily: "Inter_600SemiBold", color: GOLD },

  // List header
  listHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },

  // List card
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  listImg:   { width: W * 0.34, height: 115 },
  listHeart: {
    position: "absolute", top: 8, left: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  listBody: { flex: 1, padding: 10, gap: 5 },

  emptyBox:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle:{ fontSize: 18, fontFamily: "Inter_700Bold", color: NAVY },
  emptyHint: { fontSize: 14, color: "rgba(15,32,64,0.5)", textAlign: "center" },
});
