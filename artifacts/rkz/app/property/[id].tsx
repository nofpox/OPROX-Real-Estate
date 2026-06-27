import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
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

// ── HousIn Estimate™ helper ────────────────────────────────────────────────────
function getEstimate(listing: Listing) {
  const base = listing.price;
  const lo   = Math.round(base * 0.93 / 1000) * 1000;
  const hi   = Math.round(base * 1.07 / 1000) * 1000;
  const ppM  = listing.area ? Math.round(base / listing.area) : null;
  const trend: "up" | "flat" | "down" =
    listing.city === "الرياض" || listing.city === "جدة" ? "up" : "flat";
  const confidence: "high" | "medium" =
    listing.featured ? "high" : "medium";
  return { lo, hi, ppM, trend, confidence };
}

// ── Fetch single listing ───────────────────────────────────────────────────────
async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const isMock = ["101", "102", "103", "104", "105", "106", "107", "108"].includes(id);
    if (isMock) {
      return MOCK_LISTINGS.find((l) => l.id === id) ?? null;
    }
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return MOCK_LISTINGS.find((l) => l.id === id) ?? null;
    const res  = await fetch(`https://${domain}/realestate-api/listings/${id}`);
    if (!res.ok) return null;
    const l = await res.json();
    return {
      id:          String(l.id ?? l._id),
      titleAr:     String(l.title_ar ?? l.titleAr ?? l.title ?? ""),
      titleEn:     String(l.title_en ?? l.titleEn ?? l.title ?? ""),
      type:        String(l.property_type ?? l.type ?? "apartment") as Listing["type"],
      status:      String(l.listing_type ?? l.status ?? "sale") === "rent" ? "rent" : "sale",
      price:       Number(l.price ?? 0),
      currency:    "SAR",
      city:        String(l.city ?? ""),
      district:    String(l.district ?? ""),
      beds:        l.bedrooms != null ? Number(l.bedrooms) : undefined,
      baths:       l.bathrooms != null ? Number(l.bathrooms) : undefined,
      area:        l.area_sqm != null ? Number(l.area_sqm) : undefined,
      lat:         Number(l.lat ?? 24.7136),
      lng:         Number(l.lng ?? 46.6753),
      image:       String(l.main_image ?? l.image ?? MOCK_LISTINGS[0].image),
      featured:    Boolean(l.featured),
      agentName:   String(l.agent_name ?? "وكيل HousIn"),
      agentPhone:  String(l.agent_phone ?? "0500000000"),
      description: String(l.description ?? ""),
      listedAt:    String(l.created_at ?? l.listedAt ?? ""),
    };
  } catch {
    return MOCK_LISTINGS.find((l) => l.id === id) ?? null;
  }
}

const AMENITIES = [
  { icon: "local-parking",  arLabel: "موقف سيارة", enLabel: "Parking" },
  { icon: "pool",            arLabel: "مسبح",       enLabel: "Pool" },
  { icon: "security",        arLabel: "حراسة",      enLabel: "Security" },
  { icon: "fitness-center",  arLabel: "صالة رياضة", enLabel: "Gym" },
  { icon: "elevator",        arLabel: "مصعد",        enLabel: "Elevator" },
  { icon: "ac-unit",         arLabel: "مكيف مركزي",  enLabel: "Central A/C" },
];

export default function PropertyDetailScreen() {
  const { id }                         = useLocalSearchParams<{ id: string }>();
  const { t, isAr }                    = useLocale();
  const { isFavorite, toggleFavorite } = useApp();
  const insets                         = useSafeAreaInsets();

  const [listing,  setListing]  = useState<Listing | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [msgName,  setMsgName]  = useState("");
  const [msgPhone, setMsgPhone] = useState("");
  const [msgBody,  setMsgBody]  = useState("");
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    fetchListing(id).then((l) => { setListing(l); setLoading(false); });
  }, [id]);

  const isFav   = listing ? isFavorite(listing.id) : false;
  const est     = listing ? getEstimate(listing) : null;

  // Image parallax
  const imgTranslateY = scrollY.interpolate({ inputRange: [-100, 0, 200], outputRange: [-50, 0, 60], extrapolate: "clamp" });

  const send = async () => {
    if (!msgName.trim() || !msgPhone.trim()) {
      Alert.alert(isAr ? "ناقص" : "Missing", isAr ? "يرجى إدخال الاسم ورقم الجوال" : "Please enter name and phone");
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  };

  if (loading || !listing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f5f7fa", alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <Text style={{ fontSize: 32 }}>🏠</Text>
        <Text style={{ fontSize: 16, color: NAVY, marginTop: 12 }}>{t.common.loading}</Text>
      </View>
    );
  }

  const title = isAr ? listing.titleAr : listing.titleEn;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* ── Hero image ── */}
        <View style={s.imgWrap}>
          <Animated.Image
            source={{ uri: listing.image }}
            style={[s.heroImg, { transform: [{ translateY: imgTranslateY }] }]}
            resizeMode="cover"
          />
          {/* overlay gradient effect */}
          <View style={s.imgOverlay} />

          {/* Top bar */}
          <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable style={s.circleBtn} onPress={() => router.back()}>
              <MaterialIcons name={isAr ? "chevron-right" : "chevron-left"} size={26} color={NAVY} />
            </Pressable>
            <View style={s.row}>
              <Pressable
                style={s.circleBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  toggleFavorite(listing.id);
                }}
              >
                <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={22} color={isFav ? "#e53e3e" : NAVY} />
              </Pressable>
            </View>
          </View>

          {/* Status badge on image */}
          <View style={s.imgBadge}>
            <Text style={s.imgBadgeText}>{listing.status === "sale" ? t.prop.forSale : t.prop.forRent}</Text>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={s.content}>

          {/* Title & price */}
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{title}</Text>
              <View style={[s.row, { gap: 4, marginTop: 4 }]}>
                <MaterialIcons name="location-on" size={14} color={GOLD} />
                <Text style={s.location}>{listing.district ? `${listing.district}، ${listing.city}` : listing.city}</Text>
              </View>
            </View>
            <View>
              <Text style={s.price}>{formatPrice(listing.price, isAr)}</Text>
              <Text style={s.priceSub}>{isAr ? "ر.س" : "SAR"}{listing.status === "rent" ? (isAr ? "/سنة" : "/yr") : ""}</Text>
            </View>
          </View>

          {/* Facts */}
          <View style={s.factsRow}>
            {listing.beds  && <Fact icon="hotel"       label={t.prop.beds(listing.beds)} />}
            {listing.baths && <Fact icon="bathtub"     label={t.prop.baths(listing.baths)} />}
            {listing.area  && <Fact icon="square-foot" label={t.prop.sqm(listing.area)} />}
            {listing.area  && listing.price && (
              <Fact icon="trending-up" label={t.prop.pricePerSqm(Math.round(listing.price / listing.area))} />
            )}
          </View>

          {/* Overview */}
          {listing.description ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>{t.detail.overview}</Text>
              <Text style={s.desc}>{listing.description}</Text>
            </View>
          ) : null}

          {/* ── HousIn Estimate™ ── */}
          {est && (
            <View style={s.estimateCard}>
              <View style={s.estimateHeader}>
                <View>
                  <Text style={s.estimateTitle}>{t.detail.estimate.title}</Text>
                  <Text style={s.estimateSub}>{t.detail.estimate.subtitle}</Text>
                </View>
                <View style={[s.confBadge, { backgroundColor: est.confidence === "high" ? "rgba(56,161,105,0.15)" : "rgba(221,107,32,0.12)" }]}>
                  <Text style={[s.confText, { color: est.confidence === "high" ? "#38a169" : "#dd6b20" }]}>
                    {est.confidence === "high" ? t.detail.estimate.high : t.detail.estimate.medium}
                  </Text>
                </View>
              </View>

              <View style={s.estimateRange}>
                <Text style={s.rangeLabel}>{t.detail.estimate.range}</Text>
                <Text style={s.rangeVal}>
                  {formatPrice(est.lo, isAr)} — {formatPrice(est.hi, isAr)} {isAr ? "ر.س" : "SAR"}
                </Text>
              </View>

              <View style={s.estimateRow}>
                {est.ppM && (
                  <View style={s.estimateStat}>
                    <Text style={s.estimateStatLabel}>{t.detail.estimate.pricePerSqm}</Text>
                    <Text style={s.estimateStatValue}>{est.ppM.toLocaleString()} {isAr ? "ر.س/م²" : "SAR/m²"}</Text>
                  </View>
                )}
                <View style={s.estimateStat}>
                  <Text style={s.estimateStatLabel}>{t.detail.estimate.marketTrend}</Text>
                  <Text style={[s.estimateStatValue, { color: est.trend === "up" ? "#38a169" : est.trend === "down" ? "#e53e3e" : NAVY }]}>
                    {est.trend === "up" ? t.detail.estimate.trendUp : est.trend === "down" ? t.detail.estimate.trendDown : t.detail.estimate.trendFlat}
                  </Text>
                </View>
              </View>

              <Text style={s.estimateDisclaimer}>{t.detail.estimate.disclaimer}</Text>
            </View>
          )}

          {/* Amenities */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{t.detail.amenities}</Text>
            <View style={s.amenitiesGrid}>
              {AMENITIES.map((a) => (
                <View key={a.icon} style={s.amenityItem}>
                  <View style={s.amenityIcon}>
                    <MaterialIcons name={a.icon as never} size={18} color={GOLD} />
                  </View>
                  <Text style={s.amenityLabel}>{isAr ? a.arLabel : a.enLabel}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Call agent */}
          <Pressable
            style={s.callBtn}
            onPress={() => Linking.openURL(`tel:${listing.agentPhone}`).catch(() => {})}
          >
            <MaterialIcons name="phone" size={20} color={NAVY} />
            <Text style={s.callBtnText}>{t.detail.contact.call} {listing.agentName}</Text>
          </Pressable>

          {/* ── Contact form ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{t.detail.contact.title}</Text>

            {sent ? (
              <View style={s.sentWrap}>
                <Text style={{ fontSize: 40 }}>✅</Text>
                <Text style={s.sentText}>{t.detail.contact.success}</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <TextInput
                  style={[s.input, { textAlign: isAr ? "right" : "left" }]}
                  placeholder={t.detail.contact.name}
                  placeholderTextColor="rgba(15,32,64,0.35)"
                  value={msgName}
                  onChangeText={setMsgName}
                />
                <TextInput
                  style={[s.input, { textAlign: isAr ? "right" : "left" }]}
                  placeholder={t.detail.contact.phone}
                  placeholderTextColor="rgba(15,32,64,0.35)"
                  value={msgPhone}
                  onChangeText={setMsgPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[s.input, s.inputMulti, { textAlign: isAr ? "right" : "left" }]}
                  placeholder={t.detail.contact.messagePlaceholder}
                  placeholderTextColor="rgba(15,32,64,0.35)"
                  value={msgBody}
                  onChangeText={setMsgBody}
                  multiline
                  numberOfLines={3}
                />
                <Pressable style={[s.sendBtn, sending && { opacity: 0.7 }]} onPress={send} disabled={sending}>
                  <Text style={s.sendBtnText}>
                    {sending ? t.detail.contact.sending : t.detail.contact.send}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

function Fact({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.fact}>
      <MaterialIcons name={icon as never} size={16} color={GOLD} />
      <Text style={s.factLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  imgWrap:    { height: 280, overflow: "hidden" },
  heroImg:    { width: W, height: 340, position: "absolute", top: -30 },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,32,64,0.25)" },
  topBar:     { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, zIndex: 10 },
  circleBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  row:        { flexDirection: "row", gap: 8 },
  imgBadge:   { position: "absolute", bottom: 16, left: 16, backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  imgBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: NAVY },

  content:    { backgroundColor: "#f5f7fa", padding: 20, gap: 16 },

  titleRow:   { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title:      { fontSize: 20, fontFamily: "Inter_700Bold", color: NAVY, flex: 1 },
  location:   { fontSize: 13, color: "rgba(15,32,64,0.55)", fontFamily: "Inter_400Regular" },
  price:      { fontSize: 22, fontFamily: "Inter_700Bold", color: GOLD, textAlign: "right" },
  priceSub:   { fontSize: 11, color: "rgba(15,32,64,0.45)", textAlign: "right" },

  factsRow:   { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  factLabel:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NAVY },

  card:       { backgroundColor: "#fff", borderRadius: 18, padding: 18, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", color: NAVY },
  desc:       { fontSize: 14, color: "rgba(15,32,64,0.65)", lineHeight: 22 },

  // ── Estimate ──
  estimateCard: { backgroundColor: NAVY, borderRadius: 18, padding: 18, gap: 14 },
  estimateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  estimateTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", color: GOLD },
  estimateSub:    { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  confBadge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  confText:       { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  estimateRange:  { gap: 4 },
  rangeLabel:     { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  rangeVal:       { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  estimateRow:    { flexDirection: "row", gap: 20 },
  estimateStat:   { flex: 1, gap: 3 },
  estimateStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.55)" },
  estimateStatValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  estimateDisclaimer: { fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 14 },

  // ── Amenities ──
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  amenityItem:   { alignItems: "center", gap: 6, width: (W - 40 - 36 - 60) / 3 },
  amenityIcon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(201,168,76,0.1)", alignItems: "center", justifyContent: "center" },
  amenityLabel:  { fontSize: 11, color: NAVY, textAlign: "center" },

  callBtn:    { backgroundColor: GOLD, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  callBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY },

  // ── Contact form ──
  input:       { borderWidth: 1.5, borderColor: "rgba(15,32,64,0.12)", borderRadius: 12, padding: 14, fontSize: 15, color: NAVY, backgroundColor: "#f9fafb" },
  inputMulti:  { minHeight: 80, textAlignVertical: "top" },
  sendBtn:     { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  sendBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: GOLD },

  sentWrap:   { alignItems: "center", gap: 12, paddingVertical: 16 },
  sentText:   { fontSize: 14, color: "rgba(15,32,64,0.65)", textAlign: "center", lineHeight: 22 },
});
