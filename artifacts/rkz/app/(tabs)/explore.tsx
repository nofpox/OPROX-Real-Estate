/**
 * استكشف — dual-mode explore screen
 *
 * Tourist mode    → tourism spots map (zoom 6, landmarks across Saudi Arabia)
 * Registered mode → neighborhood POI map (zoom 12, user's immediate area)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  ANDROID TILE FIX — do NOT add overflow:"hidden" or position:"relative"
 *  to the View that wraps TourismMapView. Use StyleSheet.absoluteFill only.
 *  Overlays (header, pill, FAB) are position:"absolute" siblings with zIndex.
 *  This matches the HeatmapMapView pattern in index.tsx.
 *  See memory: webview-leaflet-tiles-blank.md
 * ══════════════════════════════════════════════════════════════════════════
 */
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TourismMapView, { type TourismMapHandle } from "@/components/TourismMapView";
import { useApp } from "@/context/AppContext";
import { logAdminEvent } from "@/hooks/useAIAssistant";
import { useLocale } from "@/hooks/useLocale";
import { getApiBase } from "@/utils/getApiBase";

const VISIT_SAUDI_URL = "https://www.visitsaudi.com";
const DEFAULT_LAT     = 24.7136;
const DEFAULT_LNG     = 46.6753;
const SPOTS_COUNT     = 12;

const RIDES = [
  { key: "uber",   labelAr: "أوبر",  labelEn: "Uber",   scheme: "uber://",   bg: "#000000", emoji: "🚗" },
  { key: "bolt",   labelAr: "بولت",  labelEn: "Bolt",   scheme: "bolt://",   bg: "#34D399", emoji: "⚡" },
  { key: "careem", labelAr: "كريم",  labelEn: "Careem", scheme: "careem://", bg: "#00B140", emoji: "🟢" },
] as const;

export default function ExploreScreen() {
  const insets          = useSafeAreaInsets();
  const { isAr }        = useLocale();
  const { clearAppMode, appMode } = useApp();
  const isTourist       = appMode === "tourist";
  const openTs          = useRef<number>(0);
  const apiBase         = getApiBase();

  const [userLat,  setUserLat]  = useState(DEFAULT_LAT);
  const [userLng,  setUserLng]  = useState(DEFAULT_LNG);
  const [locating, setLocating] = useState(true);

  /* ── Ref to WebView for filter-bar repositioning ── */
  const mapRef = useRef<TourismMapHandle>(null);

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  /* Initial estimate for filter bar top (corrected by onLayout below) */
  const filterBarInitialTop = topPad + (isTourist ? 90 : 76);

  function handleHeaderLayout(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    mapRef.current?.injectJavaScript(`window.setFilterBarTop(${h}); true;`);
  }

  function openRide(scheme: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Linking.openURL(scheme).catch(() => {});
  }

  function handleExit() {
    clearAppMode();
    router.replace("/mode-select" as never);
  }

  useEffect(() => {
    openTs.current = Date.now();
    void logAdminEvent("map_open", isTourist ? "tourist_map_open" : "neighborhood_map_open");

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
      void logAdminEvent("map_close", `map_close|duration_sec:${secs}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = useMemo(() => makeStyles(), []);

  const title = isAr ? "استكشف السعودية" : "Explore Saudi Arabia";

  const subtitle = locating
    ? (isAr ? "جاري تحديد موقعك…" : "Locating you…")
    : isTourist
      ? (isAr ? `${SPOTS_COUNT} مكان + قريب منك` : `${SPOTS_COUNT} spots + nearby`)
      : (isAr ? "مطاعم · كافيهات · خدمات قريبة"  : "Restaurants · Cafés · Nearby services");

  const legendItems: [string, string][] = [
    ["#22c55e", isAr ? "رايق" : "Quiet"],
    ["#eab308", isAr ? "وسط"  : "Mod"],
    ["#ef4444", isAr ? "زحمة" : "Busy"],
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ══ MAP — StyleSheet.absoluteFill ══════════════════════════════════════
          NEVER wrap this in overflow:"hidden" or position:"relative".
          Android GPU tiles are compositor layers that get clipped by those.
          HeatmapMapView uses this exact pattern and tiles work perfectly.    */}
      <View style={StyleSheet.absoluteFill}>
        <TourismMapView
          ref={mapRef}
          isAr={isAr}
          apiBase={apiBase}
          userLat={userLat}
          userLng={userLng}
          hasTabs={!isTourist}
          initialZoom={isTourist ? 6 : 12}
          showTourismSpots={true}
          filterBarTopPx={filterBarInitialTop}
        />
      </View>

      {/* ── Floating header — gradient scrim for readability ──── */}
      <LinearGradient
        colors={["rgba(8,16,34,0.88)", "rgba(8,16,34,0.60)", "rgba(8,16,34,0.00)"]}
        style={[s.header, { paddingTop: topPad + 10 }]}
        onLayout={handleHeaderLayout}
      >
        <View style={[s.headerInner, isAr && { flexDirection: "row-reverse" }]}>

          {/* Title + subtitle */}
          <View style={[s.titleWrap, isAr && { alignItems: "flex-end" }]}>
            <Text style={s.title}>{title}</Text>
            <View style={[s.subRow, isAr && { flexDirection: "row-reverse" }]}>
              {locating && <ActivityIndicator size="small" color="#C9A84C" style={s.spinner} />}
              <Text style={s.sub}>{subtitle}</Text>
            </View>
          </View>

          {/* Right side: exit button (tourist) OR busyness legend (registered) */}
          {isTourist ? (
            <Pressable
              onPress={handleExit}
              style={({ pressed }) => [s.exitBtn, pressed && { opacity: 0.75 }]}
            >
              <MaterialIcons name="logout" size={15} color="#FF4D4D" />
              <Text style={s.exitText}>{isAr ? "خروج" : "Exit"}</Text>
            </Pressable>
          ) : (
            <View style={[s.legend, isAr && { flexDirection: "row-reverse" }]}>
              {legendItems.map(([c, l]) => (
                <View key={l} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: c }]} />
                  <Text style={s.legendTxt}>{l}</Text>
                </View>
              ))}
            </View>
          )}

        </View>
      </LinearGradient>

      {/* ── Bottom bar — taxi row + visit Saudi ──────────────────────────────── */}
      <LinearGradient
        colors={["rgba(8,16,34,0.00)", "rgba(8,16,34,0.85)", "rgba(8,16,34,0.97)"]}
        style={[s.bottomBar, { paddingBottom: bottomPad + 12 }]}
      >
        {/* Taxi row */}
        <View style={s.taxiRow}>
          <Text style={[s.taxiLabel, isAr && { textAlign: "right" }]}>
            {isAr ? "اطلب تاكسي" : "Book a ride"}
          </Text>
          <View style={[s.taxiBtns, isAr && { flexDirection: "row-reverse" }]}>
            {RIDES.map((ride) => (
              <Pressable
                key={ride.key}
                style={({ pressed }) => [s.taxiBtn, { backgroundColor: ride.bg, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => openRide(ride.scheme)}
              >
                <Text style={s.taxiBtnEmoji}>{ride.emoji}</Text>
                <Text style={[s.taxiBtnText, { color: ride.bg === "#000000" ? "#fff" : "#0F2040" }]}>
                  {isAr ? ride.labelAr : ride.labelEn}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Visit Saudi full-width button */}
        <Pressable
          style={({ pressed }) => [s.visitBtn, pressed && { opacity: 0.85 }]}
          onPress={() => { void Haptics.selectionAsync(); void Linking.openURL(VISIT_SAUDI_URL); }}
        >
          <Text style={s.visitFlag}>🇸🇦</Text>
          <View style={s.visitTextWrap}>
            <Text style={s.visitTitle}>{isAr ? "روح السعودية" : "Spirit of Saudi"}</Text>
            <Text style={s.visitSub}>{isAr ? "البوابة السياحية الرسمية" : "Official Tourism Portal"}</Text>
          </View>
          <MaterialIcons name="open-in-new" size={16} color="#C9A84C" />
        </Pressable>
      </LinearGradient>

    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0f2040" },

    /* ── Glass header — fully transparent, text floats above map ── */
    header: {
      position:          "absolute",
      top:               0,
      left:              0,
      right:             0,
      backgroundColor:   "transparent",
      paddingHorizontal: 16,
      paddingBottom:     10,
      zIndex:            10,
    },
    headerInner: {
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "space-between",
    },
    titleWrap: { flex: 1, gap: 2 },
    title: {
      color:            "#FFFFFF",
      fontSize:         17,
      fontFamily:       "Inter_700Bold",
      textShadowColor:  "rgba(0,0,0,0.90)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    subRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
    spinner: { width: 12, height: 12 },
    sub: {
      color:            "#FFFFFF",
      fontSize:         10,
      fontFamily:       "Inter_400Regular",
      textShadowColor:  "rgba(0,0,0,0.90)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    legend:    { flexDirection: "row", gap: 6, alignItems: "center" },
    legendItem:{ flexDirection: "row", alignItems: "center", gap: 3 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendTxt: {
      color:            "#FFFFFF",
      fontSize:         11,
      fontFamily:       "Inter_600SemiBold",
      textShadowColor:  "rgba(0,0,0,0.90)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },

    exitBtn: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               4,
      paddingVertical:   4,
      paddingHorizontal: 9,
      borderRadius:      14,
      borderWidth:       1.5,
      borderColor:       "rgba(255,77,77,0.50)",
      backgroundColor:   "rgba(28,8,8,0.85)",
    },
    exitText: { color: "#FF6B6B", fontSize: 10, fontFamily: "Inter_600SemiBold" },

    /* ── Bottom bar — taxi + visit Saudi ── */
    bottomBar: {
      position:          "absolute",
      bottom:            0,
      left:              0,
      right:             0,
      zIndex:            10,
      paddingHorizontal: 16,
      paddingTop:        24,
      gap:               10,
    },
    taxiRow: { gap: 6 },
    taxiLabel: {
      color:      "rgba(255,255,255,0.55)",
      fontSize:   11,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 4,
    },
    taxiBtns: { flexDirection: "row", gap: 10 },
    taxiBtn: {
      flex:              1,
      flexDirection:     "row",
      alignItems:        "center",
      justifyContent:    "center",
      gap:               6,
      paddingVertical:   11,
      borderRadius:      14,
      shadowColor:       "#000",
      shadowOffset:      { width: 0, height: 2 },
      shadowOpacity:     0.35,
      shadowRadius:      5,
      elevation:         5,
    },
    taxiBtnEmoji: { fontSize: 16 },
    taxiBtnText:  { fontSize: 13, fontFamily: "Inter_700Bold" },

    visitBtn: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               10,
      backgroundColor:   "#1B6E35",
      borderRadius:      14,
      paddingVertical:   13,
      paddingHorizontal: 16,
      shadowColor:       "#000",
      shadowOffset:      { width: 0, height: 2 },
      shadowOpacity:     0.35,
      shadowRadius:      6,
      elevation:         5,
    },
    visitFlag:     { fontSize: 20 },
    visitTextWrap: { flex: 1 },
    visitTitle:    { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
    visitSub:      { color: "rgba(255,255,255,0.60)", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  });
}
