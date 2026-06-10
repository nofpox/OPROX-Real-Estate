import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";

const LOGO = require("@/assets/images/rozoz-logo-eagle.png");
const { width } = Dimensions.get("window");
const LOGO_W = Math.min(width * 0.52, 220);
const LOGO_H = Math.round(LOGO_W / 2.6);

const NAVY  = "#0A1628";
const GOLD  = "#C9A84C";
const WHITE = "#F5F0E8";

export default function GateScreen() {
  return <Redirect href="/(tabs)" />;
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: NAVY,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 22,
  },

  logoWrap: {
    alignItems:   "center",
    marginBottom: 40,
  },
  tagline: {
    color:       "rgba(245,240,232,0.40)",
    fontSize:    12,
    fontFamily:  "Inter_400Regular",
    marginTop:   8,
    textAlign:   "center",
    letterSpacing: 0.3,
  },

  prompt: {
    color:        WHITE,
    fontSize:     22,
    fontFamily:   "Inter_700Bold",
    textAlign:    "center",
    marginBottom: 8,
  },
  promptSub: {
    color:        "rgba(245,240,232,0.45)",
    fontSize:     13,
    fontFamily:   "Inter_400Regular",
    textAlign:    "center",
    marginBottom: 36,
  },

  cards: {
    flexDirection: "row",
    gap:           14,
    width:         "100%",
    marginBottom:  28,
  },
  card: {
    flex:              1,
    backgroundColor:   "rgba(255,255,255,0.05)",
    borderWidth:       1.5,
    borderColor:       "rgba(255,255,255,0.10)",
    borderRadius:      20,
    alignItems:        "center",
    paddingVertical:   24,
    paddingHorizontal: 14,
    gap:               10,
  },
  cardPressed: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor:     GOLD,
  },
  iconCircle: {
    width:          68,
    height:         68,
    borderRadius:   18,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   4,
  },
  cardTitle: {
    color:      WHITE,
    fontSize:   16,
    fontFamily: "Inter_700Bold",
    textAlign:  "center",
  },
  cardDesc: {
    color:      "rgba(245,240,232,0.50)",
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    lineHeight: 18,
  },
  cardTag: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    marginTop:     4,
  },
  cardTagText: {
    fontSize:   11,
    fontFamily: "Inter_500Medium",
  },

  footer: {
    color:      "rgba(245,240,232,0.25)",
    fontSize:   11,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
  },
});
