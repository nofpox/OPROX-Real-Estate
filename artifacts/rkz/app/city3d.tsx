/**
 * City3D — Full-screen 3D city explorer screen
 * Accessible from home screen banner
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import City3DView from "@/components/City3DView";

export default function City3DScreen() {
  const insets       = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#040810" />

      {/* 3D Scene */}
      <City3DView onReady={() => setReady(true)} />

      {/* Loading overlay */}
      {!ready && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#0078ff" />
          <Text style={s.loadingText}>جارٍ تحميل المدينة الثلاثية الأبعاد...</Text>
          <Text style={s.loadingHint}>Housin 3D · Riyadh</Text>
        </View>
      )}

      {/* Close button */}
      <View style={[s.closeWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Pressable style={s.closeBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={20} color="#7bc8ff" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#040810",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#040810",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    zIndex: 10,
  },
  loadingText: {
    color: "#7bc8ff",
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    fontWeight: "600",
  },
  loadingHint: {
    color: "rgba(120,180,255,0.45)",
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
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
    backgroundColor: "rgba(0,10,40,0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(0,120,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});
