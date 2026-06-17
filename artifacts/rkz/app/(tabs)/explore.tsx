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
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

import TourismMapView from "@/components/TourismMapView";
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

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const s = useMemo(() => makeStyles(), []);

  const title = isTourist
    ? (isAr ? "استكشف السعودية"              : "Explore Saudi Arabia")
    : (isAr ? "استكشف الحي"                  : "Explore Neighborhood");

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

  const subButtons = RIDES.map((ride, i) => {
    const translateY = fabAnim.interpolate({
      inputRange:  [0, 1],
      outputRange: [0, -(62 * (i + 1))],
    });
    const opacity = fabAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
    const scale   = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    return { ride, translateY, opacity, scale };
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ══ MAP — StyleSheet.absoluteFill ══════════════════════════════════════
          NEVER wrap this in overflow:"hidden" or position:"relative".
          Android GPU tiles are compositor layers that get clipped by those.
          HeatmapMapView uses this exact pattern and tiles work perfectly.    */}
      <View style={StyleSheet.absoluteFill}>
        <TourismMapView
          isAr={isAr}
          apiBase={apiBase}
          userLat={userLat}
          userLng={userLng}
          hasTabs={!isTourist}
          initialZoom={isTourist ? 6 : 12}
          showTourismSpots={isTourist}
        />
      </View>

      {/* ── Floating glass header — position:absolute, zIndex:10 ─────────────── */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>

        <View style={[s.headerInner, isAr && { flexDirection: "row-reverse" }]}>
          <View style={[s.titleWrap, isAr && { alignItems: "flex-end" }]}>
            <Text style={s.title}>{title}</Text>
            <View style={[s.subRow, isAr && { flexDirection: "row-reverse" }]}>
              {locating && <ActivityIndicator size="small" color="#C9A84C" style={s.spinner} />}
              <Text style={s.sub}>{subtitle}</Text>
            </View>
          </View>

          {/* Busyness legend */}
          <View style={[s.legend, isAr && { flexDirection: "row-reverse" }]}>
            {legendItems.map(([c, l]) => (
              <View key={l} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c }]} />
                <Text style={s.legendTxt}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Exit button — tourist only */}
        {isTourist && (
          <View style={s.exitRow}>
            <Pressable
              onPress={handleExit}
              style={({ pressed }) => [s.exitBtn, pressed && { opacity: 0.75 }]}
            >
              <MaterialIcons name="logout" size={15} color="#FF4D4D" />
              <Text style={s.exitText}>{isAr ? "خروج" : "Exit"}</Text>
            </Pressable>
          </View>
        )}

      </View>

      {/* ── روح السعودية pill — tourist only, absolute bottom-center ──────────── */}
      {isTourist && (
        <Pressable
          style={[s.linksBar, { bottom: bottomPad + 72 }]}
          onPress={() => { void Haptics.selectionAsync(); void Linking.openURL(VISIT_SAUDI_URL); }}
        >
          <View style={s.visitBtn}>
            <Text style={s.visitFlag}>🇸🇦</Text>
            <View style={s.visitTextWrap}>
              <Text style={s.visitTitle}>{isAr ? "روح السعودية" : "Spirit of Saudi"}</Text>
              <Text style={s.visitSub}>{isAr ? "البوابة السياحية الرسمية" : "Official Tourism Portal"}</Text>
            </View>
            <MaterialIcons name="open-in-new" size={14} color="#C9A84C" />
          </View>
        </Pressable>
      )}

      {/* ── 🚕 FAB — absolute bottom right ───────────────────────────────────── */}
      <View style={[s.fabWrap, { bottom: bottomPad + (isTourist ? 130 : 88), right: 18 }]}>
        {subButtons.map(({ ride, translateY, opacity, scale }) => (
          <Animated.View
            key={ride.key}
            style={[s.fabSubWrap, { transform: [{ translateY }, { scale }], opacity }]}
            pointerEvents={fabOpen ? "auto" : "none"}
          >
            <View style={s.fabSubLabel}>
              <Text style={s.fabSubLabelTxt}>{isAr ? ride.labelAr : ride.labelEn}</Text>
            </View>
            <TouchableOpacity
              style={[s.fabSub, { backgroundColor: ride.bg }]}
              onPress={() => openRide(ride.scheme)}
              activeOpacity={0.8}
            >
              <Text style={s.fabSubEmoji}>{ride.emoji}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <TouchableOpacity style={s.fab} onPress={toggleFab} activeOpacity={0.85}>
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

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0f2040" },

    /* ── Glass header — floats above map ── */
    header: {
      position:          "absolute",
      top:               0,
      left:              0,
      right:             0,
      backgroundColor:   "rgba(8,16,34,0.92)",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.09)",
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
    title:     { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
    subRow:    { flexDirection: "row", alignItems: "center", gap: 5 },
    spinner:   { width: 12, height: 12 },
    sub:       { color: "rgba(255,255,255,0.48)", fontSize: 10, fontFamily: "Inter_400Regular" },
    legend:    { flexDirection: "row", gap: 8, alignItems: "center" },
    legendItem:{ flexDirection: "row", alignItems: "center", gap: 3 },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendTxt: { color: "rgba(255,255,255,0.52)", fontSize: 10, fontFamily: "Inter_400Regular" },

    exitRow: { alignItems: "center", marginTop: 8 },
    exitBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingVertical: 6, paddingHorizontal: 18,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: "rgba(255,77,77,0.35)",
      backgroundColor: "rgba(28,8,8,0.85)",
    },
    exitText: { color: "#FF6B6B", fontSize: 13, fontFamily: "Inter_600SemiBold" },

    /* ── روح السعودية pill ── */
    linksBar: {
      position:        "absolute",
      alignSelf:       "center",
      zIndex:          10,
      backgroundColor: "rgba(8,16,34,0.88)",
      borderWidth:     1,
      borderColor:     "rgba(201,168,76,0.35)",
      borderRadius:    22,
    },
    visitBtn:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 7 },
    visitFlag:     { fontSize: 17 },
    visitTextWrap: { flexShrink: 1 },
    visitTitle:    { color: "#C9A84C", fontSize: 12, fontFamily: "Inter_700Bold" },
    visitSub:      { color: "rgba(255,255,255,0.42)", fontSize: 9, fontFamily: "Inter_400Regular" },

    /* ── FAB ── */
    fabWrap: { position: "absolute", zIndex: 20, alignItems: "flex-end" },
    fab: {
      width: 54, height: 54, borderRadius: 27,
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
      backgroundColor: "rgba(8,16,34,0.92)", borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    },
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
