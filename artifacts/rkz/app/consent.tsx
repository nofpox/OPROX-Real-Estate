import { router } from "expo-router";
import React, { useState } from "react";
import {
  I18nManager,
  
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";

const GOLD  = "#C9A84C";
const NAVY  = "#0F2040";
const GREEN = "#16A34A";

export default function ConsentScreen() {
  const { acceptConsent, user } = useApp();
  const [checked, setChecked] = useState(false);
  const [error, setError]     = useState("");

  function toggleCheck() {
    setChecked(v => !v);
    setError("");
  }

  function handleAccept() {
    if (!checked) {
      setError("يجب الموافقة على الشروط أولاً · You must agree to the terms first");
      return;
    }
    acceptConsent(user?.phone ?? null);
    router.replace("/welcome" as never);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>

        {/* Brand name */}
        <Text style={{ color: GOLD, fontSize: 28, fontWeight: "800", letterSpacing: 3, marginBottom: 8 }}>ESTETI IN</Text>

        {/* Heading — Arabic */}
        <Text style={s.headingAr}>أهلاً في استيتي إن</Text>
        {/* Heading — English */}
        <Text style={s.headingEn}>Welcome to ESTETI IN</Text>

        <View style={s.divider} />

        {/* Checkbox row */}
        <Pressable style={s.checkRow} onPress={toggleCheck}>
          <View style={[s.checkbox, checked && s.checkboxChecked]}>
            {checked && <Text style={s.checkmark}>✓</Text>}
          </View>
          <View style={s.checkTextWrap}>
            <Text style={s.checkLabelAr}>أوافق على الشروط والأحكام وسياسة الخصوصية</Text>
            <Text style={s.checkLabelEn}>I agree to the Terms &amp; Privacy Policy</Text>
          </View>
        </Pressable>

        {/* Error */}
        {error ? (
          <View style={s.errorRow}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Links */}
        <View style={s.linksRow}>
          <TouchableOpacity onPress={() => router.push("/terms" as never)}>
            <Text style={s.link}>الشروط والأحكام{"\n"}Terms &amp; Conditions</Text>
          </TouchableOpacity>
          <Text style={s.linkSep}>·</Text>
          <TouchableOpacity onPress={() => router.push("/privacy" as never)}>
            <Text style={s.link}>سياسة الخصوصية{"\n"}Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <View style={s.spacer} />

        {/* Accept button */}
        <TouchableOpacity
          style={[s.btn, !checked && s.btnDisabled]}
          onPress={handleAccept}
          activeOpacity={checked ? 0.85 : 1}
        >
          <Text style={[s.btnTextAr, !checked && s.btnTextDisabled]}>موافق ومتابعة</Text>
          <Text style={[s.btnTextEn, !checked && s.btnTextDisabled]}>Agree &amp; Continue</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flex: 1,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 32,
    paddingBottom:   40,
  },

  logo: { width: 160, height: 64, marginBottom: 24 },

  headingAr: {
    fontSize: 26, fontWeight: "700", color: NAVY,
    textAlign: "center", writingDirection: "rtl",
  },
  headingEn: {
    fontSize: 15, color: GOLD,
    textAlign: "center", marginTop: 4, letterSpacing: 0.5,
  },

  divider: {
    width: 40, height: 2, borderRadius: 1,
    backgroundColor: GOLD, opacity: 0.6,
    marginVertical: 24,
  },

  checkRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems:    "flex-start",
    alignSelf:     "stretch",
    gap:           12,
    marginBottom:  10,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
    marginTop: 2, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  checkmark: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", lineHeight: 18 },

  checkTextWrap: { flex: 1 },
  checkLabelAr: {
    fontSize: 14, color: "#374151",
    textAlign: "right", writingDirection: "rtl", lineHeight: 20,
  },
  checkLabelEn: {
    fontSize: 12, color: "#6B7280",
    textAlign: "right", marginTop: 2,
  },

  errorRow:  { alignSelf: "stretch", alignItems: "flex-end", marginBottom: 10 },
  errorText: { fontSize: 12, color: "#DC2626", textAlign: "right", writingDirection: "rtl" },

  linksRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            16,
    justifyContent: "center",
    marginBottom:   4,
  },
  link: {
    fontSize: 13, color: "#2563EB",
    fontWeight: "500", textDecorationLine: "underline",
    textAlign: "center", lineHeight: 19,
  },
  linkSep: { fontSize: 14, color: "#9CA3AF" },

  spacer: { height: 28 },

  btn: {
    alignSelf:       "stretch",
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius:    14,
    alignItems:      "center",
    shadowColor:     GREEN,
    shadowOpacity:   0.35,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       6,
    gap:             2,
  },
  btnDisabled:     { backgroundColor: "#E5E7EB", shadowOpacity: 0, elevation: 0 },
  btnTextAr: {
    fontSize: 16, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.3,
  },
  btnTextEn: {
    fontSize: 12, color: "rgba(255,255,255,0.8)", letterSpacing: 0.5,
  },
  btnTextDisabled: { color: "#9CA3AF" },
});
