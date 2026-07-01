/**
 * City3D (live/Mapbox) — Real 3D map of Riyadh buildings.
 * Disabled placeholder until a valid Mapbox access token is configured
 * (EXPO_PUBLIC_MAPBOX_TOKEN). Swap this screen's body for a WebView
 * running the Mapbox GL JS 3D-buildings HTML once the token is set.
 */
import React from "react";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocale } from "@/hooks/useLocale";

export default function City3DLiveScreen() {
  const insets = useSafeAreaInsets();
  const { isAr } = useLocale();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f14" />

      <View style={s.center}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🗺️</Text>
        <Text style={s.title}>{isAr ? "قريباً" : "Coming Soon"}</Text>
        <Text style={s.subtitle}>
          {isAr
            ? "هذه الخريطة الثلاثية الأبعاد الحقيقية لمدينة الرياض تحتاج توكن Mapbox — سيتم تفعيلها قريباً."
            : "This real 3D map of Riyadh needs a Mapbox access token — it will be enabled soon."}
        </Text>
      </View>

      <View style={[s.closeWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Pressable style={s.closeBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={20} color="#c7ccd4" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b0f14",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    color: "rgba(200,205,215,0.65)",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  closeWrap: {
    position: "absolute",
    right: 14,
    zIndex: 20,
    pointerEvents: "box-none",
  } as never,
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(20,25,32,0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(160,170,185,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
