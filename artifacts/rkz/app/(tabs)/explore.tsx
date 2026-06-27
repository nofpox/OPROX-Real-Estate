/**
 * explore.tsx — Map-First Tourism & Booking
 * الخريطة السياحية تظهر مباشرة.
 * فلاتر داخل الخريطة (Overpass API).
 * شريط أفقي سفلي للفنادق والشقق.
 * رابط روح السعودية في الأعلى.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TourismMapView, { type TourismSpot } from "@/components/TourismMapView";
import { useLocale } from "@/hooks/useLocale";
import { HOTEL_LISTINGS } from "@/constants/mockTourism";

const NAVY = "#0f2040";
const GOLD  = "#c9a84c";
const { width: SW } = Dimensions.get("window");
const CARD_W = SW * 0.70;

// ── Convert HotelListing → TourismSpot (for the map layer) ─────────────────
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

// ── Hotel strip card ──────────────────────────────────────────────────────────
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
export default function TourismScreen() {
  const { t, isAr }  = useLocale();
  const insets        = useSafeAreaInsets();
  const tour          = t.tourism;
  const [stripOpen, setStripOpen] = useState(true);

  // Spots to render as pins on the map
  const spots: TourismSpot[] = useMemo(
    () => HOTEL_LISTINGS.map(hotelToSpot),
    [],
  );

  // filterBarTopPx = where the Leaflet filter bar sits inside the WebView
  // just below the safe area + روح السعودية button
  const filterBarTopPx = insets.top + 48;

  return (
    <View style={s.root}>
      {/* ── Full-screen tourism map ── */}
      <TourismMapView
        spots={spots}
        isAr={isAr}
        showTourismSpots
        initialZoom={6}
        filterBarTopPx={filterBarTopPx}
        hasTabs
      />

      {/* ── روح السعودية badge — top overlay, small & non-intrusive ── */}
      <View
        style={[s.topRow, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={s.visitBtn}
          pointerEvents="auto"
          onPress={() => Linking.openURL("https://www.visitsaudi.com").catch(() => {})}
        >
          <Text style={s.visitIcon}>🌴</Text>
          <Text style={s.visitTxt}>{isAr ? "روح السعودية" : "Visit Saudi"}</Text>
          <MaterialIcons name="open-in-new" size={11} color="rgba(201,168,76,0.8)" />
        </Pressable>
      </View>

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

  // VisitSaudi badge
  topRow: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  visitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15,32,64,0.82)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
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
