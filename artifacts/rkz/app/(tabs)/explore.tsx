import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocale } from "@/hooks/useLocale";
import {
  ATTRACTIONS,
  HOTEL_LISTINGS,
  TOURISM_CITIES,
  type AttractionCategory,
} from "@/constants/mockTourism";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const { width: SW } = Dimensions.get("window");

const CARD_W = SW * 0.62;
const HOTEL_W = SW - 32;

// ── Category pill ─────────────────────────────────────────────────────────────
type CatKey = "all" | AttractionCategory;
const CATS: CatKey[] = ["all", "landmark", "entertainment", "restaurant", "shopping"];

function CatPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.pill, active && s.pillActive]}
    >
      <Text style={[s.pillTxt, active && s.pillTxtActive]}>{label}</Text>
    </Pressable>
  );
}

// ── Attraction card ────────────────────────────────────────────────────────────
function AttractionCard({ item, isAr }: { item: (typeof ATTRACTIONS)[0]; isAr: boolean }) {
  return (
    <Pressable style={s.attrCard}>
      <Image source={{ uri: item.image }} style={s.attrImg} />
      <View style={s.attrOverlay} />
      <View style={s.attrBadge}>
        <Text style={s.attrEmoji}>{item.emoji}</Text>
      </View>
      <View style={s.attrInfo}>
        <Text style={s.attrName} numberOfLines={1}>
          {isAr ? item.nameAr : item.nameEn}
        </Text>
        <View style={s.attrRow}>
          <MaterialIcons name="location-on" size={12} color={GOLD} />
          <Text style={s.attrCity}>{isAr ? item.city : item.cityEn}</Text>
          <Text style={s.attrRating}>★ {item.rating.toFixed(1)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Hotel card ─────────────────────────────────────────────────────────────────
function HotelCard({ item, isAr, t }: { item: (typeof HOTEL_LISTINGS)[0]; isAr: boolean; t: Record<string, unknown> }) {
  const tour = t as typeof import("@/constants/i18n").ar.tourism;

  const typeLabel =
    item.type === "hotel" ? tour.hotelType : tour.apartmentType;

  const stars = "★".repeat(item.stars) + "☆".repeat(5 - item.stars);

  return (
    <Pressable
      style={s.hotelCard}
      onPress={() => router.push(`/hotel/${item.id}` as never)}
    >
      <Image source={{ uri: item.image }} style={s.hotelImg} />
      <View style={s.hotelBody}>
        {/* Type badge */}
        <View style={s.typeBadge}>
          <Text style={s.typeTxt}>{typeLabel}</Text>
        </View>
        <Text style={s.hotelName} numberOfLines={2}>
          {isAr ? item.nameAr : item.nameEn}
        </Text>
        {/* Stars */}
        <Text style={s.hotelStars}>{stars}</Text>
        {/* Location */}
        <View style={s.hotelRow}>
          <MaterialIcons name="location-on" size={13} color={GOLD} />
          <Text style={s.hotelCity}>
            {isAr ? item.city : item.cityEn} · {isAr ? item.district : item.districtEn}
          </Text>
        </View>
        {/* Rating */}
        <View style={s.hotelRow}>
          <Text style={s.ratingDot}>★</Text>
          <Text style={s.ratingVal}>{item.rating.toFixed(1)}</Text>
          <Text style={s.reviewCnt}>({item.reviewCount.toLocaleString()})</Text>
        </View>
        {/* Amenities row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {(isAr ? item.amenitiesAr : item.amenitiesEn).slice(0, 3).map((a) => (
            <View key={a} style={s.amenityChip}>
              <Text style={s.amenityTxt}>{a}</Text>
            </View>
          ))}
        </ScrollView>
        {/* Price + CTA */}
        <View style={s.hotelFooter}>
          <View>
            <Text style={s.priceNum}>
              {item.pricePerNight.toLocaleString()} {isAr ? "ر.س" : "SAR"}
            </Text>
            <Text style={s.perNight}>{tour.perNight}</Text>
          </View>
          <Pressable
            style={s.bookBtn}
            onPress={() => router.push(`/hotel/${item.id}` as never)}
          >
            <Text style={s.bookBtnTxt}>{tour.bookNow}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ── City chip ──────────────────────────────────────────────────────────────────
function CityChip({
  nameAr,
  nameEn,
  emoji,
  isAr,
  onPress,
}: {
  nameAr: string;
  nameEn: string;
  emoji: string;
  isAr: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.cityChip} onPress={onPress}>
      <Text style={s.cityEmoji}>{emoji}</Text>
      <Text style={s.cityName}>{isAr ? nameAr : nameEn}</Text>
    </Pressable>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function TourismScreen() {
  const { t, isAr } = useLocale();
  const tour = t.tourism;

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CatKey>("all");
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  const catLabels: Record<CatKey, string> = {
    all:           tour.categories.all,
    landmark:      tour.categories.landmark,
    entertainment: tour.categories.entertainment,
    restaurant:    tour.categories.restaurant,
    shopping:      tour.categories.shopping,
  };

  const filteredAttr = useMemo(() => {
    let list = ATTRACTIONS;
    if (activeCat !== "all") list = list.filter((a) => a.category === activeCat);
    if (cityFilter) list = list.filter((a) => a.city === cityFilter || a.cityEn === cityFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.nameAr.includes(q) ||
          a.nameEn.toLowerCase().includes(q) ||
          a.city.includes(q) ||
          a.cityEn.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeCat, cityFilter, query]);

  const filteredHotels = useMemo(() => {
    let list = HOTEL_LISTINGS;
    if (cityFilter) list = list.filter((h) => h.city === cityFilter || h.cityEn === cityFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (h) =>
          h.nameAr.includes(q) ||
          h.nameEn.toLowerCase().includes(q) ||
          h.city.includes(q) ||
          h.cityEn.toLowerCase().includes(q),
      );
    }
    return list;
  }, [cityFilter, query]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.heroOverlay} />
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200" }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15,32,64,0.62)" }]} />
          <Text style={[s.heroTitle, isAr && s.rtl]}>{tour.title}</Text>
          <Text style={[s.heroSub, isAr && s.rtl]}>{tour.subtitle}</Text>

          {/* Search bar */}
          <View style={[s.searchBar, isAr && { flexDirection: "row-reverse" }]}>
            <MaterialIcons name="search" size={20} color="rgba(15,32,64,0.45)" />
            <TextInput
              style={[s.searchInput, isAr && { textAlign: "right" }]}
              placeholder={tour.searchPlaceholder}
              placeholderTextColor="rgba(15,32,64,0.4)"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <MaterialIcons name="close" size={18} color="rgba(15,32,64,0.4)" />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Category pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.pillsRow, isAr && { flexDirection: "row-reverse" }]}
          style={{ marginTop: 16 }}
        >
          {CATS.map((c) => (
            <CatPill
              key={c}
              label={catLabels[c]}
              active={activeCat === c}
              onPress={() => setActiveCat(c)}
            />
          ))}
        </ScrollView>

        {/* ── Cities ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, isAr && s.rtl]}>{tour.cities}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.cityRow, isAr && { flexDirection: "row-reverse" }]}
          >
            {/* "All" chip */}
            <Pressable
              style={[s.cityChip, !cityFilter && s.cityChipActive]}
              onPress={() => setCityFilter(null)}
            >
              <Text style={s.cityEmoji}>🗺️</Text>
              <Text style={[s.cityName, !cityFilter && { color: NAVY, fontFamily: "Inter_700Bold" }]}>
                {tour.categories.all}
              </Text>
            </Pressable>
            {TOURISM_CITIES.map((c) => (
              <CityChip
                key={c.nameEn}
                nameAr={c.nameAr}
                nameEn={c.nameEn}
                emoji={c.emoji}
                isAr={isAr}
                onPress={() =>
                  setCityFilter(
                    cityFilter === c.nameAr || cityFilter === c.nameEn ? null : isAr ? c.nameAr : c.nameEn,
                  )
                }
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Featured attractions ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, isAr && s.rtl]}>{tour.featured}</Text>
          {filteredAttr.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTxt}>{tour.noResults}</Text>
              <Text style={s.emptyHint}>{tour.noResultsHint}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredAttr}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[s.attrList, isAr && { flexDirection: "row-reverse" }]}
              renderItem={({ item }) => <AttractionCard item={item} isAr={isAr} />}
            />
          )}
        </View>

        {/* ── Book your stay ── */}
        <View style={s.stayHeader}>
          <View style={s.stayBadge}>
            <MaterialIcons name="hotel" size={18} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.stayTitle, isAr && s.rtl]}>{tour.bookStay}</Text>
            <Text style={[s.staySub, isAr && s.rtl]}>{tour.bookStaySub}</Text>
          </View>
        </View>

        {filteredHotels.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTxt}>{tour.noResults}</Text>
          </View>
        ) : (
          filteredHotels.map((h) => (
            <HotelCard key={h.id} item={h} isAr={isAr} t={tour as unknown as Record<string, unknown>} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f7f7f9" },
  scroll: { flex: 1 },

  // Hero
  hero: {
    height: 240,
    justifyContent: "flex-end",
    padding: 16,
    overflow: "hidden",
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  heroSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: NAVY,
    padding: 0,
  },

  // Pills
  pillsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15,32,64,0.12)",
  },
  pillActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  pillTxt: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: NAVY,
  },
  pillTxtActive: {
    color: "#fff",
  },

  // Section
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    marginBottom: 12,
  },

  // Cities
  cityRow: { gap: 10, paddingRight: 4 },
  cityChip: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15,32,64,0.1)",
    gap: 4,
  },
  cityChipActive: {
    borderColor: NAVY,
    backgroundColor: "rgba(15,32,64,0.06)",
  },
  cityEmoji: { fontSize: 22 },
  cityName: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(15,32,64,0.6)",
    textAlign: "center",
  },

  // Attraction card
  attrList: { gap: 12, paddingRight: 4 },
  attrCard: {
    width: CARD_W,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ddd",
    position: "relative",
  },
  attrImg: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  attrOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,32,64,0.38)",
  },
  attrBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attrEmoji: { fontSize: 16 },
  attrInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  attrName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  attrRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  attrCity: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  attrRating: { color: GOLD, fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Stay header
  stayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  stayBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(201,168,76,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stayTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: NAVY,
  },
  staySub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(15,32,64,0.5)",
    marginTop: 2,
  },

  // Hotel card
  hotelCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  hotelImg: { width: HOTEL_W, height: 180 },
  hotelBody: { padding: 14 },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(15,32,64,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  typeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NAVY },
  hotelName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    marginBottom: 4,
  },
  hotelStars: { fontSize: 12, color: GOLD, marginBottom: 6 },
  hotelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  hotelCity: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.6)" },
  ratingDot: { color: GOLD, fontSize: 13 },
  ratingVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: NAVY },
  reviewCnt: { fontSize: 12, color: "rgba(15,32,64,0.45)", fontFamily: "Inter_400Regular" },

  // Amenity
  amenityChip: {
    backgroundColor: "rgba(15,32,64,0.05)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  amenityTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: NAVY },

  // Footer
  hotelFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,32,64,0.07)",
  },
  priceNum: { fontSize: 18, fontFamily: "Inter_700Bold", color: NAVY },
  perNight: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.5)" },
  bookBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bookBtnTxt: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 24 },
  emptyTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: NAVY, marginBottom: 4 },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.5)" },

  rtl: { textAlign: "right" },
});
