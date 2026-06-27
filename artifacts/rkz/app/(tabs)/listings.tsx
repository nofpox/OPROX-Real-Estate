// Favorites screen — replaces old "My Listings" tab
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice, MOCK_LISTINGS, type Listing } from "@/constants/mockListings";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const W    = Dimensions.get("window").width;

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
      district: String(l.district ?? ""),
      beds: l.bedrooms != null ? Number(l.bedrooms) : undefined,
      baths: l.bathrooms != null ? Number(l.bathrooms) : undefined,
      area: l.area_sqm != null ? Number(l.area_sqm) : undefined,
      lat: Number(l.lat ?? 24.7136),
      lng: Number(l.lng ?? 46.6753),
      image: String(l.main_image ?? l.image ?? MOCK_LISTINGS[0].image),
      featured: Boolean(l.featured),
      agentName: String(l.agent_name ?? "وكيل HousIn"),
      agentPhone: String(l.agent_phone ?? "0500000000"),
      description: String(l.description ?? ""),
      listedAt: String(l.created_at ?? l.listedAt ?? ""),
    })) as Listing[];
  } catch {
    return MOCK_LISTINGS;
  }
}

export default function FavoritesScreen() {
  const { t, isAr }                    = useLocale();
  const { favorites, isFavorite, toggleFavorite } = useApp();
  const insets                         = useSafeAreaInsets();
  const [all, setAll]                  = useState<Listing[]>(MOCK_LISTINGS);

  useEffect(() => {
    fetchListings().then(setAll);
  }, []);

  const favListings = all.filter((l) => isFavorite(l.id));

  const renderItem = ({ item }: { item: Listing }) => {
    const title = isAr ? item.titleAr : item.titleEn;
    return (
      <Pressable style={s.card} onPress={() => router.push(`/property/${item.id}` as never)}>
        <Image source={{ uri: item.image }} style={s.img} resizeMode="cover" />
        <View style={s.body}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.statusBadge}>{item.status === "sale" ? t.prop.forSale : t.prop.forRent}</Text>
            <Text style={s.city}>{item.city}</Text>
          </View>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.price}>{formatPrice(item.price, isAr)} {isAr ? "ر.س" : "SAR"}</Text>
          <View style={s.row}>
            {item.beds  && <MetaTag icon="hotel"       label={t.prop.beds(item.beds)} />}
            {item.baths && <MetaTag icon="bathtub"     label={t.prop.baths(item.baths)} />}
            {item.area  && <MetaTag icon="square-foot" label={t.prop.sqm(item.area)} />}
          </View>
        </View>
        <Pressable style={s.removeBtn} onPress={() => toggleFavorite(item.id)}>
          <MaterialIcons name="favorite" size={22} color="#e53e3e" />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={s.headerTitle}>{t.favorites.title}</Text>
        {favListings.length > 0 && (
          <Text style={s.headerSub}>{t.favorites.saved(favListings.length)}</Text>
        )}
      </View>

      {favListings.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>♡</Text>
          <Text style={s.emptyTitle}>{t.favorites.empty}</Text>
          <Text style={s.emptyHint}>{t.favorites.emptyHint}</Text>
          <Pressable style={s.browseBtn} onPress={() => router.push("/(tabs)/add" as never)}>
            <Text style={s.browseBtnText}>{t.favorites.browse}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={favListings}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function MetaTag({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.meta}>
      <MaterialIcons name={icon as never} size={12} color={NAVY} />
      <Text style={s.metaText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    flexDirection: "row",
  },
  img:         { width: W * 0.34, height: 120 },
  body:        { flex: 1, padding: 12, gap: 5 },
  row:         { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusBadge: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: GOLD, backgroundColor: "rgba(201,168,76,0.12)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  city:        { fontSize: 10, color: "rgba(15,32,64,0.45)", fontFamily: "Inter_400Regular" },
  title:       { fontSize: 13, fontFamily: "Inter_700Bold", color: NAVY },
  price:       { fontSize: 15, fontFamily: "Inter_700Bold", color: GOLD },
  meta:        { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f0f4f8", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  metaText:    { fontSize: 10, color: NAVY },
  removeBtn:   { padding: 12, justifyContent: "flex-start", paddingTop: 10 },

  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  emptyIcon:   { fontSize: 64, color: "#e53e3e" },
  emptyTitle:  { fontSize: 20, fontFamily: "Inter_700Bold", color: NAVY },
  emptyHint:   { fontSize: 14, color: "rgba(15,32,64,0.5)", textAlign: "center", lineHeight: 22 },
  browseBtn:   { marginTop: 8, backgroundColor: NAVY, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  browseBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: GOLD },
});
