import { Linking } from "react-native";
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

const TERMS_URL   = "https://rozoz.com/terms";
const PRIVACY_URL = "https://rozoz.com/privacy";

export default function ConsentScreen() {
  const { acceptConsent, langChosen } = useApp();
  const [checked, setChecked] = useState(false);

  function handleAccept() {
    if (!checked) return;
    acceptConsent();
    if (langChosen === false) {
      router.replace("/language-select" as never);
    } else {
      router.replace("/(tabs)" as never);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>

        {/* Logo mark */}
        <View style={s.logoWrap}>
          <Text style={s.logoEmoji}>🏠</Text>
        </View>

        {/* Heading */}
        <Text style={s.heading}>أهلاً في رزوز الرقمية</Text>

        <View style={s.spacer} />

        {/* Checkbox row */}
        <Pressable style={s.checkRow} onPress={() => setChecked(v => !v)}>
          <View style={[s.checkbox, checked && s.checkboxChecked]}>
            {checked && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.checkLabel}>
            أوافق على الشروط والأحكام وسياسة الخصوصية
          </Text>
        </Pressable>

        {/* Links */}
        <View style={s.linksRow}>
          <TouchableOpacity onPress={() => void Linking.openURL(TERMS_URL)}>
            <Text style={s.link}>الشروط والأحكام</Text>
          </TouchableOpacity>
          <Text style={s.linkSep}>·</Text>
          <TouchableOpacity onPress={() => void Linking.openURL(PRIVACY_URL)}>
            <Text style={s.link}>سياسة الخصوصية</Text>
          </TouchableOpacity>
        </View>

        <View style={s.spacer} />

        {/* Accept button */}
        <TouchableOpacity
          style={[s.btn, !checked && s.btnDisabled]}
          onPress={handleAccept}
          activeOpacity={0.85}
          disabled={!checked}
        >
          <Text style={[s.btnText, !checked && s.btnTextDisabled]}>
            موافق ومتابعة
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
    direction: I18nManager.isRTL ? "rtl" : "ltr",
  },

  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#F0F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logoEmoji: {
    fontSize: 44,
  },

  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    writingDirection: "rtl",
  },

  spacer: {
    height: 36,
  },

  checkRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 12,
    marginBottom: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
  },
  checkLabel: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },

  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    marginBottom: 4,
  },
  link: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  linkSep: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  btn: {
    alignSelf: "stretch",
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  btnTextDisabled: {
    color: "#9CA3AF",
  },
});
