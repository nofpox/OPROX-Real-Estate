/**
 * AI Architect full-screen screen
 */
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AIArchitectView from "@/components/AIArchitectView";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

export default function AIArchitectScreen() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Back button */}
      <Pressable
        style={[s.back, { top: insets.top + 10 }]}
        onPress={() => router.back()}
      >
        <Text style={s.backText}>✕</Text>
      </Pressable>

      {/* Loading overlay */}
      {!ready && (
        <View style={s.loadingOverlay}>
          <Text style={s.loadingEmoji}>🤖</Text>
          <Text style={s.loadingText}>المعماري الذكي</Text>
          <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 16 }} />
        </View>
      )}

      <AIArchitectView onReady={() => setReady(true)} />
    </View>
  );
}

const s = StyleSheet.create({
  back: {
    position: "absolute",
    right: 16,
    zIndex: 100,
    backgroundColor: "rgba(15,32,64,0.88)",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.4)",
  },
  backText: { color: GOLD, fontSize: 16, fontWeight: "700" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0f1e",
    zIndex: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingEmoji: { fontSize: 56, marginBottom: 12 },
  loadingText: { fontSize: 20, fontWeight: "800", color: "#fff" },
});
