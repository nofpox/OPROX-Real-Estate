import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TourismMapView, { TourismSpot } from "@/components/TourismMapView";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 48) / 2;

// ── Static tourism data ───────────────────────────────────────────────────────
type Category = "all" | "cultural" | "events" | "nature" | "entertainment" | "religious";

// ATTRACTIONS satisfy TourismSpot exactly (id, emoji, nameAr, nameEn, cityAr,
// cityEn, descAr, descEn, category, lat, lng, mapsUrl, featured?)
const ATTRACTIONS: TourismSpot[] = [
  {
    id: "diriyah",
    emoji: "🏯",
    nameAr: "الدرعية التاريخية",
    nameEn: "Diriyah",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    descAr: "مهد الدولة السعودية وموقع تراث عالمي يونسكو",
    descEn: "Birthplace of the Saudi state, UNESCO World Heritage Site",
    category: "cultural",
    featured: true,
    lat: 24.734, lng: 46.571,
    mapsUrl: "https://maps.google.com/?q=Diriyah,Riyadh",
  },
  {
    id: "masmak",
    emoji: "🏰",
    nameAr: "قصر المصمك",
    nameEn: "Al Masmak Palace",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    descAr: "قلعة الطين التاريخية في قلب الرياض القديمة",
    descEn: "Historic mud-brick fort in the heart of old Riyadh",
    category: "cultural",
    lat: 24.686, lng: 46.713,
    mapsUrl: "https://maps.google.com/?q=Al+Masmak+Palace,Riyadh",
  },
  {
    id: "national-museum",
    emoji: "🏛️",
    nameAr: "متحف المملكة العربية السعودية",
    nameEn: "Saudi National Museum",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    descAr: "8 أجنحة تروي تاريخ الجزيرة العربية عبر العصور",
    descEn: "8 galleries narrating Arabian Peninsula history through the ages",
    category: "cultural",
    lat: 24.699, lng: 46.713,
    mapsUrl: "https://maps.google.com/?q=Saudi+National+Museum,Riyadh",
  },
  {
    id: "alula",
    emoji: "🌄",
    nameAr: "العُلا",
    nameEn: "AlUla",
    cityAr: "العُلا",
    cityEn: "AlUla",
    descAr: "وادي المعجزات — الحِجر وخيبر وجبال الرمال الحمراء",
    descEn: "Valley of Wonders — Hegra, Khaybar & red sand mountains",
    category: "nature",
    featured: true,
    lat: 26.624, lng: 37.921,
    mapsUrl: "https://maps.google.com/?q=AlUla,Saudi+Arabia",
  },
  {
    id: "abha",
    emoji: "⛰️",
    nameAr: "أبها",
    nameEn: "Abha",
    cityAr: "أبها",
    cityEn: "Abha",
    descAr: "سقف المملكة — جبال عسير الخضراء وضباب الصباح",
    descEn: "Kingdom's rooftop — Asir green mountains & morning mist",
    category: "nature",
    lat: 18.216, lng: 42.505,
    mapsUrl: "https://maps.google.com/?q=Abha,Saudi+Arabia",
  },
  {
    id: "kingdom-centre",
    emoji: "🏙️",
    nameAr: "برج المملكة",
    nameEn: "Kingdom Centre Tower",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    descAr: "أعلى برج في الرياض بجسر سماوي فريد وإطلالة 360°",
    descEn: "Riyadh's tallest tower — unique sky bridge & 360° views",
    category: "entertainment",
    lat: 24.691, lng: 46.683,
    mapsUrl: "https://maps.google.com/?q=Kingdom+Centre+Tower,Riyadh",
  },
  {
    id: "boulevard",
    emoji: "🎡",
    nameAr: "بولفارد سيتي الرياض",
    nameEn: "Boulevard City Riyadh",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    descAr: "مدينة الترفيه الضخمة — ملاهٍ وأسواق ومطاعم عالمية",
    descEn: "Mega entertainment city — rides, malls & world-class dining",
    category: "entertainment",
    featured: true,
    lat: 24.803, lng: 46.637,
    mapsUrl: "https://maps.google.com/?q=Boulevard+City+Riyadh",
  },
  {
    id: "riyadh-season",
    emoji: "🎪",
    nameAr: "موسم الرياض",
    nameEn: "Riyadh Season",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    descAr: "أكبر موسم ترفيهي في العالم — حفلات وفعاليات ضخمة",
    descEn: "World's largest entertainment season — concerts & mega events",
    category: "events",
    featured: true,
    lat: 24.787, lng: 46.650,
    mapsUrl: "https://maps.google.com/?q=Riyadh+Season+Boulevard",
  },
  {
    id: "jeddah-historic",
    emoji: "🕌",
    nameAr: "جدة التاريخية",
    nameEn: "Historic Jeddah",
    cityAr: "جدة",
    cityEn: "Jeddah",
    descAr: "الحارة العريقة — أبراج مرجانية وأسواق تراثية يونسكو",
    descEn: "Ancient quarter — coral towers & UNESCO heritage souks",
    category: "cultural",
    lat: 21.487, lng: 39.188,
    mapsUrl: "https://maps.google.com/?q=Al-Balad,Jeddah",
  },
  {
    id: "mecca",
    emoji: "🕋",
    nameAr: "مكة المكرمة",
    nameEn: "Mecca",
    cityAr: "مكة المكرمة",
    cityEn: "Mecca",
    descAr: "أقدس بقاع الأرض — المسجد الحرام والكعبة المشرفة",
    descEn: "Holiest site on Earth — Grand Mosque & the Kaaba",
    category: "religious",
    lat: 21.389, lng: 39.857,
    mapsUrl: "https://maps.google.com/?q=Grand+Mosque,Mecca",
  },
  {
    id: "medina",
    emoji: "🌙",
    nameAr: "المدينة المنورة",
    nameEn: "Medina",
    cityAr: "المدينة المنورة",
    cityEn: "Medina",
    descAr: "المسجد النبوي الشريف وروضة من رياض الجنة",
    descEn: "Prophet's Mosque — one of the most sacred mosques in Islam",
    category: "religious",
    lat: 24.524, lng: 39.570,
    mapsUrl: "https://maps.google.com/?q=Al-Masjid+an-Nabawi,Medina",
  },
  {
    id: "tabuk",
    emoji: "🏜️",
    nameAr: "تبوك وخُريبة",
    nameEn: "Tabuk & Khuraibah",
    cityAr: "تبوك",
    cityEn: "Tabuk",
    descAr: "أعمق نقطة غوص وشعاب مرجانية بحر الأقحوان",
    descEn: "Deepest dive site & pristine Red Sea coral reefs",
    category: "nature",
    lat: 28.383, lng: 36.566,
    mapsUrl: "https://maps.google.com/?q=Tabuk,Saudi+Arabia",
  },
];

// ── Official apps/links ───────────────────────────────────────────────────────
const OFFICIAL_LINKS = [
  {
    id: "visit-saudi",
    emoji: "🇸🇦",
    nameAr: "روح السعودية",
    nameEn: "Visit Saudi",
    descAr: "الموقع الرسمي لهيئة السياحة",
    descEn: "Official Saudi Tourism Authority site",
    url: "https://www.visitsaudi.com",
    color: "#16783A",
  },
  {
    id: "riyadh-season-link",
    emoji: "🎉",
    nameAr: "موسم الرياض",
    nameEn: "Riyadh Season",
    descAr: "تذاكر وجدول الفعاليات",
    descEn: "Tickets & event schedule",
    url: "https://www.riyadhseason.sa",
    color: "#7C3AED",
  },
  {
    id: "sta",
    emoji: "📍",
    nameAr: "هيئة السياحة",
    nameEn: "Saudi Tourism",
    descAr: "الهيئة السعودية للسياحة",
    descEn: "Saudi Tourism Authority",
    url: "https://sta.gov.sa",
    color: "#B45309",
  },
  {
    id: "alula-link",
    emoji: "🌅",
    nameAr: "تجربة العُلا",
    nameEn: "Experience AlUla",
    descAr: "دليل العُلا الرسمي",
    descEn: "Official AlUla guide",
    url: "https://www.experiencealula.com",
    color: "#C2410C",
  },
];

const CAT_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  all:           "explore",
  cultural:      "account-balance",
  events:        "celebration",
  nature:        "landscape",
  entertainment: "local-activity",
  religious:     "mosque",
};

const CAT_COLORS: Record<string, string> = {
  cultural:      "#60A5FA",
  events:        "#A78BFA",
  nature:        "#4ADE80",
  entertainment: "#FB923C",
  religious:     "#D4A843",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { t, isAr } = useLocale();

  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = activeCategory === "all"
    ? ATTRACTIONS
    : ATTRACTIONS.filter((a) => a.category === activeCategory);

  function openLink(url: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Linking.openURL(url);
  }

  function toggleCategory(cat: Category) {
    void Haptics.selectionAsync();
    setActiveCategory(cat);
  }

  const cats: Category[] = ["all", "cultural", "events", "nature", "entertainment", "religious"];
  const s = makeStyles(colors, isAr, topPad, bottomPad);

  // ── Map mode ─────────────────────────────────────────────────────────────────
  if (viewMode === "map") {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Full-screen map */}
        <TourismMapView spots={filtered} isAr={isAr} />

        {/* ── Floating header ─────────────────────────────────────────────────── */}
        <View style={[s.floatHeader, { top: topPad + 10 }]} pointerEvents="box-none">
          <View style={s.floatHeaderInner} pointerEvents="auto">
            <View style={s.floatTitleWrap}>
              <Text style={s.floatTitle}>{t.explore.title}</Text>
              <Text style={s.floatSub}>{filtered.length} {isAr ? "مكان" : "places"}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.viewToggle, pressed && { opacity: 0.75 }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode("list");
              }}
            >
              <MaterialIcons name="list" size={18} color={colors.gold} />
              <Text style={s.viewToggleText}>{isAr ? "قائمة" : "List"}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Floating category pills ─────────────────────────────────────────── */}
        <View style={[s.floatPills, { top: topPad + 68 }]} pointerEvents="box-none">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pointerEvents="auto"
            contentContainerStyle={[s.pillsScroll, isAr && { flexDirection: "row-reverse" }]}
          >
            {cats.map((cat) => {
              const active = cat === activeCategory;
              const catColor = cat === "all" ? colors.gold : (CAT_COLORS[cat] ?? colors.gold);
              return (
                <Pressable
                  key={cat}
                  onPress={() => toggleCategory(cat)}
                  style={[
                    s.floatPill,
                    active && { backgroundColor: catColor, borderColor: catColor },
                  ]}
                >
                  <MaterialIcons
                    name={CAT_ICONS[cat]}
                    size={13}
                    color={active ? "#0A1628" : catColor}
                  />
                  <Text style={[s.floatPillText, active && s.floatPillTextActive, { color: active ? "#0A1628" : catColor }]}>
                    {t.explore.categories[cat as keyof typeof t.explore.categories]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Floating legend ─────────────────────────────────────────────────── */}
        <View
          style={[s.floatLegend, { bottom: bottomPad + 24 }]}
          pointerEvents="none"
        >
          {(["cultural", "nature", "events", "entertainment", "religious"] as const).map((cat) => (
            <View key={cat} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: CAT_COLORS[cat] }]} />
              <Text style={s.legendText}>
                {t.explore.categories[cat as keyof typeof t.explore.categories]}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── List mode ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={[s.headerRow, isAr && { flexDirection: "row-reverse" }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, isAr && { textAlign: "right" }]}>
              {t.explore.title}
            </Text>
            <Text style={[s.headerSub, isAr && { textAlign: "right" }]}>
              {t.explore.subtitle}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.viewToggle, pressed && { opacity: 0.75 }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode("map");
            }}
          >
            <MaterialIcons name="map" size={18} color={colors.gold} />
            <Text style={s.viewToggleText}>{isAr ? "خريطة" : "Map"}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Category pills ──────────────────────────────────────────────────── */}
      <View style={s.pillsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.pillsScroll, isAr && { flexDirection: "row-reverse" }]}
        >
          {cats.map((cat) => {
            const active = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => toggleCategory(cat)}
                style={[s.pill, active && s.pillActive]}
              >
                <MaterialIcons
                  name={CAT_ICONS[cat]}
                  size={14}
                  color={active ? colors.navy : colors.mutedForeground}
                />
                <Text style={[s.pillText, active && s.pillTextActive]}>
                  {t.explore.categories[cat as keyof typeof t.explore.categories]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Visit Saudi banner ────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [s.visitBanner, pressed && { opacity: 0.88 }]}
          onPress={() => openLink("https://www.visitsaudi.com")}
        >
          <View style={[s.visitBannerLeft, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={s.visitEmoji}>🇸🇦</Text>
            <View style={s.visitTextWrap}>
              <Text style={[s.visitTitle, isAr && { textAlign: "right" }]}>
                {t.explore.visitSaudi}
              </Text>
              <Text style={[s.visitDesc, isAr && { textAlign: "right" }]}>
                {t.explore.visitSaudiDesc}
              </Text>
            </View>
          </View>
          <View style={s.visitBtn}>
            <Text style={s.visitBtnText}>{t.explore.openApp}</Text>
            <MaterialIcons name="open-in-new" size={12} color={colors.navy} />
          </View>
        </Pressable>

        {/* ── Attraction grid ───────────────────────────────────────────────── */}
        <View style={[s.grid, isAr && { flexDirection: "row-reverse" }]}>
          {filtered.map((place) => (
            <Pressable
              key={place.id}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
              onPress={() => openLink(place.mapsUrl)}
            >
              {place.featured && (
                <View style={s.featuredBadge}>
                  <Text style={s.featuredText}>{t.explore.featured}</Text>
                </View>
              )}

              <View style={s.cardEmoji}>
                <Text style={s.cardEmojiText}>{place.emoji}</Text>
              </View>

              <Text
                style={[s.cardName, isAr && { textAlign: "right" }]}
                numberOfLines={2}
              >
                {isAr ? place.nameAr : place.nameEn}
              </Text>

              <View style={[s.cardCity, isAr && { flexDirection: "row-reverse" }]}>
                <MaterialIcons name="location-on" size={11} color={colors.gold} />
                <Text style={s.cardCityText}>
                  {isAr ? place.cityAr : place.cityEn}
                </Text>
              </View>

              <Text
                style={[s.cardDesc, isAr && { textAlign: "right" }]}
                numberOfLines={3}
              >
                {isAr ? place.descAr : place.descEn}
              </Text>

              <View style={[s.cardActions, isAr && { flexDirection: "row-reverse" }]}>
                <Pressable
                  style={s.cardActionBtn}
                  onPress={(e) => { e.stopPropagation(); openLink(place.mapsUrl); }}
                  hitSlop={6}
                >
                  <MaterialIcons name="map" size={13} color={colors.gold} />
                  <Text style={s.cardActionText}>{t.explore.openMaps}</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Official apps / links ─────────────────────────────────────────── */}
        <View style={s.officialSection}>
          <Text style={[s.officialTitle, isAr && { textAlign: "right" }]}>
            {t.explore.officialApps}
          </Text>
          <Text style={[s.officialSubtitle, isAr && { textAlign: "right" }]}>
            {t.explore.officialAppsDesc}
          </Text>

          <View style={[s.officialGrid, isAr && { flexDirection: "row-reverse" }]}>
            {OFFICIAL_LINKS.map((link) => (
              <Pressable
                key={link.id}
                style={({ pressed }) => [s.officialCard, pressed && { opacity: 0.85 }]}
                onPress={() => openLink(link.url)}
              >
                <View style={[s.officialIcon, { backgroundColor: link.color + "22" }]}>
                  <Text style={{ fontSize: 22 }}>{link.emoji}</Text>
                </View>
                <Text style={[s.officialName, isAr && { textAlign: "center" }]}>
                  {isAr ? link.nameAr : link.nameEn}
                </Text>
                <Text style={[s.officialDesc, isAr && { textAlign: "center" }]} numberOfLines={2}>
                  {isAr ? link.descAr : link.descEn}
                </Text>
                <View style={[s.officialOpenRow, isAr && { flexDirection: "row-reverse" }]}>
                  <MaterialIcons name="open-in-new" size={11} color={colors.gold} />
                  <Text style={s.officialOpenText}>{t.explore.learnMore}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: bottomPad + 16 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(
  colors: ReturnType<typeof useColors>,
  _isAr: boolean,
  topPad: number,
  _bottomPad: number,
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // ── Header (list mode) ─────────────────────────────────────────────────
    header: {
      backgroundColor:   colors.navy,
      paddingTop:        topPad + 14,
      paddingBottom:     18,
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           12,
    },
    headerTitle: {
      color:      "#FFFFFF",
      fontSize:   22,
      fontFamily: "Inter_700Bold",
    },
    headerSub: {
      color:      colors.mutedForeground,
      fontSize:   13,
      fontFamily: "Inter_400Regular",
      marginTop:  4,
    },

    // ── View toggle button ─────────────────────────────────────────────────
    viewToggle: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               5,
      backgroundColor:   colors.gold + "18",
      borderWidth:       1,
      borderColor:       colors.gold + "50",
      borderRadius:      20,
      paddingHorizontal: 12,
      paddingVertical:   7,
    },
    viewToggleText: {
      color:      colors.gold,
      fontSize:   12,
      fontFamily: "Inter_700Bold",
    },

    // ── Category pills (list mode) ─────────────────────────────────────────
    pillsWrap: {
      backgroundColor: colors.navy,
      paddingBottom:   14,
    },
    pillsScroll: {
      paddingHorizontal: 16,
      gap: 8,
    },
    pill: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               5,
      paddingHorizontal: 12,
      paddingVertical:   7,
      borderRadius:      20,
      backgroundColor:   "rgba(255,255,255,0.08)",
      borderWidth:       1,
      borderColor:       "rgba(255,255,255,0.12)",
    },
    pillActive: {
      backgroundColor: colors.gold,
      borderColor:     colors.gold,
    },
    pillText: {
      color:      colors.mutedForeground,
      fontSize:   12,
      fontFamily: "Inter_500Medium",
    },
    pillTextActive: {
      color:      colors.navy,
      fontFamily: "Inter_700Bold",
    },

    // ── Scroll content ─────────────────────────────────────────────────────
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop:        16,
    },

    // ── Visit Saudi banner ─────────────────────────────────────────────────
    visitBanner: {
      backgroundColor:   colors.navy,
      borderRadius:      16,
      padding:           16,
      marginBottom:      20,
      flexDirection:     "row",
      alignItems:        "center",
      justifyContent:    "space-between",
      borderWidth:       1,
      borderColor:       colors.gold + "40",
    },
    visitBannerLeft: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           12,
      flex:          1,
    },
    visitEmoji:    { fontSize: 32 },
    visitTextWrap: { flex: 1 },
    visitTitle: {
      color:      colors.gold,
      fontSize:   15,
      fontFamily: "Inter_700Bold",
    },
    visitDesc: {
      color:      colors.mutedForeground,
      fontSize:   12,
      fontFamily: "Inter_400Regular",
      marginTop:  2,
    },
    visitBtn: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               4,
      backgroundColor:   colors.gold,
      paddingHorizontal: 12,
      paddingVertical:   8,
      borderRadius:      10,
      marginStart:       10,
    },
    visitBtnText: {
      color:      colors.navy,
      fontSize:   12,
      fontFamily: "Inter_700Bold",
    },

    // ── Attraction grid ────────────────────────────────────────────────────
    grid: {
      flexDirection: "row",
      flexWrap:      "wrap",
      gap:           12,
      marginBottom:  24,
    },
    card: {
      width:           CARD_W,
      backgroundColor: colors.card,
      borderRadius:    16,
      padding:         14,
      borderWidth:     1,
      borderColor:     colors.border,
      position:        "relative",
      overflow:        "hidden",
    },
    featuredBadge: {
      position:          "absolute",
      top:               8,
      right:             8,
      backgroundColor:   colors.gold + "22",
      borderRadius:      6,
      paddingHorizontal: 6,
      paddingVertical:   2,
    },
    featuredText: {
      color:      colors.gold,
      fontSize:   9,
      fontFamily: "Inter_700Bold",
    },
    cardEmoji: {
      width:           44,
      height:          44,
      borderRadius:    12,
      backgroundColor: "rgba(201,168,76,0.10)",
      alignItems:      "center",
      justifyContent:  "center",
      marginBottom:    10,
    },
    cardEmojiText: { fontSize: 22 },
    cardName: {
      color:        "#FFFFFF",
      fontSize:     13,
      fontFamily:   "Inter_700Bold",
      lineHeight:   19,
      marginBottom: 4,
    },
    cardCity: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           3,
      marginBottom:  6,
    },
    cardCityText: {
      color:      colors.gold,
      fontSize:   11,
      fontFamily: "Inter_400Regular",
    },
    cardDesc: {
      color:        colors.mutedForeground,
      fontSize:     11,
      fontFamily:   "Inter_400Regular",
      lineHeight:   16,
      marginBottom: 10,
      flex:         1,
    },
    cardActions: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           8,
    },
    cardActionBtn: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               4,
      backgroundColor:   colors.gold + "18",
      borderWidth:       1,
      borderColor:       colors.gold + "40",
      borderRadius:      8,
      paddingHorizontal: 8,
      paddingVertical:   5,
      flex:              1,
    },
    cardActionText: {
      color:      colors.gold,
      fontSize:   10,
      fontFamily: "Inter_600SemiBold",
    },

    // ── Official apps section ──────────────────────────────────────────────
    officialSection: { marginBottom: 8 },
    officialTitle: {
      color:        "#FFFFFF",
      fontSize:     17,
      fontFamily:   "Inter_700Bold",
      marginBottom: 4,
    },
    officialSubtitle: {
      color:        colors.mutedForeground,
      fontSize:     12,
      fontFamily:   "Inter_400Regular",
      marginBottom: 14,
    },
    officialGrid: {
      flexDirection: "row",
      flexWrap:      "wrap",
      gap:           10,
    },
    officialCard: {
      width:           CARD_W,
      backgroundColor: colors.card,
      borderRadius:    14,
      padding:         14,
      borderWidth:     1,
      borderColor:     colors.border,
      alignItems:      "center",
      gap:             6,
    },
    officialIcon: {
      width:          52,
      height:         52,
      borderRadius:   14,
      alignItems:     "center",
      justifyContent: "center",
      marginBottom:   2,
    },
    officialName: {
      color:      "#FFFFFF",
      fontSize:   13,
      fontFamily: "Inter_700Bold",
      textAlign:  "center",
    },
    officialDesc: {
      color:      colors.mutedForeground,
      fontSize:   11,
      fontFamily: "Inter_400Regular",
      lineHeight: 16,
      textAlign:  "center",
    },
    officialOpenRow: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           4,
      marginTop:     2,
    },
    officialOpenText: {
      color:      colors.gold,
      fontSize:   11,
      fontFamily: "Inter_600SemiBold",
    },

    // ── Floating map-mode overlays ─────────────────────────────────────────
    floatHeader: {
      position:          "absolute",
      left:              16,
      right:             16,
      zIndex:            10,
    },
    floatHeaderInner: {
      flexDirection:     "row",
      alignItems:        "center",
      justifyContent:    "space-between",
      backgroundColor:   "rgba(10,22,40,0.82)",
      borderRadius:      16,
      paddingHorizontal: 14,
      paddingVertical:   10,
      borderWidth:       1,
      borderColor:       "rgba(212,168,67,0.25)",
      gap:               10,
    },
    floatTitleWrap: { flex: 1 },
    floatTitle: {
      color:      "#FFFFFF",
      fontSize:   16,
      fontFamily: "Inter_700Bold",
    },
    floatSub: {
      color:      colors.mutedForeground,
      fontSize:   11,
      fontFamily: "Inter_400Regular",
      marginTop:  1,
    },

    floatPills: {
      position: "absolute",
      left:     0,
      right:    0,
      zIndex:   10,
    },
    floatPill: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               5,
      paddingHorizontal: 12,
      paddingVertical:   7,
      borderRadius:      20,
      backgroundColor:   "rgba(10,22,40,0.80)",
      borderWidth:       1,
      borderColor:       "rgba(255,255,255,0.18)",
    },
    floatPillText: {
      fontSize:   12,
      fontFamily: "Inter_500Medium",
    },
    floatPillTextActive: {
      fontFamily: "Inter_700Bold",
    },

    floatLegend: {
      position:          "absolute",
      left:              16,
      flexDirection:     "row",
      flexWrap:          "wrap",
      gap:               6,
      backgroundColor:   "rgba(10,22,40,0.75)",
      borderRadius:      12,
      paddingHorizontal: 10,
      paddingVertical:   6,
      borderWidth:       1,
      borderColor:       "rgba(255,255,255,0.10)",
      maxWidth:          SCREEN_W - 32,
    },
    legendItem: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           4,
    },
    legendDot: {
      width:        8,
      height:       8,
      borderRadius: 4,
    },
    legendText: {
      color:      "rgba(255,255,255,0.75)",
      fontSize:   10,
      fontFamily: "Inter_400Regular",
    },
  });
}
