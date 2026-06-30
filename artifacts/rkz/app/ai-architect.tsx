export const brain = {
  plans: [
    { code: 'sketch',    ar_name: 'سكيتش',   price: 0,   credits: 1,  bonus: 0 },
    { code: 'concept',   ar_name: 'كونسبت',   price: 39,  credits: 5,  bonus: 0 },
    { code: 'plan',      ar_name: 'مخطط',     price: 78,  credits: 10, bonus: 2 },
    { code: 'executive', ar_name: 'تنفيذي',   price: 156, credits: 20, bonus: 4 },
    { code: 'studio',    ar_name: 'استوديو',  price: 312, credits: 40, bonus: 8 },
  ],
  rules: { guest_login: false, new_design_cost: 1, edit_cost: 0 },
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AIArchitectView from "@/components/AIArchitectView";

/* ── Constants ───────────────────────────────────────────────────────────── */
const NAVY        = "#0f2040";
const GOLD        = "#c9a84c";
const CREDITS_KEY = "architect_credits";
const GIVEN_KEY   = "architect_credits_given";
const TRIPO_KEY   = "tripo_key";

type Mode = "auto" | "level" | "manual";
type Plan = (typeof brain.plans)[number];

const MODES: { key: Mode; label: string }[] = [
  { key: "auto",   label: "أوتو"  },
  { key: "level",  label: "مستوى" },
  { key: "manual", label: "يدوي"  },
];

/* ── Credit helpers ──────────────────────────────────────────────────────── */
async function loadCredits(): Promise<number> {
  const v = await AsyncStorage.getItem(CREDITS_KEY);
  return v !== null ? parseInt(v, 10) : 0;
}
async function saveCredits(n: number) {
  await AsyncStorage.setItem(CREDITS_KEY, String(n));
}
async function hasGivenFree(): Promise<boolean> {
  return (await AsyncStorage.getItem(GIVEN_KEY)) === "1";
}

/* ── PlansSheet ──────────────────────────────────────────────────────────── */
function PlansSheet({
  visible,
  credits,
  onClose,
  onPurchase,
}: {
  visible: boolean;
  credits: number;
  onClose: () => void;
  onPurchase: (plan: Plan) => void;
}) {
  const insets = useSafeAreaInsets();
  const slide  = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : 500,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <Animated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: slide }] }]}
      >
        <View style={s.handle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>🏗️ باقات المعماري الذكي</Text>
          <View style={s.badge}>
            <Text style={s.badgeLabel}>رصيدك</Text>
            <Text style={s.badgeNum}>{credits}</Text>
          </View>
        </View>
        <Text style={s.sheetSub}>كل تصميم 3D يستهلك كريديت واحد • التعديلات مجانية</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 14 }}>
          {brain.plans.map((plan) => {
            const isFree = plan.price === 0;
            return (
              <Pressable
                key={plan.code}
                style={({ pressed }) => [s.planCard, pressed && { opacity: 0.82 }]}
                onPress={() => onPurchase(plan)}
              >
                <View style={s.planLeft}>
                  <Text style={s.planName}>{plan.ar_name}</Text>
                  <Text style={s.planCredits}>
                    {plan.credits} كريديت
                    {plan.bonus > 0 && (
                      <Text style={s.planBonus}> +{plan.bonus} مجاناً</Text>
                    )}
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
          <Text style={s.demoNote}>⚡ وضع تجريبي — الدفع الفعلي قريباً</Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/* ── Key Input Modal ─────────────────────────────────────────────────────── */
function KeyModal({
  visible,
  onSave,
}: {
  visible: boolean;
  onSave: (key: string) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.keyOverlay}>
        <View style={s.keyCard}>
          <Text style={s.keyEmoji}>🔑</Text>
          <Text style={s.keyTitle}>مفتاح Tripo3D مطلوب</Text>
          <Text style={s.keySub}>
            سجّل في tripo3d.ai واحصل على مفتاحك المجاني.{"\n"}
            يُحفظ مرة واحدة فقط على جهازك.
          </Text>
          <TextInput
            style={s.keyInput}
            value={val}
            onChangeText={setVal}
            placeholder="tsk_..."
            placeholderTextColor="rgba(200,215,255,0.3)"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[s.keyBtn, !val.trim() && { opacity: 0.4 }]}
            onPress={() => val.trim() && onSave(val.trim())}
            disabled={!val.trim()}
          >
            <Text style={s.keyBtnText}>حفظ والمتابعة</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────────── */
export default function AIArchitectScreen() {
  const insets    = useSafeAreaInsets();
  const [tripoKey,  setTripoKey]  = useState<string | null>(null);
  const [showKey,   setShowKey]   = useState(false);
  const [mode,      setMode]      = useState<Mode>("auto");
  const [credits,   setCredits]   = useState(0);
  const [showPlans, setShowPlans] = useState(false);

  /* ── Init: load key + credits ── */
  useEffect(() => {
    (async () => {
      const key = await AsyncStorage.getItem(TRIPO_KEY);
      if (!key) {
        setShowKey(true);
      } else {
        setTripoKey(key);
      }
      const given = await hasGivenFree();
      let c = await loadCredits();
      if (!given) {
        c += brain.plans[0].credits;
        await saveCredits(c);
        await AsyncStorage.setItem(GIVEN_KEY, "1");
      }
      setCredits(c);
    })();
  }, []);

  const handleSaveKey = useCallback(async (key: string) => {
    await AsyncStorage.setItem(TRIPO_KEY, key);
    setTripoKey(key);
    setShowKey(false);
  }, []);

  const handleNeedCredits = useCallback(() => setShowPlans(true), []);

  const handleCreditUsed = useCallback(async () => {
    const next = credits - brain.rules.new_design_cost;
    setCredits(next);
    await saveCredits(next);
  }, [credits]);

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
      {/* ── Key modal (first launch) ── */}
      <KeyModal visible={showKey} onSave={handleSaveKey} />

      {/* ── Top bar ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>✕</Text>
        </Pressable>

        {/* Mode tabs */}
        <View style={s.modeTabs}>
          {MODES.map((m) => (
            <Pressable
              key={m.key}
              style={[s.modeTab, mode === m.key && s.modeTabActive]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[s.modeTabText, mode === m.key && s.modeTabTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Credits pill */}
        <Pressable style={s.creditsPill} onPress={() => setShowPlans(true)}>
          <Text style={s.creditsText}>⚡ {credits}</Text>
        </Pressable>
      </View>

      {/* ── Content (only render when we have a key) ── */}
      {tripoKey ? (
        <AIArchitectView
          mode={mode}
          tripoKey={tripoKey}
          brain={brain}
          onNeedCredits={handleNeedCredits}
          onCreditUsed={handleCreditUsed}
        />
      ) : (
        !showKey && (
          <View style={s.waiting}>
            <Text style={s.waitingText}>في انتظار مفتاح Tripo3D...</Text>
          </View>
        )
      )}

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

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  /* Top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#0a0f1e",
    gap: 8,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,168,76,0.12)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15,32,64,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
  },
  backText: { color: GOLD, fontSize: 14, fontWeight: "700" },

  modeTabs: { flex: 1, flexDirection: "row", gap: 5 },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  modeTabActive: {
    backgroundColor: "rgba(201,168,76,0.15)",
    borderColor: "rgba(201,168,76,0.45)",
  },
  modeTabText:       { fontSize: 12, fontWeight: "700", color: "rgba(200,215,255,0.45)" },
  modeTabTextActive: { color: GOLD },

  creditsPill: {
    backgroundColor: "rgba(15,32,64,0.9)",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.45)",
  },
  creditsText: { color: GOLD, fontSize: 13, fontWeight: "800" },

  waiting: { flex: 1, alignItems: "center", justifyContent: "center" },
  waitingText: { color: "rgba(200,215,255,0.4)", fontSize: 14 },

  /* Plans sheet */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
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
    borderColor: "rgba(201,168,76,0.22)",
  },
  handle: {
    width: 42,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  badge: {
    backgroundColor: "rgba(201,168,76,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.38)",
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 4,
    alignItems: "center",
  },
  badgeLabel: { fontSize: 8,  color: GOLD, fontWeight: "700" },
  badgeNum:   { fontSize: 17, color: GOLD, fontWeight: "800", lineHeight: 21 },
  sheetSub: { fontSize: 11, color: "rgba(200,215,255,0.45)", marginTop: 5 },

  planCard: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 15,
    padding: 14,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.13)",
  },
  planLeft:    { flex: 1, gap: 3 },
  planName:    { fontSize: 15, fontWeight: "800", color: "#fff" },
  planCredits: { fontSize: 12, color: "rgba(200,215,255,0.55)" },
  planBonus:   { color: "#4ade80", fontWeight: "700" },
  planRight:   { alignItems: "flex-end", gap: 6 },
  planPrice:   { fontSize: 17, fontWeight: "800", color: GOLD },
  planBtn: {
    backgroundColor: "#0055ff",
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  planBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  demoNote: {
    fontSize: 11,
    color: "rgba(200,215,255,0.28)",
    textAlign: "center",
    marginVertical: 12,
  },

  /* Key modal */
  keyOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  keyCard: {
    backgroundColor: "#0f1e3a",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.25)",
  },
  keyEmoji: { fontSize: 48 },
  keyTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  keySub: {
    fontSize: 13,
    color: "rgba(200,215,255,0.55)",
    textAlign: "center",
    lineHeight: 20,
  },
  keyInput: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.3)",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    textAlign: "left",
  },
  keyBtn: {
    backgroundColor: GOLD,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  keyBtnText: { color: "#0a0f1e", fontSize: 15, fontWeight: "800" },
});
