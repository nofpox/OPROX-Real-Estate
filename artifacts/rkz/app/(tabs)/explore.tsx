/**
 * استكشف — Full explore screen
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │  Glass header (flow, fixed) │  ← NOT absolute — WebView starts below it
 *   ├─────────────────────────────┤
 *   │  TourismMapView (flex:1)    │
 *   │   ┌─ filter bar inside HTML ┘
 *   │   └─ (top:10px)
 *   │                             │
 *   │  [روح السعودية pill]        │  ← absolute over map
 *   │                    [🚕 FAB] │  ← absolute over map
 *   └─────────────────────────────┘
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

/* Only used for the count label — server handles the actual data */
const ATTRACTIONS_COUNT = 12;

/* Kept as TourismSpot[] type so TourismMapView prop stays compatible */
const ATTRACTIONS: TourismSpot[] = [];

const RIDES = [
  { key: "uber",   labelAr: "أوبر",  labelEn: "Uber",   scheme: "uber://",   bg: "#000000", fg: "#FFFFFF", emoji: "🚗" },
  { key: "bolt",   labelAr: "بولت",  labelEn: "Bolt",   scheme: "bolt://",   bg: "#34D399", fg: "#000000", emoji: "⚡" },
  { key: "careem", labelAr: "كريم",  labelEn: "Careem", scheme: "careem://", bg: "#00B140", fg: "#FFFFFF", emoji: "🟢" },
] as const;

export default function ExploreScreen() {
  const insets       = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const openTs       = useRef<number>(0);

  const [userLat,  setUserLat]  = useState(DEFAULT_LAT);
  const [userLng,  setUserLng]  = useState(DEFAULT_LNG);
  const [locating, setLocating] = useState(true);
  const apiBase = getApiBase();

  /* FAB */
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
  const s = useMemo(() => makeStyles(), []);

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
    <View style={[s.root, Platform.OS === "web" && { height: SCREEN_H }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Glass header — IN FLOW (not absolute) ─────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <View style={s.headerInner}>
          <View style={[s.titleWrap, isAr && { alignItems: "flex-end" }]}>
            <Text style={s.title}>{t.explore.title}</Text>
            <View style={[s.subRow, isAr && { flexDirection: "row-reverse" }]}>
              {locating && <ActivityIndicator size="small" color="#C9A84C" style={s.spinner} />}
              <Text style={s.sub}>
                {locating
                  ? (isAr ? "جاري تحديد موقعك…" : "Locating you…")
                  : (isAr
                    ? `${ATTRACTIONS_COUNT} مكان + قريب منك`
                    : `${ATTRACTIONS_COUNT} spots + nearby`)}
              </Text>
            </View>
          </View>
          <View style={[s.legend, isAr && { flexDirection: "row-reverse" }]}>
            {([["#22c55e", isAr?"رايق":"Quiet"], ["#eab308", isAr?"وسط":"Mod"], ["#ef4444", isAr?"زحمة":"Busy"]] as [string,string][]).map(([c, l]) => (
              <View key={l} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c }]} />
                <Text style={s.legendTxt}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Map container — fills remaining space ─────────────────────────── */}
      <View style={s.mapWrap}>

        {/* The WebView loads /api/map-view — starts at top of this container */}
        <TourismMapView
          spots={ATTRACTIONS}
          isAr={isAr}
          apiBase={apiBase}
          userLat={userLat}
          userLng={userLng}
        />

        {/* ── روح السعودية pill ─────────────────────────────────────────── */}
        <View
          style={[s.linksBar, { bottom: bottomPad + 14 }]}
          pointerEvents="box-none"
        >
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

        {/* ── 🚕 FAB ────────────────────────────────────────────────────── */}
        <View
          style={[s.fabWrap, { bottom: bottomPad + 16, [isAr ? "left" : "right"]: 16 }]}
          pointerEvents="box-none"
        >
          {subButtons.map(({ ride, translateY, opacity, scale }) => (
            <Animated.View
              key={ride.key}
              style={[s.fabSubWrap, { transform: [{ translateY }, { scale }], opacity }]}
              pointerEvents={fabOpen ? "auto" : "none"}
            >
              {isAr ? (
                <>
                  <TouchableOpacity
                    style={[s.fabSub, { backgroundColor: ride.bg }]}
                    onPress={() => openRide(ride.scheme)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.fabSubEmoji}>{ride.emoji}</Text>
                  </TouchableOpacity>
                  <View style={s.fabSubLabel}>
                    <Text style={s.fabSubLabelTxt}>{ride.labelAr}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={s.fabSubLabel}>
                    <Text style={s.fabSubLabelTxt}>{ride.labelEn}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.fabSub, { backgroundColor: ride.bg }]}
                    onPress={() => openRide(ride.scheme)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.fabSubEmoji}>{ride.emoji}</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          ))}

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
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: "#0f2040", flexDirection: "column" },

    /* Header — part of flow, NOT absolute */
    header: {
      backgroundColor: "rgba(8,16,34,0.95)",
      borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.09)",
      paddingHorizontal: 16, paddingBottom: 10,
      flexShrink: 0,
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

    /* Map container */
    mapWrap: { flex: 1, position: "relative", overflow: "hidden" },

    /* روح السعودية pill */
    linksBar: {
      position: "absolute", alignSelf: "center", zIndex: 10,
      backgroundColor: "rgba(8,16,34,0.88)",
      borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 22,
    },
    visitBtn:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 7 },
    visitFlag:     { fontSize: 17 },
    visitTextWrap: { flexShrink: 1 },
    visitTitle:    { color: "#C9A84C", fontSize: 12, fontFamily: "Inter_700Bold" },
    visitSub:      { color: "rgba(255,255,255,0.42)", fontSize: 9, fontFamily: "Inter_400Regular" },

    /* FAB */
    fabWrap: { position: "absolute", zIndex: 20, alignItems: "flex-end" },
    fab: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: "#0F2040",
      borderWidth: 1.5, borderColor: "#C9A84C",
      alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
    },
    fabEmoji:       { fontSize: 24 },
    fabSubWrap:     { position: "absolute", bottom: 0, flexDirection: "row", alignItems: "center", gap: 8 },
    fabSubLabel:    {
      backgroundColor: "rgba(8,16,34,0.92)",
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
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
