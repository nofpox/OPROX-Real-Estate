import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { router } from "expo-router";

import { ADMIN_EVENTS_KEY } from "@/hooks/useAIAssistant";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { useConfig } from "@/context/DynamicConfig";
import { useApp } from "@/context/AppContext";
import HeatmapMapView, { MapProperty } from "@/components/HeatmapMapView";
import AnimatedScreen from "@/components/AnimatedScreen";

const NEGOTIATION_KEY      = "rozoz_negotiation_requests";
const DISCOVERY_FILTER_KEY = "rozoz_discovery_filter";
const TEST_WHATSAPP        = "https://wa.me/966551234567"; // رقم تجريبي للاختبار

const { width: SCREEN_W } = Dimensions.get("window");

// ── Static discovery listings ──────────────────────────────────────────────
interface Listing {
  id: string;
  type: string;
  city: string;
  district: string;
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  badge?: string;
}

const ALL_LISTINGS: Listing[] = [
  { id: "d01", type: "villa",      city: "الرياض",       district: "النرجس",      price: 2_850_000, area: 450, bedrooms: 6, bathrooms: 7 },
  { id: "d02", type: "apartment",  city: "جدة",           district: "الروضة",      price: 680_000,   area: 180, bedrooms: 3, bathrooms: 2 },
  { id: "d03", type: "villa",      city: "الدمام",        district: "الشاطئ",      price: 1_950_000, area: 380, bedrooms: 5, bathrooms: 5 },
  { id: "d04", type: "apartment",  city: "الرياض",       district: "الملقا",      price: 540_000,   area: 140, bedrooms: 2, bathrooms: 2 },
  { id: "d05", type: "land",       city: "مكة المكرمة",  district: "العزيزية",    price: 3_200_000, area: 600 },
  { id: "d06", type: "commercial", city: "الرياض",       district: "العليا",      price: 8_500_000, area: 1200 },
  { id: "d07", type: "compound",   city: "الخبر",        district: "الكورنيش",    price: 4_600_000, area: 2000 },
  { id: "d08", type: "villa",      city: "المدينة المنورة", district: "الورود",  price: 1_200_000, area: 300, bedrooms: 4, bathrooms: 3 },
  { id: "d09", type: "apartment",  city: "الدمام",        district: "الراكة",      price: 420_000,   area: 120, bedrooms: 2, bathrooms: 1 },
  { id: "d10", type: "warehouse",  city: "الرياض",       district: "الصناعية",    price: 6_800_000, area: 5000 },
  { id: "d11", type: "farm",       city: "الطائف",        district: "الهضيبة",     price: 1_800_000, area: 10000 },
  { id: "d12", type: "villa",      city: "جدة",           district: "التعمير",     price: 3_400_000, area: 520, bedrooms: 7, bathrooms: 6, badge: "جديد" },
  { id: "d13", type: "apartment",  city: "الرياض",       district: "الياسمين",    price: 590_000,   area: 155, bedrooms: 3, bathrooms: 2 },
  { id: "d14", type: "land",       city: "الخبر",        district: "الأمواج",     price: 5_100_000, area: 900 },
  { id: "d15", type: "rest_house", city: "الطائف",        district: "الشفا",       price: 2_100_000, area: 800, bedrooms: 5 },
  { id: "d16", type: "palace",     city: "الرياض",       district: "الحمراء",     price: 18_000_000, area: 2400, bedrooms: 12, bathrooms: 14, badge: "حصري" },
];

const TYPE_LABELS: Record<string, string> = {
  villa: "فيلا", apartment: "شقة", land: "أرض", commercial: "تجاري",
  compound: "مجمع", floor: "دور", warehouse: "مستودع", farm: "مزرعة",
  rest_house: "استراحة", palace: "قصر",
};

const TYPE_ICON: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  villa:      "home",
  apartment:  "apartment",
  land:       "terrain",
  commercial: "storefront",
  compound:   "location-city",
  floor:      "layers",
  warehouse:  "warehouse",
  farm:       "grass",
  rest_house: "weekend",
  palace:     "castle",
};

function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}ك`;
  return String(n);
}

// ── Property Card ─────────────────────────────────────────────────────────
function PropertyCard({
  listing,
  onRequest,
  s,
  colors,
}: {
  listing: Listing;
  onRequest: (l: Listing) => void;
  s: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useColors>;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }).start();

  const iconName = TYPE_ICON[listing.type] ?? "home";

  return (
    <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>
      {/* Thumbnail placeholder */}
      <View style={s.cardThumb}>
        <MaterialIcons name={iconName} size={36} color={colors.gold} />
        {listing.badge ? (
          <View style={s.badgeChip}>
            <Text style={s.badgeText}>{listing.badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.cardBody}>
        {/* Type + City */}
        <View style={s.cardRow}>
          <View style={s.typeChip}>
            <Text style={s.typeChipText}>{TYPE_LABELS[listing.type] ?? listing.type}</Text>
          </View>
          <Text style={s.cityText} numberOfLines={1}>{listing.city}</Text>
        </View>

        {/* District */}
        <Text style={s.districtText} numberOfLines={1}>{listing.district}</Text>

        {/* Price */}
        <Text style={s.priceText}>{fmtPrice(listing.price)} <Text style={s.sarText}>ريال</Text></Text>

        {/* Area + Beds */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <MaterialIcons name="straighten" size={12} color="#94A3B8" />
            <Text style={s.metaText}>{listing.area.toLocaleString()} م²</Text>
          </View>
          {listing.bedrooms ? (
            <View style={s.metaItem}>
              <MaterialIcons name="hotel" size={12} color="#94A3B8" />
              <Text style={s.metaText}>{listing.bedrooms} غرف</Text>
            </View>
          ) : null}
        </View>

        {/* Request Negotiation CTA */}
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => onRequest(listing)}
          style={({ pressed }) => [s.reqBtn, pressed && { opacity: 0.85 }]}
        >
          <MaterialIcons name="handshake" size={15} color="#0F2040" />
          <Text style={s.reqBtnText}>طلب تفاوض</Text>
        </Pressable>

        {/* WhatsApp CTA */}
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void Linking.openURL(TEST_WHATSAPP);
          }}
          style={({ pressed }) => [s.waBtn, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons name="chat" size={14} color="#25D366" />
          <Text style={s.waBtnText}>واتساب</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────
export default function DiscoveryMapScreen() {
  const colors      = useColors();
  const insets      = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme !== "light";
  const { t, isAr } = useLocale();
  const { config } = useConfig();
  const { setUser, clearAppMode } = useApp();

  const handleLogout = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doLogout = () => {
      setUser(null);
      clearAppMode();
      router.replace("/mode-select" as never);
    };
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" ? window.confirm("هل تريد تسجيل الخروج؟") : true;
      if (ok) doLogout();
      return;
    }
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج من ROZOZ؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: doLogout },
    ]);
  };

  const topPad      = insets.top    + (Platform.OS === "web" ? 67  : 0);
  const TAB_H       = Platform.OS === "web" ? 84 : 64;
  const bottomPad   = insets.bottom + TAB_H + 20;
  const windowH     = Dimensions.get("window").height;

  // Build type filter list from config (matches DynamicConfig propertyTypes)
  const filterTypes = ["all", ...config.propertyTypes.map((pt) => pt.id)];

  const [activeType,   setActiveType]   = useState("all");
  const [refreshing,   setRefreshing]   = useState(false);
  const [viewMode,     setViewMode]     = useState<"cards" | "heatmap">("heatmap");

  // Load pre-selected filter from entry gate (set by role selection or previous session)
  useEffect(() => {
    AsyncStorage.getItem(DISCOVERY_FILTER_KEY).then((saved) => {
      if (saved && filterTypes.includes(saved)) setActiveType(saved);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveFilter = useCallback((type: string) => {
    setActiveType(type);
    void AsyncStorage.setItem(DISCOVERY_FILTER_KEY, type);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  const handleRequest = useCallback(async (listing: Listing) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Log to admin events
      const evRaw = await AsyncStorage.getItem(ADMIN_EVENTS_KEY);
      const events = evRaw ? JSON.parse(evRaw) : [];
      const newId  = Date.now().toString();
      events.push({
        id:          newId,
        type:        "pending_search",
        description: `طلب تفاوض: ${TYPE_LABELS[listing.type] ?? listing.type} في ${listing.city} — ${listing.price.toLocaleString()} ريال`,
        timestamp:   new Date().toISOString(),
      });
      await AsyncStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(events));

      // Save to negotiation requests (read in طلباتي tab)
      const reqRaw = await AsyncStorage.getItem(NEGOTIATION_KEY);
      const reqs   = reqRaw ? JSON.parse(reqRaw) : [];
      reqs.push({
        id:     newId,
        type:   listing.type,
        city:   listing.city,
        price:  listing.price,
        ts:     new Date().toISOString(),
        status: "pending",
      });
      await AsyncStorage.setItem(NEGOTIATION_KEY, JSON.stringify(reqs));
    } catch {}

    Alert.alert(
      "تم إرسال الطلب",
      "تم استلام طلبك، سيتم التواصل معك قريباً.",
      [{ text: "حسناً", style: "default" }],
    );
  }, []);

  const filtered = useMemo(
    () => activeType === "all" ? ALL_LISTINGS : ALL_LISTINGS.filter((l) => l.type === activeType),
    [activeType],
  );

  const s = useMemo(() => makeStyles(colors, isAr, topPad, bottomPad), [colors, isAr, topPad, bottomPad]);

  // ── Shared header/filter rows used in both modes ────────────────────────
  const headerRow = (
    <View style={[s.headerRow, isAr && { flexDirection: "row-reverse" }]}>
      <Pressable style={s.logoutBtn} onPress={handleLogout} hitSlop={10}>
        <MaterialIcons name="logout" size={18} color="rgba(255,255,255,0.80)" />
        <Text style={s.logoutBtnText}>{isAr ? "خروج" : "Sign out"}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[s.headerTitle, isAr && { textAlign: "right" }]}>
          {isAr ? "استكشف العقارات" : "Discover Properties"}
        </Text>
        <View style={[s.locationRow, isAr && { flexDirection: "row-reverse" }]}>
          <MaterialIcons name="location-on" size={14} color={colors.gold} />
          <Text style={s.locationText}>{isAr ? "المملكة العربية السعودية" : "Saudi Arabia"}</Text>
        </View>
      </View>
      <View style={s.countBadge}>
        <Text style={s.countText}>{filtered.length}</Text>
        <Text style={s.countLabel}>{isAr ? "عقار" : "listings"}</Text>
      </View>
    </View>
  );

  const filterPills = (glass: boolean) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[s.filterScroll, isAr && { flexDirection: "row-reverse" }]}
    >
      <Pressable
        onPress={() => saveFilter("all")}
        style={[s.pill, glass && s.glassPill, activeType === "all" && s.pillActive]}
      >
        <Text style={[s.pillText, glass && s.glassPillText, activeType === "all" && s.pillTextActive]}>
          {isAr ? "الكل" : "All"}
        </Text>
      </Pressable>
      {config.propertyTypes.map((pt) => {
        const isActive = activeType === pt.id;
        return (
          <Pressable
            key={pt.id}
            onPress={() => saveFilter(pt.id)}
            style={[s.pill, glass && s.glassPill, isActive && s.pillActive]}
          >
            <MaterialIcons
              name={TYPE_ICON[pt.id] ?? "home"}
              size={14}
              color={isActive ? "#0F2040" : (glass ? "#FFFFFF" : colors.mutedForeground)}
            />
            <Text style={[s.pillText, glass && s.glassPillText, isActive && s.pillTextActive]}>
              {isAr ? pt.labelAr : pt.labelEn}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (viewMode === "heatmap") {
    return (
      <View style={[s.container, Platform.OS === "web" && { height: windowH }]}>
        {/* ── Map fills entire screen ──────────────────────────────────────── */}
        <View style={StyleSheet.absoluteFill}>
          <HeatmapMapView properties={filtered as MapProperty[]} isAr={isAr} isDark={isDark} />
        </View>

        {/* ── Floating glass header ────────────────────────────────────────── */}
        <LinearGradient
          colors={["rgba(8,16,34,0.88)", "rgba(8,16,34,0.60)", "rgba(8,16,34,0.00)"]}
          style={[s.glassHeader, { paddingTop: topPad + 12 }]}
        >
          {headerRow}
        </LinearGradient>

        {/* ── Floating glass filter pills ──────────────────────────────────── */}
        <View style={s.glassFilterWrap}>
          {filterPills(true)}
        </View>

        {/* ── Floating "قائمة" button — bottom left ────────────────────────── */}
        <Pressable
          style={[s.glassListBtn, { bottom: bottomPad + 16 }]}
          onPress={() => { void Haptics.selectionAsync(); setViewMode("cards"); }}
        >
          <MaterialIcons name="grid-view" size={18} color={colors.gold} />
          <Text style={s.glassListBtnText}>{isAr ? "قائمة" : "List"}</Text>
        </Pressable>

      </View>
    );
  }

  return (
    <AnimatedScreen>
    <View style={s.container}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={s.header}>{headerRow}</View>

      {/* ── Type Filter Pills ─────────────────────────────────────────────── */}
      <View style={s.filterWrap}>{filterPills(false)}</View>

      {/* ── View Toggle ───────────────────────────────────────────────────── */}
      <View style={[s.toggleBar, isAr && { flexDirection: "row-reverse" }]}>
        <Pressable
          onPress={() => { void Haptics.selectionAsync(); setViewMode("cards"); }}
          style={[s.toggleSeg, s.toggleSegActive]}
        >
          <MaterialIcons name="grid-view" size={16} color="#0F2040" />
          <Text style={[s.toggleText, s.toggleTextActive]}>{t.heatmap.cardsView}</Text>
        </Pressable>
        <Pressable
          onPress={() => { void Haptics.selectionAsync(); setViewMode("heatmap"); }}
          style={s.toggleSeg}
        >
          <MaterialIcons name="map" size={16} color={colors.mutedForeground} />
          <Text style={s.toggleText}>{isAr ? "الخريطة" : "Map"}</Text>
        </Pressable>
      </View>

      {/* ── Property Grid ─────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <MaterialIcons name="search-off" size={48} color={colors.gold + "40"} />
            <Text style={s.emptyText}>{isAr ? "لا توجد عقارات في هذه الفئة" : "No listings in this category"}</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {filtered.map((listing) => (
              <PropertyCard
                key={listing.id}
                listing={listing}
                onRequest={handleRequest}
                s={s}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
    </AnimatedScreen>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  isAr: boolean,
  topPad: number,
  bottomPad: number,
) {
  const CARD_W = (SCREEN_W - 48) / 2; // 2-column grid with padding

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ── Glass overlays (map mode) ──────────────────────────────────────────
    glassHeader: {
      position:          "absolute",
      top:               0,
      left:              0,
      right:             0,
      backgroundColor:   "transparent",
      paddingHorizontal: 18,
      paddingBottom:     14,
      zIndex:            10,
    },
    glassFilterWrap: {
      position:        "absolute",
      left:            0,
      right:           0,
      top:             topPad + 96,
      backgroundColor: "transparent",
      zIndex:          9,
    },
    glassPill: {
      backgroundColor: "rgba(15,32,64,0.72)",
      borderColor:     "rgba(201,168,76,0.65)",
    },
    glassPillText: {
      color: "#FFFFFF",
    },
    glassListBtn: {
      position:          "absolute",
      left:              16,
      flexDirection:     "row",
      alignItems:        "center",
      gap:               6,
      backgroundColor:   "rgba(8, 16, 34, 0.82)",
      borderWidth:       1,
      borderColor:       colors.gold + "55",
      borderRadius:      22,
      paddingHorizontal: 16,
      paddingVertical:   10,
      zIndex:            10,
    },
    glassListBtnText: {
      color:      colors.gold,
      fontSize:   13,
      fontFamily: "Inter_700Bold",
    },
    glassCountChip: {
      position:          "absolute",
      right:             16,
      flexDirection:     "row",
      alignItems:        "center",
      gap:               5,
      backgroundColor:   "rgba(8, 16, 34, 0.75)",
      borderWidth:       1,
      borderColor:       "rgba(255,255,255,0.10)",
      borderRadius:      20,
      paddingHorizontal: 12,
      paddingVertical:   8,
      zIndex:            10,
    },
    glassCountText: {
      color:      "rgba(255,255,255,0.65)",
      fontSize:   11,
      fontFamily: "Inter_400Regular",
    },

    // ── Header ────────────────────────────────────────────────────────────
    header: {
      backgroundColor:   colors.navy,
      paddingTop:        topPad + 14,
      paddingBottom:     18,
      paddingHorizontal: 18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems:    "center",
    },
    headerTitle: {
      color:            "#FFFFFF",
      fontSize:         22,
      fontFamily:       "Inter_700Bold",
      letterSpacing:    0.3,
      textShadowColor:  "rgba(0,0,0,0.90)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    locationRow: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           3,
      marginTop:     4,
    },
    locationText: {
      color:            "#FFFFFF",
      fontSize:         12,
      fontFamily:       "Inter_400Regular",
      textShadowColor:  "rgba(0,0,0,0.90)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    countBadge: {
      backgroundColor:   "rgba(8,16,34,0.80)",
      borderRadius:      12,
      paddingHorizontal: 12,
      paddingVertical:   8,
      alignItems:        "center",
      borderWidth:       1,
      borderColor:       colors.gold + "55",
    },
    countText: {
      color:      colors.gold,
      fontSize:   20,
      fontFamily: "Inter_700Bold",
    },
    countLabel: {
      color:      colors.gold,
      fontSize:   10,
      fontFamily: "Inter_400Regular",
    },
    logoutBtn: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               3,
      backgroundColor:   "rgba(8,16,34,0.80)",
      borderRadius:      8,
      paddingHorizontal: 7,
      paddingVertical:   4,
      marginRight:       8,
      borderWidth:       1,
      borderColor:       "rgba(255,255,255,0.15)",
    },
    logoutBtnText: {
      color:            "#FFFFFF",
      fontSize:         11,
      fontFamily:       "Inter_600SemiBold",
      textShadowColor:  "rgba(0,0,0,0.80)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },

    // ── Filter ────────────────────────────────────────────────────────────
    filterWrap: {
      backgroundColor:   colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterScroll: {
      paddingHorizontal: 14,
      paddingVertical:   10,
      gap:               8,
      flexDirection:     "row",
    },
    pill: {
      flexDirection:   "row",
      alignItems:      "center",
      gap:             4,
      backgroundColor: colors.card,
      borderWidth:     1,
      borderColor:     colors.border,
      borderRadius:    20,
      paddingHorizontal: 10,
      paddingVertical:   5,
    },
    pillActive: {
      backgroundColor: colors.gold,
      borderColor:     colors.gold,
    },
    pillText: {
      fontSize:   12,
      fontFamily: "Inter_600SemiBold",
      color:      colors.mutedForeground,
    },
    pillTextActive: { color: "#0F2040" },

    // ── View Toggle ─────────────────────────────────────────────────────────
    toggleBar: {
      flexDirection:     "row",
      gap:               8,
      paddingHorizontal: 16,
      paddingTop:        12,
      paddingBottom:     4,
      backgroundColor:   colors.background,
    },
    toggleSeg: {
      flex:            1,
      flexDirection:   "row",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             6,
      backgroundColor: colors.card,
      borderWidth:     1,
      borderColor:     colors.border,
      borderRadius:    12,
      paddingVertical: 10,
    },
    toggleSegActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    toggleTextActive: { color: "#0F2040" },

    // ── Heatmap metric bar (sits above the WebView map) ─────────────────────
    metricBar: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               8,
      paddingHorizontal: 12,
      paddingVertical:   10,
      backgroundColor:   colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    metricPill: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               5,
      backgroundColor:   colors.card,
      borderWidth:       1,
      borderColor:       colors.border,
      borderRadius:      18,
      paddingHorizontal: 14,
      paddingVertical:   7,
    },
    metricPillActive:     { backgroundColor: colors.gold, borderColor: colors.gold },
    metricPillText:       { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    metricPillTextActive: { color: "#0F2040" },
    metricHint:     { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" },
    metricHintText: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    legendDot:      { width: 8, height: 8, borderRadius: 4 },

    // ── Grid ──────────────────────────────────────────────────────────────
    gridContent: {
      padding:       16,
      paddingBottom: bottomPad,
    },
    grid: {
      flexDirection:  "row",
      flexWrap:       "wrap",
      justifyContent: "space-between",
      gap:            12,
    },

    // ── Card ──────────────────────────────────────────────────────────────
    card: {
      width:           CARD_W,
      backgroundColor: colors.card,
      borderRadius:    16,
      overflow:        "hidden",
      shadowColor:     "#000",
      shadowOpacity:   0.06,
      shadowRadius:    8,
      elevation:       2,
    },
    cardThumb: {
      height:          110,
      backgroundColor: colors.navy,
      alignItems:      "center",
      justifyContent:  "center",
      position:        "relative",
    },
    badgeChip: {
      position:        "absolute",
      top:             8,
      right:           8,
      backgroundColor: colors.gold,
      borderRadius:    6,
      paddingHorizontal: 7,
      paddingVertical:   2,
    },
    badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#0F2040" },

    cardBody: { padding: 12 },

    cardRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems:    "center",
      justifyContent:"space-between",
      marginBottom:  4,
    },
    typeChip: {
      backgroundColor: colors.gold + "20",
      borderRadius:    6,
      paddingHorizontal: 7,
      paddingVertical:   2,
    },
    typeChipText: { fontSize: 10, fontFamily: "Inter_700Bold", color: colors.gold },
    cityText: {
      fontSize:   11,
      fontFamily: "Inter_400Regular",
      color:      "#94A3B8",
      flex:       1,
      textAlign:  isAr ? "left" : "right",
    },
    districtText: {
      fontSize:   12,
      fontFamily: "Inter_500Medium",
      color:      colors.foreground,
      marginBottom: 6,
      textAlign:  isAr ? "right" : "left",
    },
    priceText: {
      fontSize:   16,
      fontFamily: "Inter_700Bold",
      color:      colors.gold,
      textAlign:  isAr ? "right" : "left",
    },
    sarText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#94A3B8" },

    metaRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      gap:           10,
      marginTop:     6,
      marginBottom:  10,
    },
    metaItem: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           3,
    },
    metaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8" },

    reqBtn: {
      flexDirection:   "row",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             5,
      backgroundColor: colors.gold,
      borderRadius:    10,
      paddingVertical: 9,
    },
    reqBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#0F2040" },

    waBtn: {
      flexDirection:   "row",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             5,
      backgroundColor: "#25D36618",
      borderWidth:     1,
      borderColor:     "#25D36650",
      borderRadius:    10,
      paddingVertical: 7,
      marginTop:       6,
    },
    waBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#25D366" },

    // ── Empty ──────────────────────────────────────────────────────────────
    empty: {
      alignItems:  "center",
      paddingTop:  80,
      gap:         12,
    },
    emptyText: {
      fontSize:   15,
      fontFamily: "Inter_500Medium",
      color:      "#94A3B8",
      textAlign:  "center",
    },
  });
}
