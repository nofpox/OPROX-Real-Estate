/**
 * explore.tsx — Map + Gesture-Driven Bottom Sheet
 * Swipe UP on handle → full hotel list
 * Swipe DOWN on handle/sheet → collapses back to map
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
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
const { width: SW, height: SH } = Dimensions.get("window");

const HANDLE_H  = 64;   // height of the draggable handle bar
const TAB_BAR_H = Platform.OS === "web" ? 88 : 70;
const SEARCH_BAR_H = 52;

// ── Snap points (translateY of the sheet) ──────────────────────────────────────
// PEEK: sheet almost fully hidden, only handle visible above tab bar
const SNAP_PEEK = SH - HANDLE_H - TAB_BAR_H;
// FULL: sheet slides up to just below the search bar
const SNAP_FULL_OFFSET = 110; // approximate top inset + search bar height

// ── Search ────────────────────────────────────────────────────────────────────
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

// ── Hotel card — grid tile ─────────────────────────────────────────────────────
function HotelTile({
  item, isAr, bookNow, perNight, hotelType, aptType,
}: {
  item:      (typeof HOTEL_LISTINGS)[0];
  isAr:      boolean;
  bookNow:   string;
  perNight:  string;
  hotelType: string;
  aptType:   string;
}) {
  const stars    = "★".repeat(item.stars);
  const typeLabel = item.type === "hotel" ? hotelType : aptType;
  return (
    <Pressable
      style={s.tile}
      onPress={() => router.push(`/hotel/${item.id}` as never)}
    >
      <Image source={{ uri: item.image }} style={s.tileImg} />
      <View style={s.tileBadge}>
        <Text style={s.tileBadgeTxt}>{typeLabel}</Text>
      </View>
      <View style={s.tileBody}>
        <Text style={[s.tileName, isAr && { textAlign: "right" }]} numberOfLines={2}>
          {isAr ? item.nameAr : item.nameEn}
        </Text>
        <View style={[s.tileRow, isAr && { flexDirection: "row-reverse" }]}>
          <Text style={s.stars}>{stars}</Text>
          <Text style={s.ratingTxt}> {item.rating.toFixed(1)}</Text>
        </View>
        <View style={[s.tileFooter, isAr && { flexDirection: "row-reverse" }]}>
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
    </Pressable>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TourismScreen() {
  const { t, isAr }  = useLocale();
  const insets        = useSafeAreaInsets();
  const tour          = t.tourism;

  // ── Search state ─────────────────────────────────────────────────────────────
  const [query, setQuery]     = useState("");
  const [focused, setFocused] = useState(false);
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

  const spots: TourismSpot[] = useMemo(() => HOTEL_LISTINGS.map(hotelToSpot), []);
  const filterBarTopPx = insets.top + SEARCH_BAR_H + 8;

  // ── Bottom sheet gesture ──────────────────────────────────────────────────────
  const SNAP_FULL = SNAP_FULL_OFFSET + insets.top;
  const sheetY    = useSharedValue(SNAP_PEEK);
  const savedY    = useSharedValue(SNAP_PEEK);
  const [expanded, setExpanded] = useState(false);

  // Refs so gesture callbacks can read latest values
  const expandedRef = useRef(false);
  expandedRef.current = expanded;

  function snapTo(y: number) {
    sheetY.value = withSpring(y, { damping: 22, stiffness: 220, mass: 0.8 });
    savedY.value = y;
    setExpanded(y < SNAP_PEEK / 2);
  }

  const handleGesture = Gesture.Pan()
    .activeOffsetY([-4, 4])
    .failOffsetX([-20, 20])
    .runOnJS(true)
    .onUpdate((e) => {
      const next = Math.max(SNAP_FULL, Math.min(SNAP_PEEK, savedY.value + e.translationY));
      sheetY.value = next;
    })
    .onEnd((e) => {
      // Tiny movement = tap → toggle
      if (Math.abs(e.translationY) < 6 && Math.abs(e.velocityY) < 100) {
        const target = expandedRef.current ? SNAP_PEEK : SNAP_FULL;
        runOnJS(snapTo)(target);
        return;
      }
      // Real drag → snap to nearest
      const mid = (SNAP_FULL + SNAP_PEEK) / 2;
      const goFull = sheetY.value < mid || e.velocityY < -500;
      runOnJS(snapTo)(goFull ? SNAP_FULL : SNAP_PEEK);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const searchPlaceholder = isAr
    ? "ابحث عن مكان أو فندق…"
    : "Search for a place or hotel…";

  return (
    <View style={s.root}>
      {/* ── Full-screen map ── */}
      <TourismMapView
        ref={mapRef}
        spots={spots}
        isAr={isAr}
        showTourismSpots
        initialZoom={6}
        filterBarTopPx={filterBarTopPx}
        hasTabs
      />

      {/* ── Search bar ── */}
      <View
        style={[s.searchWrapper, { top: insets.top + 6, left: 10, right: 10 }]}
        pointerEvents="box-none"
      >
        <View
          style={[s.searchRow, isAr && { flexDirection: "row-reverse" }]}
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
                    <Text style={[s.resultName, isAr && { textAlign: "right" }]} numberOfLines={1}>
                      {isAr ? item.nameAr : item.nameEn}
                    </Text>
                    <Text style={[s.resultCity, isAr && { textAlign: "right" }]} numberOfLines={1}>
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

      {/* ── Visit Saudi badge ── */}
      <Pressable
        style={[s.visitBtn, { bottom: insets.bottom + 82, left: 12 }]}
        onPress={() => Linking.openURL("https://www.visitsaudi.com").catch(() => {})}
      >
        <Text style={s.visitIcon}>🌴</Text>
        <Text style={s.visitTxt}>{isAr ? "روح السعودية" : "Visit Saudi"}</Text>
        <MaterialIcons name="open-in-new" size={11} color="rgba(201,168,76,0.8)" />
      </Pressable>

      {/* ── Animated bottom sheet ── */}
      <Animated.View style={[s.sheet, sheetStyle]}>

        {/* Handle — drag up/down OR tap to toggle */}
        <GestureDetector gesture={handleGesture}>
          <View style={s.handle}>
            <View style={s.handleBar} />
            <View style={[s.handleContent, isAr && { flexDirection: "row-reverse" }]}>
              <MaterialIcons name="hotel" size={15} color={GOLD} />
              <Text style={s.handleTxt}>{tour.bookStay}</Text>
              <View style={s.toggleBtn}>
                <Text style={s.toggleBtnTxt}>
                  {isAr
                    ? (expanded ? "أخفِ ↓" : "اضغط هنا ↑")
                    : (expanded ? "Hide ↓" : "Tap here ↑")}
                </Text>
              </View>
            </View>
          </View>
        </GestureDetector>

        {/* Hotel grid — only interactive when expanded */}
        <ScrollView
          style={s.listArea}
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: insets.bottom + TAB_BAR_H + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={expanded}
          bounces={false}
        >
          <View style={[s.grid, isAr && { flexDirection: "row-reverse", flexWrap: "wrap" }]}>
            {HOTEL_LISTINGS.map((h) => (
              <HotelTile
                key={h.id}
                item={h}
                isAr={isAr}
                bookNow={tour.bookNow}
                perNight={tour.perNight}
                hotelType={tour.hotelType}
                aptType={tour.apartmentType}
              />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const TILE_W = (SW - 36) / 2;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // Search
  searchWrapper: { position: "absolute", zIndex: 50 },
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
  searchIcon:  { marginHorizontal: 4 },
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
  resultEmoji:  { fontSize: 20, width: 28, textAlign: "center" },
  resultTexts:  { flex: 1, gap: 2 },
  resultName:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NAVY },
  resultCity:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.45)" },

  // Visit Saudi badge
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

  // ── Bottom sheet ────────────────────────────────────────────────────────────
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: SH,
    backgroundColor: "#fff",
    borderTopLeftRadius:  22,
    borderTopRightRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
    overflow: "hidden",
  },

  // Handle
  handle: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,32,64,0.07)",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(15,32,64,0.13)",
    alignSelf: "center",
    marginBottom: 10,
  },
  handleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  handleTxt: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: NAVY,
  },
  toggleBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  toggleBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  // List area
  listArea: { flex: 1 },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },

  // Hotel tile
  tile: {
    width: TILE_W,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(15,32,64,0.06)",
  },
  tileImg: { width: TILE_W, height: 110 },
  tileBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: NAVY,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tileBadgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  tileBody:     { padding: 10, gap: 5 },
  tileName:     { fontSize: 12, fontFamily: "Inter_700Bold", color: NAVY, lineHeight: 17 },
  tileRow:      { flexDirection: "row", alignItems: "center" },
  stars:        { fontSize: 10, color: GOLD },
  ratingTxt:    { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NAVY },
  tileFooter:   { flexDirection: "row", alignItems: "baseline", gap: 3 },
  priceNum:     { fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY },
  priceSub:     { fontSize: 10, fontFamily: "Inter_400Regular", color: NAVY },
  perNight:     { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.45)" },
  bookBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: "center",
    marginTop: 2,
  },
  bookTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
});
