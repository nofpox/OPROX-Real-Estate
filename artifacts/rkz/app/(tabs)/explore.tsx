/**
 * استكشف — placeholder screen
 * الخريطة السياحية ستعود قريباً من جديد.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocale } from "@/hooks/useLocale";

export default function ExploreScreen() {
  const insets      = useSafeAreaInsets();
  const { isAr }    = useLocale();

  return (
    <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 80 }]}>
      <Text style={s.emoji}>🗺️</Text>
      <Text style={[s.title, isAr && s.rtl]}>
        {isAr ? "خريطة السياحة" : "Tourism Map"}
      </Text>
      <Text style={[s.sub, isAr && s.rtl]}>
        {isAr ? "قريباً — تحت التطوير" : "Coming soon — under development"}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0E1A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emoji: { fontSize: 56 },
  title: {
    color: "#C9A84C",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  sub: {
    color: "rgba(245,240,232,0.45)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  rtl: { textAlign: "center" },
});
