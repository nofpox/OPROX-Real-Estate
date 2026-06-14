/**
 * استكشف — Combined map with:
 *  - 12 curated tourist spots (emoji pins + busyness rings)
 *  - POI from /api/poi with filter buttons inside the WebView
 *  - 🏠 Apartments filter (from apartments table) with Uber/Bolt/Careem buttons
 *  - 🚕 FAB — opens ride options (Uber / Bolt / Careem) without destination
 */
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TourismMapView, { TourismSpot } from "@/components/TourismMapView";
import { logAdminEvent } from "@/hooks/useAIAssistant";
import { useLocale } from "@/hooks/useLocale";
import { getApiBase } from "@/utils/getApiBase";

const { height: SCREEN_H } = Dimensions.get("window");
const VISIT_SAUDI_URL      = "https://www.visitsaudi.com";
const DEFAULT_LAT          = 24.7136;
const DEFAULT_LNG          = 46.6753;

// ── 12 curated tourist & heritage spots ──────────────────────────────────────
const ATTRACTIONS: TourismSpot[] = [
  { id:"diriyah",        emoji:"🏯", nameAr:"الدرعية التاريخية",     nameEn:"Diriyah",             cityAr:"الرياض",       cityEn:"Riyadh",  descAr:"مهد الدولة السعودية وموقع تراث عالمي يونسكو", descEn:"Birthplace of the Saudi state, UNESCO World Heritage Site", category:"cultural",      featured:true,  lat:24.734,lng:46.571, mapsUrl:"https://maps.google.com/?q=Diriyah,Riyadh",              rating:4.7 },
  { id:"masmak",         emoji:"🏰", nameAr:"قصر المصمك",            nameEn:"Al Masmak Palace",    cityAr:"الرياض",       cityEn:"Riyadh",  descAr:"قلعة الطين التاريخية في قلب الرياض القديمة",  descEn:"Historic mud-brick fort in the heart of old Riyadh",        category:"cultural",      featured:false, lat:24.686,lng:46.713, mapsUrl:"https://maps.google.com/?q=Al+Masmak+Palace,Riyadh",     rating:4.5 },
  { id:"national-museum",emoji:"🏛️", nameAr:"المتحف الوطني السعودي", nameEn:"Saudi National Museum",cityAr:"الرياض",      cityEn:"Riyadh",  descAr:"8 أجنحة تروي تاريخ الجزيرة العربية",          descEn:"8 galleries narrating Arabian Peninsula history",            category:"cultural",      featured:false, lat:24.699,lng:46.713, mapsUrl:"https://maps.google.com/?q=Saudi+National+Museum,Riyadh", rating:4.6 },
  { id:"alula",          emoji:"🌄", nameAr:"العُلا",                nameEn:"AlUla",               cityAr:"العُلا",       cityEn:"AlUla",   descAr:"وادي المعجزات — الحِجر وجبال الرمال الحمراء",  descEn:"Valley of Wonders — Hegra, Khaybar & red sand mountains",   category:"nature",        featured:true,  lat:26.624,lng:37.921, mapsUrl:"https://maps.google.com/?q=AlUla,Saudi+Arabia",          rating:4.9 },
  { id:"abha",           emoji:"⛰️", nameAr:"أبها",                  nameEn:"Abha",                cityAr:"أبها",         cityEn:"Abha",    descAr:"سقف المملكة — جبال عسير الخضراء",              descEn:"Kingdom's rooftop — Asir green mountains & morning mist",   category:"nature",        featured:false, lat:18.216,lng:42.505, mapsUrl:"https://maps.google.com/?q=Abha,Saudi+Arabia",           rating:4.8 },
  { id:"kingdom-centre", emoji:"🏙️", nameAr:"برج المملكة",           nameEn:"Kingdom Centre Tower",cityAr:"الرياض",       cityEn:"Riyadh",  descAr:"أعلى برج في الرياض بجسر سماوي وإطلالة 360°",  descEn:"Riyadh's tallest tower — sky bridge & 360° views",          category:"entertainment", featured:false, lat:24.691,lng:46.683, mapsUrl:"https://maps.google.com/?q=Kingdom+Centre+Tower,Riyadh", rating:4.4 },
  { id:"boulevard",      emoji:"🎡", nameAr:"بولفارد سيتي الرياض",   nameEn:"Boulevard City Riyadh",cityAr:"الرياض",      cityEn:"Riyadh",  descAr:"مدينة الترفيه الضخمة — ملاهٍ وأسواق",          descEn:"Mega entertainment city — rides, malls & world-class dining",category:"entertainment", featured:true,  lat:24.803,lng:46.637, mapsUrl:"https://maps.google.com/?q=Boulevard+City+Riyadh",      rating:4.5 },
  { id:"riyadh-season",  emoji:"🎪", nameAr:"موسم الرياض",           nameEn:"Riyadh Season",       cityAr:"الرياض",       cityEn:"Riyadh",  descAr:"أكبر موسم ترفيهي في العالم",                   descEn:"World's largest entertainment season — concerts & mega events",category:"events",      featured:true,  lat:24.787,lng:46.650, mapsUrl:"https://maps.google.com/?q=Riyadh+Season+Boulevard",    rating:4.6 },
  { id:"jeddah-historic",emoji:"🕌", nameAr:"جدة التاريخية",         nameEn:"Historic Jeddah",     cityAr:"جدة",          cityEn:"Jeddah",  descAr:"أبراج مرجانية وأسواق تراثية يونسكو",            descEn:"Ancient quarter — coral towers & UNESCO heritage souks",     category:"cultural",      featured:false, lat:21.487,lng:39.188, mapsUrl:"https://maps.google.com/?q=Al-Balad,Jeddah",            rating:4.7 },
  { id:"mecca",          emoji:"🕋", nameAr:"مكة المكرمة",           nameEn:"Mecca",               cityAr:"مكة المكرمة",  cityEn:"Mecca",   descAr:"أقدس بقاع الأرض — المسجد الحرام",              descEn:"Holiest site on Earth — Grand Mosque & the Kaaba",          category:"religious",     featured:false, lat:21.389,lng:39.857, mapsUrl:"https://maps.google.com/?q=Grand+Mosque,Mecca",         rating:5.0 },
  { id:"medina",         emoji:"🌙", nameAr:"المدينة المنورة",        nameEn:"Medina",              cityAr:"المدينة المنورة",cityEn:"Medina", descAr:"المسجد النبوي الشريف",                           descEn:"Prophet's Mosque — one of Islam's most sacred sites",        category:"religious",     featured:false, lat:24.524,lng:39.570, mapsUrl:"https://maps.google.com/?q=Al-Masjid+an-Nabawi,Medina", rating:4.9 },
  { id:"tabuk",          emoji:"🏜️", nameAr:"تبوك وخُريبة",          nameEn:"Tabuk & Khuraibah",   cityAr:"تبوك",         cityEn:"Tabuk",   descAr:"أعمق نقطة غوص وشعاب مرجانية",                  descEn:"Deepest dive site & pristine Red Sea coral reefs",          category:"nature",        featured:false, lat:28.383,lng:36.566, mapsUrl:"https://maps.google.com/?q=Tabuk,Saudi+Arabia",         rating:4.6 },
];

// ── Ride options for the FAB ─────────────────────────────────────────────────
const RIDES = [
  { key: "uber",   labelAr: "أوبر",  labelEn: "Uber",   scheme: "uber://",    bg: "#000000", fg: "#FFFFFF", emoji: "🚗" },
  { key: "bolt",   labelAr: "بولت",  labelEn: "Bolt",   scheme: "bolt://",    bg: "#34D399", fg: "#000000", emoji: "⚡" },
  { key: "careem", labelAr: "كريم",  labelEn: "Careem", scheme: "careem://",  bg: "#00B140", fg: "#FFFFFF", emoji: "🟢" },
] as const;

export default function ExploreScreen() {
  const insets       = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const openTs       = useRef<number>(0);

  const [userLat,  setUserLat]  = useState(DEFAULT_LAT);
  const [userLng,  setUserLng]  = useState(DEFAULT_LNG);
  const [locating, setLocating] = useState(true);
  const apiBase = getApiBase();

  // ── FAB state ────────────────────────────────────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  function toggleFab() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, friction: 6, tension: 80 }).start();
    setFabOpen(v => !v);
  }

  function openRide(scheme: string) {
    setFabOpen(false);
    Animated.timing(fabAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    void Linking.openURL(scheme).catch(() => {});
  }

  useEffect(() => {
    openTs.current = Date.now();
    void logAdminEvent("map_open", "tourist_map_open");

    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLat(loc.coords.latitude);
          setUserLng(loc.coords.longitude);
        }
      } catch { /* stay on default */ } finally {
        setLocating(false);
      }
    })();

    return () => {
      const secs = Math.round((Date.now() - openTs.current) / 1000);
      void logAdminEvent("map_close", `tourist_map_close | duration_sec:${secs}`);
    };
  }, []);

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const s = useMemo(() => makeStyles(topPad, bottomPad), [topPad, bottomPad]);

  // Animated sub-button positions (stacked upward)
  const subButtons = RIDES.map((ride, i) => {
    const translateY = fabAnim.interpolate({
      inputRange:  [0, 1],
      outputRange: [0, -(60 * (i + 1))],
    });
    const opacity = fabAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
    const scale   = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    return { ride, translateY, opacity, scale };
  });

  return (
    <View style={[s.root, Platform.OS === "web" && { height: SCREEN_H }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Full-screen map ─────────────────────────────────────────────────── */}
      <TourismMapView
        spots={ATTRACTIONS}
        isAr={isAr}
        apiBase={apiBase}
        userLat={userLat}
        userLng={userLng}
      />

      {/* ── Glass header ───────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]} pointerEvents="box-none">
        <View style={s.headerInner} pointerEvents="auto">
          <View style={[s.titleWrap, isAr && { alignItems: "flex-end" }]}>
            <Text style={s.title}>{t.explore.title}</Text>
            <View style={s.subRow}>
              {locating && <ActivityIndicator size="small" color="#C9A84C" style={s.spinner} />}
              <Text style={s.sub}>
                {locating
                  ? (isAr ? "جاري تحديد موقعك…" : "Locating you…")
                  : (isAr ? `${ATTRACTIONS.length} مكان + قريب منك` : `${ATTRACTIONS.length} spots + nearby`)}
              </Text>
            </View>
          </View>
          <View style={[s.legend, isAr && { flexDirection: "row-reverse" }]}>
            {[["#22c55e", isAr?"رايق":"Quiet"], ["#eab308", isAr?"وسط":"Mod"], ["#ef4444", isAr?"زحمة":"Busy"]].map(([c, l]) => (
              <View key={l} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c }]} />
                <Text style={s.legendTxt}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── روح السعودية pill ────────────────────────────────────────────────── */}
      <View style={[s.linksBar, { bottom: bottomPad + 50 }]} pointerEvents="box-none">
        <Pressable
          pointerEvents="auto"
          onPress={() => { void Haptics.selectionAsync(); void Linking.openURL(VISIT_SAUDI_URL); }}
          style={({ pressed }) => [s.visitBtn, pressed && { opacity: 0.75 }]}
        >
          <Text style={s.visitFlag}>🇸🇦</Text>
          <View style={s.visitTextWrap}>
            <Text style={s.visitTitle}>{isAr ? "روح السعودية" : "Spirit of Saudi"}</Text>
            <Text style={s.visitSub}>{isAr ? "البوابة السياحية الرسمية" : "Official Tourism Portal"}</Text>
          </View>
          <MaterialIcons name="open-in-new" size={14} color="#C9A84C" />
        </Pressable>
      </View>

      {/* ── 🚕 FAB — ride options ─────────────────────────────────────────────── */}
      <View style={[s.fabWrap, { bottom: bottomPad + 52, right: 16 }]} pointerEvents="box-none">
        {/* Sub-buttons (Uber / Bolt / Careem) */}
        {subButtons.map(({ ride, translateY, opacity, scale }) => (
          <Animated.View
            key={ride.key}
            style={[s.fabSubWrap, { transform: [{ translateY }, { scale }], opacity }]}
            pointerEvents={fabOpen ? "auto" : "none"}
          >
            <View style={[s.fabSubLabel, isAr && s.fabSubLabelRtl]}>
              <Text style={s.fabSubLabelTxt}>{isAr ? ride.labelAr : ride.labelEn}</Text>
            </View>
            <TouchableOpacity
              style={[s.fabSub, { backgroundColor: ride.bg }]}
              onPress={() => openRide(ride.scheme)}
              activeOpacity={0.8}
            >
              <Text style={[s.fabSubEmoji]}>{ride.emoji}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Main FAB */}
        <TouchableOpacity
          pointerEvents="auto"
          style={s.fab}
          onPress={toggleFab}
          activeOpacity={0.85}
        >
          <Animated.Text style={[
            s.fabEmoji,
            { transform: [{ rotate: fabAnim.interpolate({ inputRange:[0,1], outputRange:["0deg","45deg"] }) }] },
          ]}>
            🚕
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(topPad: number, _bottomPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0f2040" },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
      backgroundColor: "rgba(8,16,34,0.82)",
      borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.09)",
      paddingHorizontal: 16, paddingBottom: 10,
    },
    headerInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    titleWrap:   { gap: 2 },
    title:       { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
    subRow:      { flexDirection: "row", alignItems: "center", gap: 5 },
    spinner:     { width: 12, height: 12 },
    sub:         { color: "rgba(255,255,255,0.48)", fontSize: 10, fontFamily: "Inter_400Regular" },
    legend:      { flexDirection: "row", gap: 8, alignItems: "center" },
    legendItem:  { flexDirection: "row", alignItems: "center", gap: 3 },
    legendDot:   { width: 6, height: 6, borderRadius: 3 },
    legendTxt:   { color: "rgba(255,255,255,0.52)", fontSize: 10, fontFamily: "Inter_400Regular" },

    // ── روح السعودية ──────────────────────────────────────────────────────────
    linksBar: {
      position: "absolute", alignSelf: "center", zIndex: 10, overflow: "hidden",
      backgroundColor: "rgba(8,16,34,0.88)",
      borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 22,
    },
    visitBtn:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 7 },
    visitFlag:     { fontSize: 17 },
    visitTextWrap: { flexShrink: 1 },
    visitTitle:    { color: "#C9A84C", fontSize: 12, fontFamily: "Inter_700Bold" },
    visitSub:      { color: "rgba(255,255,255,0.42)", fontSize: 9, fontFamily: "Inter_400Regular" },

    // ── FAB ──────────────────────────────────────────────────────────────────
    fabWrap: {
      position: "absolute", zIndex: 20,
      alignItems: "flex-end",
    },
    fab: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: "#0F2040",
      borderWidth: 1.5, borderColor: "#C9A84C",
      alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
    },
    fabEmoji: { fontSize: 24 },

    fabSubWrap: {
      position: "absolute", bottom: 0,
      flexDirection: "row", alignItems: "center", gap: 8,
    },
    fabSubLabel: {
      backgroundColor: "rgba(8,16,34,0.92)",
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    },
    fabSubLabelRtl: { /* label on the right when RTL, no extra style needed since row-order is natural */ },
    fabSubLabelTxt: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
    fabSub: {
      width: 46, height: 46, borderRadius: 23,
      alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
    },
    fabSubEmoji: { fontSize: 20 },
  });
}
