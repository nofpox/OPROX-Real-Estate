/**
 * AI Architect screen — wraps AIArchitectView WebView with a native credits layer.
 *
 * Credits flow:
 *  1. On mount: load credits from AsyncStorage; give 1 free sketch credit to new users.
 *  2. When WebView sends {type:"generate_request"}: check credits, approve/reject.
 *  3. On approve: decrement credit → inject window.onGenerateApproved() into WebView.
 *  4. On reject: show plans sheet → inject window.onGenerateRejected() into WebView.
 *  5. Plans sheet: tapping a plan adds credits (demo mode — no actual payment).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type WebView from "react-native-webview";

import AIArchitectView from "@/components/AIArchitectView";
import { BRAIN, type Plan } from "@/constants/architectBrain";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

const CREDITS_KEY  = "architect_credits";
const GIVEN_KEY    = "architect_credits_given";

/* ── helpers ─────────────────────────────────────────────────────────────── */
async function loadCredits(): Promise<number> {
  const val = await AsyncStorage.getItem(CREDITS_KEY);
  return val !== null ? parseInt(val, 10) : 0;
}
async function saveCredits(n: number) {
  await AsyncStorage.setItem(CREDITS_KEY, String(n));
}
async function hasGivenFree(): Promise<boolean> {
  return (await AsyncStorage.getItem(GIVEN_KEY)) === "1";
}
async function markGivenFree() {
  await AsyncStorage.setItem(GIVEN_KEY, "1");
}

/* ──────────────────────────────────────────────────────────────────────────
   Plans sheet component
────────────────────────────────────────────────────────────────────────── */
interface PlansSheetProps {
  visible: boolean;
  credits: number;
  onClose: () => void;
  onPurchase: (plan: Plan) => void;
}
function PlansSheet({ visible, credits, onClose, onPurchase }: PlansSheetProps) {
  const insets = useSafeAreaInsets();
  const slide  = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: slide }] }]}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>🏗️ باقات المعماري الذكي</Text>
          <View style={s.creditsBadge}>
            <Text style={s.creditsBadgeLabel}>رصيدك</Text>
            <Text style={s.creditsBadgeNum}>{credits}</Text>
          </View>
        </View>
        <Text style={s.sheetSub}>كل تصميم 3D يستهلك كريديت واحد • التعديلات مجانية</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 14 }}>
          {BRAIN.plans.map((plan) => {
            const isFree = plan.price === 0;
            return (
              <Pressable
                key={plan.code}
                style={({ pressed }) => [s.planCard, pressed && { opacity: 0.85 }]}
                onPress={() => onPurchase(plan)}
              >
                <View style={s.planLeft}>
                  <Text style={s.planName}>{plan.ar_name}</Text>
                  <Text style={s.planCredits}>
                    {plan.credits} كريديت
                    {plan.bonus > 0 && <Text style={s.planBonus}> +{plan.bonus} مجاناً</Text>}
                  </Text>
                </View>
                <View style={s.planRight}>
                  <Text style={[s.planPrice, isFree && { color: "#4ade80" }]}>
                    {isFree ? "مجاني" : `$${plan.price}`}
                  </Text>
                  <View style={[s.planBtn, isFree && { backgroundColor: "#14532d" }]}>
                    <Text style={s.planBtnText}>{isFree ? "ابدأ" : "اشترك"}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
          <Text style={s.demoNote}>⚡ وضع تجريبي — الشراء الفعلي قريباً</Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main screen
────────────────────────────────────────────────────────────────────────── */
export default function AIArchitectScreen() {
  const insets      = useSafeAreaInsets();
  const wvRef       = useRef<WebView>(null);
  const [ready,     setReady]     = useState(false);
  const [credits,   setCredits]   = useState(0);
  const [showPlans, setShowPlans] = useState(false);

  /* ── Init: load credits, give free sketch on first run ── */
  useEffect(() => {
    (async () => {
      const given = await hasGivenFree();
      let c = await loadCredits();
      if (!given) {
        c = c + BRAIN.plans[0].credits; // +1 free sketch
        await saveCredits(c);
        await markGivenFree();
      }
      setCredits(c);
    })();
  }, []);

  /* ── Handle messages from WebView ── */
  const handleMessage = useCallback(
    (type: string) => {
      if (type === "ready") {
        setReady(true);
        return;
      }
      if (type === "generate_request") {
        if (credits >= BRAIN.rules.new_design_cost) {
          const next = credits - BRAIN.rules.new_design_cost;
          setCredits(next);
          saveCredits(next);
          wvRef.current?.injectJavaScript("window.onGenerateApproved(); true;");
        } else {
          setShowPlans(true);
          wvRef.current?.injectJavaScript("window.onGenerateRejected(); true;");
        }
      }
    },
    [credits],
  );

  /* ── Purchase plan (demo — adds credits immediately) ── */
  const handlePurchase = useCallback(
    async (plan: Plan) => {
      const total = credits + plan.credits + plan.bonus;
      setCredits(total);
      await saveCredits(total);
      setShowPlans(false);
    },
    [credits],
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* ── Back button ── */}
      <Pressable style={[s.back, { top: insets.top + 10 }]} onPress={() => router.back()}>
        <Text style={s.backText}>✕</Text>
      </Pressable>

      {/* ── Credits badge ── */}
      {ready && (
        <Pressable
          style={[s.creditsPill, { top: insets.top + 10 }]}
          onPress={() => setShowPlans(true)}
        >
          <Text style={s.creditsPillText}>⚡ {credits} كريديت</Text>
        </Pressable>
      )}

      {/* ── Loading overlay ── */}
      {!ready && (
        <View style={s.loadingOverlay}>
          <Text style={s.loadingEmoji}>🤖</Text>
          <Text style={s.loadingText}>المعماري الذكي</Text>
          <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 16 }} />
        </View>
      )}

      {/* ── WebView ── */}
      <AIArchitectView
        wvRef={wvRef}
        onReady={() => setReady(true)}
        onMessage={handleMessage}
      />

      {/* ── Plans sheet ── */}
      <PlansSheet
        visible={showPlans}
        credits={credits}
        onClose={() => setShowPlans(false)}
        onPurchase={handlePurchase}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Styles
────────────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  back: {
    position: "absolute",
    right: 16,
    zIndex: 100,
    backgroundColor: "rgba(15,32,64,0.9)",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.4)",
  },
  backText: { color: GOLD, fontSize: 16, fontWeight: "700" },

  creditsPill: {
    position: "absolute",
    left: 16,
    zIndex: 100,
    backgroundColor: "rgba(15,32,64,0.92)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.5)",
    flexDirection: "row",
    alignItems: "center",
  },
  creditsPillText: { color: GOLD, fontSize: 13, fontWeight: "800" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0f1e",
    zIndex: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingEmoji: { fontSize: 56, marginBottom: 12 },
  loadingText: { fontSize: 20, fontWeight: "800", color: "#fff" },

  /* Plans sheet */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0f1e3a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
    borderTopWidth: 1.5,
    borderColor: "rgba(201,168,76,0.25)",
  },
  handle: {
    width: 42,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  creditsBadge: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.4)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: "center",
  },
  creditsBadgeLabel: { fontSize: 9, color: GOLD, fontWeight: "700" },
  creditsBadgeNum:   { fontSize: 18, color: GOLD, fontWeight: "800", lineHeight: 22 },
  sheetSub: { fontSize: 12, color: "rgba(200,215,255,0.5)", marginTop: 5, lineHeight: 18 },

  planCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.15)",
  },
  planLeft:    { flex: 1, gap: 3 },
  planName:    { fontSize: 16, fontWeight: "800", color: "#fff" },
  planCredits: { fontSize: 13, color: "rgba(200,215,255,0.6)" },
  planBonus:   { color: "#4ade80", fontWeight: "700" },
  planRight:   { alignItems: "flex-end", gap: 6 },
  planPrice:   { fontSize: 18, fontWeight: "800", color: GOLD },
  planBtn: {
    backgroundColor: "#0055ff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  planBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  demoNote: {
    fontSize: 11,
    color: "rgba(200,215,255,0.3)",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
});
