/**
 * Villa4D — Full-screen 4D villa experience
 * Day/night toggle + rain + animated sky
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
import Villa4DView from "@/components/Villa4DView";

export default function Villa4DScreen() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f2040" />

      {/* 4D Scene */}
      <Villa4DView onReady={() => setReady(true)} />

      {/* Loading overlay */}
      {!ready && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#c9a84c" />
          <Text style={s.loadingText}>جارٍ تحميل الفيلا الثلاثية الأبعاد...</Text>
          <Text style={s.loadingHint}>OPROX 4D Villa</Text>
        </View>
      )}

      {/* Close button */}
      <View style={[s.closeWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Pressable style={s.closeBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={20} color="#c9a84c" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#87ceeb",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f2040",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    zIndex: 10,
  },
  loadingText: {
    color: "#c9a84c",
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    fontWeight: "600",
  },
  loadingHint: {
    color: "rgba(201,168,76,0.45)",
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
    backgroundColor: "rgba(15,32,64,0.88)",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
