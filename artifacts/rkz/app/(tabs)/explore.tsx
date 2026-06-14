/**
 * استكشف — Tourism map mode.
 * Full-screen Leaflet map with tourist-spot pins:
 *  - Pin label: ⭐ rating (mirrors price pill in real-estate mode)
 *  - Colored busyness ring: 🟢 quiet · 🟡 moderate · 🔴 busy
 *  - Auto-refreshes every 15 min in background
 *  - Floating category filter pills: ديني / ترفيه / طبيعة / فعاليات / ثقافي
 *  - No list mode, no banners, no user-rating buttons
 */
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";
import React, { useMemo, useState } from "react";
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

const { height: SCREEN_H } = Dimensions.get("window");

// ── Category types ─────────────────────────────────────────────────────────
type Category = "all" | "cultural" | "events" | "nature" | "entertainment" | "religious";

const CAT_COLORS: Record<string, string> = {
  cultural:      "#60A5FA",
  events:        "#A78BFA",
  nature:        "#4ADE80",
  entertainment: "#FB923C",
  religious:     "#D4A843",
};

const CAT_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  all:           "explore",
  cultural:      "account-balance",
  events:        "celebration",
  nature:        "landscape",
  entertainment: "local-activity",
  religious:     "mosque",
};

// ── Tourist spots with ratings ─────────────────────────────────────────────
const ATTRACTIONS: TourismSpot[] = [
  {
    id: "diriyah", emoji: "🏯",
    nameAr: "الدرعية التاريخية", nameEn: "Diriyah",
    cityAr: "الرياض", cityEn: "Riyadh",
    descAr: "مهد الدولة السعودية وموقع تراث عالمي يونسكو",
    descEn: "Birthplace of the Saudi state, UNESCO World Heritage Site",
    category: "cultural", featured: true,
    lat: 24.734, lng: 46.571,
    mapsUrl: "https://maps.google.com/?q=Diriyah,Riyadh",
    rating: 4.7,
  },
  {
    id: "masmak", emoji: "🏰",
    nameAr: "قصر المصمك", nameEn: "Al Masmak Palace",
    cityAr: "الرياض", cityEn: "Riyadh",
    descAr: "قلعة الطين التاريخية في قلب الرياض القديمة",
    descEn: "Historic mud-brick fort in the heart of old Riyadh",
    category: "cultural",
    lat: 24.686, lng: 46.713,
    mapsUrl: "https://maps.google.com/?q=Al+Masmak+Palace,Riyadh",
    rating: 4.5,
  },
  {
    id: "national-museum", emoji: "🏛️",
    nameAr: "متحف المملكة العربية السعودية", nameEn: "Saudi National Museum",
    cityAr: "الرياض", cityEn: "Riyadh",
    descAr: "8 أجنحة تروي تاريخ الجزيرة العربية عبر العصور",
    descEn: "8 galleries narrating Arabian Peninsula history through the ages",
    category: "cultural",
    lat: 24.699, lng: 46.713,
    mapsUrl: "https://maps.google.com/?q=Saudi+National+Museum,Riyadh",
    rating: 4.6,
  },
  {
    id: "alula", emoji: "🌄",
    nameAr: "العُلا", nameEn: "AlUla",
    cityAr: "العُلا", cityEn: "AlUla",
    descAr: "وادي المعجزات — الحِجر وخيبر وجبال الرمال الحمراء",
    descEn: "Valley of Wonders — Hegra, Khaybar & red sand mountains",
    category: "nature", featured: true,
    lat: 26.624, lng: 37.921,
    mapsUrl: "https://maps.google.com/?q=AlUla,Saudi+Arabia",
    rating: 4.9,
  },
  {
    id: "abha", emoji: "⛰️",
    nameAr: "أبها", nameEn: "Abha",
    cityAr: "أبها", cityEn: "Abha",
    descAr: "سقف المملكة — جبال عسير الخضراء وضباب الصباح",
    descEn: "Kingdom's rooftop — Asir green mountains & morning mist",
    category: "nature",
    lat: 18.216, lng: 42.505,
    mapsUrl: "https://maps.google.com/?q=Abha,Saudi+Arabia",
    rating: 4.8,
  },
  {
    id: "kingdom-centre", emoji: "🏙️",
    nameAr: "برج المملكة", nameEn: "Kingdom Centre Tower",
    cityAr: "الرياض", cityEn: "Riyadh",
    descAr: "أعلى برج في الرياض بجسر سماوي فريد وإطلالة 360°",
    descEn: "Riyadh's tallest tower — unique sky bridge & 360° views",
    category: "entertainment",
    lat: 24.691, lng: 46.683,
    mapsUrl: "https://maps.google.com/?q=Kingdom+Centre+Tower,Riyadh",
    rating: 4.4,
  },
  {
    id: "boulevard", emoji: "🎡",
    nameAr: "بولفارد سيتي الرياض", nameEn: "Boulevard City Riyadh",
    cityAr: "الرياض", cityEn: "Riyadh",
    descAr: "مدينة الترفيه الضخمة — ملاهٍ وأسواق ومطاعم عالمية",
    descEn: "Mega entertainment city — rides, malls & world-class dining",
    category: "entertainment", featured: true,
    lat: 24.803, lng: 46.637,
    mapsUrl: "https://maps.google.com/?q=Boulevard+City+Riyadh",
    rating: 4.5,
  },
  {
    id: "riyadh-season", emoji: "🎪",
    nameAr: "موسم الرياض", nameEn: "Riyadh Season",
    cityAr: "الرياض", cityEn: "Riyadh",
    descAr: "أكبر موسم ترفيهي في العالم — حفلات وفعاليات ضخمة",
    descEn: "World's largest entertainment season — concerts & mega events",
    category: "events", featured: true,
    lat: 24.787, lng: 46.650,
    mapsUrl: "https://maps.google.com/?q=Riyadh+Season+Boulevard",
    rating: 4.6,
  },
  {
    id: "jeddah-historic", emoji: "🕌",
    nameAr: "جدة التاريخية", nameEn: "Historic Jeddah",
    cityAr: "جدة", cityEn: "Jeddah",
    descAr: "الحارة العريقة — أبراج مرجانية وأسواق تراثية يونسكو",
    descEn: "Ancient quarter — coral towers & UNESCO heritage souks",
    category: "cultural",
    lat: 21.487, lng: 39.188,
    mapsUrl: "https://maps.google.com/?q=Al-Balad,Jeddah",
    rating: 4.7,
  },
  {
    id: "mecca", emoji: "🕋",
    nameAr: "مكة المكرمة", nameEn: "Mecca",
    cityAr: "مكة المكرمة", cityEn: "Mecca",
    descAr: "أقدس بقاع الأرض — المسجد الحرام والكعبة المشرفة",
    descEn: "Holiest site on Earth — Grand Mosque & the Kaaba",
    category: "religious",
    lat: 21.389, lng: 39.857,
    mapsUrl: "https://maps.google.com/?q=Grand+Mosque,Mecca",
    rating: 5.0,
  },
  {
    id: "medina", emoji: "🌙",
    nameAr: "المدينة المنورة", nameEn: "Medina",
    cityAr: "المدينة المنورة", cityEn: "Medina",
    descAr: "المسجد النبوي الشريف وروضة من رياض الجنة",
    descEn: "Prophet's Mosque — one of the most sacred mosques in Islam",
    category: "religious",
    lat: 24.524, lng: 39.570,
    mapsUrl: "https://maps.google.com/?q=Al-Masjid+an-Nabawi,Medina",
    rating: 4.9,
  },
  {
    id: "tabuk", emoji: "🏜️",
    nameAr: "تبوك وخُريبة", nameEn: "Tabuk & Khuraibah",
    cityAr: "تبوك", cityEn: "Tabuk",
    descAr: "أعمق نقطة غوص وشعاب مرجانية بحر الأقحوان",
    descEn: "Deepest dive site & pristine Red Sea coral reefs",
    category: "nature",
    lat: 28.383, lng: 36.566,
    mapsUrl: "https://maps.google.com/?q=Tabuk,Saudi+Arabia",
    rating: 4.6,
  },
];

const CATS: Category[] = ["all", "religious", "entertainment", "nature", "events", "cultural"];

// ── Official Saudi tourism links ────────────────────────────────────────────
const SAUDI_LINKS = [
  { icon: "🌐", labelAr: "الروح السعودية",   labelEn: "Visit Saudi",       url: "https://www.visitsaudi.com" },
  { icon: "🎪", labelAr: "هيئة الترفيه",     labelEn: "Entertainment",     url: "https://www.gea.gov.sa" },
  { icon: "✈️", labelAr: "هيئة السياحة",     labelEn: "Tourism Authority", url: "https://sta.gov.sa" },
  { icon: "🏟️", labelAr: "موسم الرياض",      labelEn: "Riyadh Season",     url: "https://www.riyadhseason.sa" },
  { icon: "🏯", labelAr: "الدرعية",          labelEn: "Diriyah",           url: "https://www.diriyah.sa" },
  { icon: "🌄", labelAr: "العُلا",           labelEn: "AlUla",             url: "https://www.experiencealula.com" },
  { icon: "🌊", labelAr: "البحر الأحمر",     labelEn: "Red Sea",           url: "https://www.theredsea.sa" },
  { icon: "🏙️", labelAr: "نيوم",            labelEn: "NEOM",              url: "https://www.neom.com" },
  { icon: "🎭", labelAr: "موسم جدة",         labelEn: "Jeddah Season",     url: "https://www.jeddahseason.sa" },
  { icon: "🌿", labelAr: "مشروع قديّة",      labelEn: "Qiddiya",           url: "https://www.qiddiya.com" },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const colors          = useColors();
  const insets          = useSafeAreaInsets();
  const { t, isAr }     = useLocale();

  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = useMemo(
    () => activeCategory === "all"
      ? ATTRACTIONS
      : ATTRACTIONS.filter((a) => a.category === activeCategory),
    [activeCategory],
  );

  function toggleCategory(cat: Category) {
    void Haptics.selectionAsync();
    setActiveCategory(cat);
  }

  const s = useMemo(() => makeStyles(topPad, bottomPad), [topPad, bottomPad]);

  return (
    <View style={[s.root, Platform.OS === "web" && { height: SCREEN_H }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Full-screen map ──────────────────────────────────────────────── */}
      <TourismMapView spots={filtered} isAr={isAr} />

      {/* ── Floating glass header ────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]} pointerEvents="box-none">
        <View style={s.headerInner} pointerEvents="auto">
          <View style={[s.titleWrap, isAr && { alignItems: "flex-end" }]}>
            <Text style={s.title}>{t.explore.title}</Text>
            <Text style={s.sub}>
              {filtered.length}{" "}{isAr ? "مكان سياحي" : "places"}
            </Text>
          </View>
          {/* Busyness legend */}
          <View style={[s.legend, isAr && { flexDirection: "row-reverse" }]}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#22c55e" }]} />
              <Text style={s.legendTxt}>{isAr ? "رايق" : "Quiet"}</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#eab308" }]} />
              <Text style={s.legendTxt}>{isAr ? "وسط" : "Mod"}</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#ef4444" }]} />
              <Text style={s.legendTxt}>{isAr ? "زحمة" : "Busy"}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Floating category pills ──────────────────────────────────────── */}
      <View style={[s.pillsWrap, { top: topPad + 82 }]} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pointerEvents="auto"
          contentContainerStyle={[s.pillsScroll, isAr && { flexDirection: "row-reverse" }]}
        >
          {CATS.map((cat) => {
            const active   = cat === activeCategory;
            const catColor = cat === "all" ? colors.gold : (CAT_COLORS[cat] ?? colors.gold);
            return (
              <Pressable
                key={cat}
                onPress={() => toggleCategory(cat)}
                style={[
                  s.pill,
                  active && { backgroundColor: catColor, borderColor: catColor },
                ]}
              >
                <MaterialIcons
                  name={CAT_ICONS[cat]}
                  size={13}
                  color={active ? "#0A1628" : catColor}
                />
                <Text style={[s.pillText, { color: active ? "#0A1628" : catColor }, active && { fontFamily: "Inter_700Bold" }]}>
                  {t.explore.categories[cat as keyof typeof t.explore.categories]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── الروح السعودية — Official links bar ─────────────────────────── */}
      <View style={[s.linksBar, { bottom: bottomPad + 8 }]} pointerEvents="box-none">
        {/* Label */}
        <View style={s.linksLabelWrap}>
          <Text style={s.linksLabel}>{isAr ? "🇸🇦 الروح السعودية" : "🇸🇦 Saudi Links"}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pointerEvents="auto"
          contentContainerStyle={[s.linksScroll, isAr && { flexDirection: "row-reverse" }]}
        >
          {SAUDI_LINKS.map((link) => (
            <Pressable
              key={link.url}
              onPress={() => {
                void Haptics.selectionAsync();
                void Linking.openURL(link.url);
              }}
              style={({ pressed }) => [s.linkChip, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.linkIcon}>{link.icon}</Text>
              <Text style={s.linkLabel} numberOfLines={1}>
                {isAr ? link.labelAr : link.labelEn}
              </Text>
              <MaterialIcons name="open-in-new" size={9} color="rgba(201,168,76,0.7)" />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
function makeStyles(topPad: number, _bottomPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0a1628" },

    // ── Floating header ────────────────────────────────────────────────────
    header: {
      position:          "absolute",
      top:               0,
      left:              0,
      right:             0,
      backgroundColor:   "rgba(8,16,34,0.80)",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.09)",
      paddingHorizontal: 18,
      paddingBottom:     12,
      zIndex:            10,
    },
    headerInner: {
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "space-between",
    },
    titleWrap: { gap: 2 },
    title: {
      color:      "#FFFFFF",
      fontSize:   18,
      fontFamily: "Inter_700Bold",
    },
    sub: {
      color:      "rgba(255,255,255,0.50)",
      fontSize:   11,
      fontFamily: "Inter_400Regular",
    },

    // ── Busyness legend (inline in header) ────────────────────────────────
    legend: {
      flexDirection: "row",
      gap:           10,
      alignItems:    "center",
    },
    legendItem: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           4,
    },
    legendDot: {
      width:        7,
      height:       7,
      borderRadius: 4,
    },
    legendTxt: {
      color:      "rgba(255,255,255,0.55)",
      fontSize:   10,
      fontFamily: "Inter_400Regular",
    },

    // ── Floating pills ─────────────────────────────────────────────────────
    pillsWrap: {
      position:          "absolute",
      left:              0,
      right:             0,
      backgroundColor:   "rgba(8,16,34,0.74)",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.08)",
      zIndex:            9,
    },
    pillsScroll: {
      paddingHorizontal: 14,
      paddingVertical:   8,
      gap:               8,
      flexDirection:     "row",
    },
    pill: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               5,
      paddingHorizontal: 12,
      paddingVertical:   6,
      borderRadius:      20,
      borderWidth:       1,
      borderColor:       "rgba(255,255,255,0.18)",
      backgroundColor:   "rgba(255,255,255,0.08)",
    },
    pillText: {
      fontSize:   12,
      fontFamily: "Inter_400Regular",
    },

    // ── الروح السعودية links bar ──────────────────────────────────────────
    linksBar: {
      position:        "absolute",
      left:            0,
      right:           0,
      backgroundColor: "rgba(8,16,34,0.88)",
      borderTopWidth:  1,
      borderTopColor:  "rgba(201,168,76,0.25)",
      zIndex:          10,
    },
    linksLabelWrap: {
      paddingHorizontal: 14,
      paddingTop:        8,
      paddingBottom:     4,
    },
    linksLabel: {
      color:      "#C9A84C",
      fontSize:   11,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },
    linksScroll: {
      paddingHorizontal: 12,
      paddingBottom:     10,
      gap:               8,
      flexDirection:     "row",
    },
    linkChip: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               5,
      paddingHorizontal: 10,
      paddingVertical:   6,
      borderRadius:      16,
      borderWidth:       1,
      borderColor:       "rgba(201,168,76,0.30)",
      backgroundColor:   "rgba(201,168,76,0.08)",
    },
    linkIcon: {
      fontSize: 13,
    },
    linkLabel: {
      color:      "#F5F0E8",
      fontSize:   11,
      fontFamily: "Inter_400Regular",
      maxWidth:   90,
    },
  });
}
