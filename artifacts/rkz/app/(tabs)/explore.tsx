/**
 * explore.tsx — Map-First Tourism & Booking
 * خانة بحث native في الأعلى فوق أيقونات الفئات.
 * الفلاتر داخل الخريطة (Overpass API).
 * شريط أفقي سفلي للفنادق والشقق.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TourismMapView, {
  SPOTS,
  type TourismMapHandle,
  type TourismSpot,
} from "@/components/TourismMapView";
import { useLocale } from "@/hooks/useLocale";
import { HOTEL_LISTINGS } from "@/constants/mockTourism";

const NAVY = "#0f2040";
const GOLD  = "#c9a84c";
const { width: SW } = Dimensions.get("window");
const CARD_W = SW * 0.70;

// ── Search item type ───────────────────────────────────────────────────────────
interface SearchItem {
  id:     string;
  nameAr: string;
  nameEn: string;
  cityAr: string;
  cityEn: string;
  lat:    number;
  lng:    number;
  kind:   "landmark" | "hotel";
  emoji:  string;
}

// ── Build combined search pool ─────────────────────────────────────────────────
const SEARCH_POOL: SearchItem[] = [
  ...SPOTS.map((s): SearchItem => ({
    id: s.id, nameAr: s.nameAr, nameEn: s.nameEn,
    cityAr: s.cityAr, cityEn: s.cityEn,
    lat: s.lat, lng: s.lng,
    kind: "landmark", emoji: s.emoji,
  })),
  ...HOTEL_LISTINGS.map((h): SearchItem => ({
    id: h.id, nameAr: h.nameAr, nameEn: h.nameEn,
    cityAr: h.city, cityEn: h.cityEn,
    lat: h.lat, lng: h.lng,
    kind: "hotel", emoji: h.type === "hotel" ? "🏨" : "🏠",
  })),
];

// ── Convert HotelListing → TourismSpot ────────────────────────────────────────
function hotelToSpot(h: (typeof HOTEL_LISTINGS)[0]): TourismSpot {
  return {
    id:       h.id,
    emoji:    h.type === "hotel" ? "🏨" : "🏠",
    nameAr:   h.nameAr,
    nameEn:   h.nameEn,
    cityAr:   h.city,
    cityEn:   h.cityEn,
    category: "entertainment",
    lat:      h.lat,
    lng:      h.lng,
    mapsUrl:  `https://maps.google.com/?q=${encodeURIComponent(h.nameEn)}`,
  };
}

// ── Hotel strip card ───────────────────────────────────────────────────────────
function HotelCard({
  item, isAr, bookNow, perNight, hotelType, aptType,
}: {
  item: (typeof HOTEL_LISTINGS)[0];
  isAr: boolean;
  bookNow: string;
  perNight: string;
  hotelType: string;
  aptType: string;
}) {
  const stars = "★".repeat(item.stars);
  const typeLabel = item.type === "hotel" ? hotelType : aptType;

  return (
    <Pressable
      style={s.hotelCard}
      onPress={() => router.push(`/hotel/${item.id}` as never)}
    >
      <Image source={{ uri: item.image }} style={s.hotelImg} />
      <View style={s.typeBadge}>
        <Text style={s.typeTxt}>{typeLabel}</Text>
      </View>
      <View style={s.hotelBody}>
        <Text style={s.hotelName} numberOfLines={1}>
          {isAr ? item.nameAr : item.nameEn}
        </Text>
        <View style={s.hotelRow}>
          <Text style={s.stars}>{stars}</Text>
          <Text style={s.ratingTxt}>★ {item.rating.toFixed(1)}</Text>
          <MaterialIcons name="location-on" size={11} color={GOLD} />
          <Text style={s.cityTxt}>{isAr ? item.city : item.cityEn}</Text>
        </View>
        <View style={s.hotelFooter}>
          <View>
            <Text style={s.priceNum}>
              {item.pricePerNight.toLocaleString()}
              <Text style={s.priceSub}> {isAr ? "ر.س" : "SAR"}</Text>
            </Text>
            <Text style={s.perNight}>{perNight}</Text>
          </View>
          <Pressable
            style={s.bookBtn}
            onPress={() => router.push(`/hotel/${item.id}` as never)}
          >
            <Text style={s.bookTxt}>{bookNow}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const SEARCH_BAR_H = 52; // height of the native search bar row

export default function TourismScreen() {
  const { t, isAr }  = useLocale();
  const insets        = useSafeAreaInsets();
  const tour          = t.tourism;
  const [stripOpen, setStripOpen] = useState(true);

  // ── search state ────────────────────────────────────────────────────────────
  const [query, setQuery]         = useState("");
  const [focused, setFocused]     = useState(false);
  const inputRef = useRef<TextInput>(null);
  const mapRef   = useRef<TourismMapHandle>(null);

  const results: SearchItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_POOL.filter(
      (item) =>
        item.nameAr.includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.cityAr.includes(q) ||
        item.cityEn.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const showDropdown = focused && results.length > 0;

  function selectResult(item: SearchItem) {
    setQuery(isAr ? item.nameAr : item.nameEn);
    setFocused(false);
    Keyboard.dismiss();
    // Fly the Leaflet map to the chosen location
    const zoom = item.kind === "hotel" ? 14 : 13;
    mapRef.current?.injectJavaScript(
      `window.__lmap && window.__lmap.flyTo([${item.lat}, ${item.lng}], ${zoom}, {animate:true, duration:1.2}); true;`,
    );
  }

  function clearSearch() {
    setQuery("");
    setFocused(false);
    Keyboard.dismiss();
  }

  // Spots to render as pins on the map
  const spots: TourismSpot[] = useMemo(
    () => HOTEL_LISTINGS.map(hotelToSpot),
    [],
  );

  // filterBarTopPx: below safe area + search bar
  const filterBarTopPx = insets.top + SEARCH_BAR_H + 8;

  const searchPlaceholder = isAr
    ? "ابحث عن مكان أو فندق…"
    : "Search for a place or hotel…";

  return (
    <View style={s.root}>
      {/* ── Full-screen tourism map ── */}
      <TourismMapView
        ref={mapRef}
        spots={spots}
        isAr={isAr}
        showTourismSpots
        initialZoom={6}
        filterBarTopPx={filterBarTopPx}
        hasTabs
      />

      {/* ── Native search bar — absolute, top ── */}
      <View
        style={[
          s.searchWrapper,
          { top: insets.top + 6, left: 10, right: 10 },
        ]}
        pointerEvents="box-none"
      >
        {/* Input row */}
        <View
          style={[
            s.searchRow,
            isAr && { flexDirection: "row-reverse" },
          ]}
          pointerEvents="auto"
        >
          <MaterialIcons
            name="search"
            size={20}
            color={focused ? GOLD : "rgba(15,32,64,0.4)"}
            style={s.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, isAr && { textAlign: "right" }]}
            placeholder={searchPlaceholder}
            placeholderTextColor="rgba(15,32,64,0.35)"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            returnKeyType="search"
            clearButtonMode="never"
            autoCorrect={false}
            autoComplete="off"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} style={s.clearBtn} hitSlop={8}>
              <MaterialIcons name="close" size={18} color="rgba(15,32,64,0.4)" />
            </Pressable>
          )}
        </View>

        {/* Dropdown results */}
        {showDropdown && (
          <View style={s.dropdown} pointerEvents="auto">
            <FlatList
              data={results}
              keyExtractor={(i) => i.id}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={results.length > 5}
              style={{ maxHeight: 280 }}
              renderItem={({ item, index }) => (
                <Pressable
                  style={[
                    s.resultRow,
                    isAr && { flexDirection: "row-reverse" },
                    index < results.length - 1 && s.resultBorder,
                  ]}
                  onPress={() => selectResult(item)}
                >
                  <Text style={s.resultEmoji}>{item.emoji}</Text>
                  <View style={s.resultTexts}>
                    <Text
                      style={[s.resultName, isAr && { textAlign: "right" }]}
                      numberOfLines={1}
                    >
                      {isAr ? item.nameAr : item.nameEn}
                    </Text>
                    <Text
                      style={[s.resultCity, isAr && { textAlign: "right" }]}
                      numberOfLines={1}
                    >
                      {isAr ? item.cityAr : item.cityEn}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={16}
                    color={GOLD}
                    style={isAr && { transform: [{ scaleX: -1 }] }}
                  />
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      {/* ── روح السعودية — bottom-left floating button ── */}
      <Pressable
        style={[s.visitBtn, { bottom: insets.bottom + 82, left: 12 }]}
        pointerEvents="auto"
        onPress={() => Linking.openURL("https://www.visitsaudi.com").catch(() => {})}
      >
        <Text style={s.visitIcon}>🌴</Text>
        <Text style={s.visitTxt}>{isAr ? "روح السعودية" : "Visit Saudi"}</Text>
        <MaterialIcons name="open-in-new" size={11} color="rgba(201,168,76,0.8)" />
      </Pressable>

      {/* ── Bottom hotel strip ── */}
      <View
        style={[s.bottomArea, { paddingBottom: insets.bottom + 76 }]}
        pointerEvents="box-none"
      >
        {/* Handle / toggle */}
        <Pressable
          style={s.handle}
          pointerEvents="auto"
          onPress={() => setStripOpen((v) => !v)}
        >
          <View style={s.handleBar} />
          <View style={[s.handleContent, isAr && { flexDirection: "row-reverse" }]}>
            <MaterialIcons name="hotel" size={15} color={GOLD} />
            <Text style={s.handleTxt}>{tour.bookStay}</Text>
            <MaterialIcons
              name={stripOpen ? "keyboard-arrow-down" : "keyboard-arrow-up"}
              size={18}
              color="rgba(15,32,64,0.45)"
            />
          </View>
        </Pressable>

        {/* Hotel cards */}
        {stripOpen && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pointerEvents="auto"
            contentContainerStyle={[
              s.stripContent,
              isAr && { flexDirection: "row-reverse" },
            ]}
          >
            {HOTEL_LISTINGS.map((h) => (
              <HotelCard
                key={h.id}
                item={h}
                isAr={isAr}
                bookNow={tour.bookNow}
                perNight={tour.perNight}
                hotelType={tour.hotelType}
                aptType={tour.apartmentType}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // Search bar
  searchWrapper: {
    position: "absolute",
    zIndex: 50,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 14,
    height: SEARCH_BAR_H,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
  },
  searchIcon: { marginHorizontal: 4 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: NAVY,
    paddingVertical: 0,
    marginHorizontal: 6,
    backgroundColor: "transparent",
    outlineStyle: "none",
  } as any,
  clearBtn: { padding: 4 },

  // Dropdown
  dropdown: {
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,32,64,0.07)",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  resultBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,32,64,0.08)",
  },
  resultEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  resultTexts: { flex: 1, gap: 2 },
  resultName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: NAVY,
  },
  resultCity: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(15,32,64,0.45)",
  },

  // VisitSaudi badge
  visitBtn: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15,32,64,0.85)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  visitIcon: { fontSize: 13 },
  visitTxt:  { fontSize: 12, fontFamily: "Inter_700Bold", color: GOLD },

  // Bottom strip
  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleBar: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(15,32,64,0.12)",
    alignSelf: "center",
    marginBottom: 8,
  },
  handleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  handleTxt: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: NAVY,
  },
  stripContent: {
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.97)",
  },

  // Hotel card
  hotelCard: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  hotelImg: { width: CARD_W, height: 100 },
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: NAVY,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeTxt:  { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  hotelBody: { padding: 10, gap: 4 },
  hotelName: { fontSize: 13, fontFamily: "Inter_700Bold", color: NAVY },
  hotelRow:  { flexDirection: "row", alignItems: "center", gap: 4 },
  stars:     { fontSize: 10, color: GOLD, letterSpacing: -1 },
  ratingTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NAVY },
  cityTxt:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.5)", flex: 1 },
  hotelFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,32,64,0.07)",
  },
  priceNum: { fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY },
  priceSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: NAVY },
  perNight: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.45)" },
  bookBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  bookTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
});
