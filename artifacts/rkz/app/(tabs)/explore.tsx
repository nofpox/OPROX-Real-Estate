/**
 * استكشف — Live map fetching hotels/restaurants/cafes from Overpass API.
 * Filters (الكل / فنادق / مطاعم / كافيهات) and legend are inside the map HTML.
 */
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";
import React, { useMemo } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TourismMapView from "@/components/TourismMapView";
import { useLocale } from "@/hooks/useLocale";

const { height: SCREEN_H } = Dimensions.get("window");
const VISIT_SAUDI_URL = "https://www.visitsaudi.com";

export default function ExploreScreen() {
  const insets        = useSafeAreaInsets();
  const { t, isAr }  = useLocale();

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const s = useMemo(() => makeStyles(topPad, bottomPad), [topPad, bottomPad]);

  return (
    <View style={[s.root, Platform.OS === "web" && { height: SCREEN_H }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Full-screen Overpass map ──────────────────────────────────────── */}
      <TourismMapView isAr={isAr} />

      {/* ── Floating glass header ────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]} pointerEvents="box-none">
        <View style={s.headerInner} pointerEvents="auto">
          <View style={[s.titleWrap, isAr && { alignItems: "flex-end" }]}>
            <Text style={s.title}>{t.explore.title}</Text>
            <Text style={s.sub}>
              {isAr ? "بيانات مباشرة — فنادق · مطاعم · كافيهات" : "Live data — Hotels · Restaurants · Cafes"}
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

      {/* ── روح السعودية ─────────────────────────────────────────────────── */}
      <View style={[s.linksBar, { bottom: bottomPad + 8 }]} pointerEvents="box-none">
        <Pressable
          pointerEvents="auto"
          onPress={() => {
            void Haptics.selectionAsync();
            void Linking.openURL(VISIT_SAUDI_URL);
          }}
          style={({ pressed }) => [s.visitBtn, pressed && { opacity: 0.75 }]}
        >
          <Text style={s.visitFlag}>🇸🇦</Text>
          <View style={s.visitTextWrap}>
            <Text style={s.visitTitle}>{isAr ? "روح السعودية" : "Spirit of Saudi"}</Text>
            <Text style={s.visitSub}>{isAr ? "البوابة السياحية الرسمية" : "Official Tourism Portal"}</Text>
          </View>
          <MaterialIcons name="open-in-new" size={16} color="#C9A84C" />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(topPad: number, _bottomPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0a1628" },

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

    legend: {
      flexDirection: "row",
      gap:           8,
      alignItems:    "center",
    },
    legendItem: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           3,
    },
    legendDot: {
      width:        6,
      height:       6,
      borderRadius: 3,
    },
    legendTxt: {
      color:      "rgba(255,255,255,0.55)",
      fontSize:   10,
      fontFamily: "Inter_400Regular",
    },

    linksBar: {
      position:        "absolute",
      alignSelf:       "center",
      backgroundColor: "rgba(8,16,34,0.88)",
      borderWidth:     1,
      borderColor:     "rgba(201,168,76,0.35)",
      borderRadius:    24,
      zIndex:          10,
      overflow:        "hidden",
    },
    visitBtn: {
      flexDirection:     "row",
      alignItems:        "center",
      gap:               8,
      paddingHorizontal: 14,
      paddingVertical:   8,
    },
    visitFlag:     { fontSize: 18 },
    visitTextWrap: { flexShrink: 1 },
    visitTitle: {
      color:      "#C9A84C",
      fontSize:   13,
      fontFamily: "Inter_700Bold",
    },
    visitSub: {
      color:      "rgba(255,255,255,0.45)",
      fontSize:   10,
      fontFamily: "Inter_400Regular",
    },
  });
}
