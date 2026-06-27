import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  I18nManager,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

export default function LanguageSelectScreen() {
  const { setAppLang, setLangChosen } = useApp();
  const [selected, setSelected] = useState<"ar" | "en">("ar");

  const pick = (lang: "ar" | "en") => {
    setSelected(lang);
    Haptics.selectionAsync().catch(() => {});
  };

  const onContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await setAppLang(selected);
    await setLangChosen(true);
    I18nManager.forceRTL(selected === "ar");
    router.replace("/(tabs)" as never);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={s.container}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logoText}>HousIn</Text>
          <Text style={s.logoEn}>هاوسن</Text>
        </View>

        <Text style={s.heading}>اختر اللغة · Choose Language</Text>

        {/* Options */}
        <View style={s.options}>
          {([
            { lang: "ar" as const, label: "العربية", sub: "Arabic" },
            { lang: "en" as const, label: "English", sub: "الإنجليزية" },
          ] as const).map((opt) => (
            <Pressable
              key={opt.lang}
              style={[s.option, selected === opt.lang && s.optionSelected]}
              onPress={() => pick(opt.lang)}
            >
              <Text style={[s.optLabel, selected === opt.lang && s.optLabelSel]}>
                {opt.label}
              </Text>
              <Text style={[s.optSub, selected === opt.lang && s.optSubSel]}>
                {opt.sub}
              </Text>
              {selected === opt.lang && <View style={s.dot} />}
            </Pressable>
          ))}
        </View>

        <Pressable style={s.btn} onPress={onContinue}>
          <Text style={s.btnText}>متابعة · Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: NAVY },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 32,
  },
  logoWrap: { alignItems: "center", gap: 4 },
  logoText: { fontSize: 48, fontFamily: "Inter_700Bold", color: GOLD, letterSpacing: 2 },
  logoEn:   { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  heading:  { fontSize: 16, color: "rgba(255,255,255,0.8)", textAlign: "center" },
  options:  { width: "100%", gap: 16 },
  option: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  optionSelected: { borderColor: GOLD, backgroundColor: "rgba(201,168,76,0.12)" },
  optLabel:    { fontSize: 22, fontFamily: "Inter_600SemiBold", color: "#fff" },
  optLabelSel: { color: GOLD },
  optSub:      { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  optSubSel:   { color: "rgba(201,168,76,0.8)" },
  dot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
  },
  btn: {
    width: "100%",
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: NAVY },
});
