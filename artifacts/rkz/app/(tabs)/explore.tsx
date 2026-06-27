/**
 * explore.tsx — Map-First Tourism & Booking
 * الخريطة السياحية تظهر أولاً مع فلاتر (معالم/فنادق/مطاعم...).
 * شريط أفقي سفلي للفنادق والشقق المفروشة مع حجز مباشر.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TourismMapView from "@/components/TourismMapView";
import { useLocale } from "@/hooks/useLocale";
import { HOTEL_LISTINGS } from "@/constants/mockTourism";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const { width: SW } = Dimensions.get("window");
const CARD_W = SW * 0.72;

// ── Hotel strip card ──────────────────────────────────────────────────────────
function HotelStripCard({
  item,
  isAr,
  bookNow,
  perNight,
  hotelType,
  aptType,
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
      {/* Type badge */}
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
  const { t, isAr } = useLocale();
  const insets = useSafeAreaInsets();
  const tour = t.tourism;

  // Show/hide hotel strip
  const [stripOpen, setStripOpen] = useState(true);

  // filterBarTopPx = how far from top of map the Leaflet filter bar sits
  // = safe-area top + a little gap
  const filterBarTopPx = insets.top + 56;

  return (
    <View style={s.root}>
      {/* ── Full-screen tourism map (absoluteFill, no overflow:hidden) ── */}
      <TourismMapView
        isAr={isAr}
        showTourismSpots
        initialZoom={6}
        filterBarTopPx={filterBarTopPx}
        hasTabs
      />

      {/* ── Overlay: title strip at top ── */}
      <View
        style={[s.topStrip, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={s.topCard} pointerEvents="box-none">
          <View style={s.topRow}>
            <MaterialIcons name="explore" size={18} color={GOLD} />
            <Text style={s.topTitle}>{tour.title}</Text>
          </View>
          <Text style={s.topSub}>{tour.subtitle}</Text>
        </View>
      </View>

      {/* ── Bottom hotel strip ── */}
      <View style={[s.bottomArea, { paddingBottom: insets.bottom + 78 }]} pointerEvents="box-none">
        {/* Toggle handle */}
        <Pressable
          style={s.handle}
          pointerEvents="auto"
          onPress={() => setStripOpen((v) => !v)}
        >
          <View style={s.handleBar} />
          <View style={s.handleContent}>
            <MaterialIcons name="hotel" size={15} color={GOLD} />
            <Text style={s.handleTxt}>{tour.bookStay}</Text>
            <MaterialIcons
              name={stripOpen ? "keyboard-arrow-down" : "keyboard-arrow-up"}
              size={18}
              color="rgba(15,32,64,0.5)"
            />
          </View>
        </Pressable>

        {/* Cards */}
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
              <HotelStripCard
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

  // Top overlay
  topStrip: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  topCard: {
    backgroundColor: "rgba(15,32,64,0.82)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
    alignSelf: "flex-start",
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  topTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  topSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },

  // Bottom area
  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  // Handle
  handle: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleBar: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(15,32,64,0.15)",
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

  // Strip
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
    position: "relative",
  },
  hotelImg: { width: CARD_W, height: 110 },
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: NAVY,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },

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
  priceNum: { fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY },
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
