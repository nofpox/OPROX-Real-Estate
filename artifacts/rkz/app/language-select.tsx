import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

const LOGO   = require("@/assets/images/rozoz-logo-eagle.png");
const { width } = Dimensions.get("window");
const LOGO_W = Math.min(width * 0.55, 220);
const LOGO_H = Math.round(LOGO_W / 2.6);

const NAVY  = "#0A1628";
const GOLD  = "#C9A84C";
const WHITE = "#F5F0E8";

const LANGS = [
  {
    id:    "ar" as const,
    flag:  "🇸🇦",
    name:  "العربية",
    sub:   "اضغط للمتابعة بالعربية",
    dir:   "rtl" as const,
    badge: "AR",
  },
  {
    id:    "en" as const,
    flag:  "🇺🇸",
    name:  "English",
    sub:   "Continue in English",
    dir:   "ltr" as const,
    badge: "EN",
  },
];

export default function LanguageSelectScreen() {
  const insets     = useSafeAreaInsets();
  const { setAppLang } = useApp();

  const bgAnim   = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(bgAnim,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(logoAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(cardsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(lang: "ar" | "en") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppLang(lang);
    router.replace("/gate");
  }

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 0);

  return (
    <Animated.View style={[s.root, { opacity: bgAnim, paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <Animated.View style={[s.logoWrap, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}>
        <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
      </Animated.View>

      {/* ── Title ────────────────────────────────────────────────────────────── */}
      <Animated.View style={[s.titleWrap, { opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
        <Text style={s.titleAr}>اختر لغتك</Text>
        <Text style={s.titleEn}>Choose your language</Text>
        <View style={s.divider} />
      </Animated.View>

      {/* ── Language Cards ────────────────────────────────────────────────────── */}
      <Animated.View style={[s.cards, { opacity: cardsAnim, transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        {LANGS.map((lang) => (
          <LangCard key={lang.id} lang={lang} onPress={() => choose(lang.id)} />
        ))}
      </Animated.View>

      {/* ── Bottom note ──────────────────────────────────────────────────────── */}
      <Animated.Text style={[s.note, { opacity: cardsAnim }]}>
        يمكنك تغيير اللغة لاحقاً من الإعدادات · You can change this later in Settings
      </Animated.Text>
    </Animated.View>
  );
}

function LangCard({
  lang,
  onPress,
}: {
  lang: typeof LANGS[number];
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [s.cardPressable, pressed && { opacity: 0.9 }]}
    >
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        {/* Badge */}
        <View style={s.badge}>
          <Text style={s.badgeText}>{lang.badge}</Text>
        </View>

        {/* Flag */}
        <Text style={s.flag}>{lang.flag}</Text>

        {/* Name */}
        <Text style={[s.langName, lang.dir === "rtl" && s.rtl]}>{lang.name}</Text>
        <Text style={[s.langSub,  lang.dir === "rtl" && s.rtl]}>{lang.sub}</Text>

        {/* Arrow */}
        <View style={s.arrowWrap}>
          <Text style={[s.arrow, lang.dir === "rtl" ? s.arrowRtl : s.arrowLtr]}>
            {lang.dir === "rtl" ? "←" : "→"}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: NAVY,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 24,
    paddingBottom:   32,
  },

  logoWrap: {
    alignItems:   "center",
    marginBottom: 36,
  },

  titleWrap: {
    alignItems:   "center",
    marginBottom: 32,
  },
  titleAr: {
    color:      GOLD,
    fontSize:   26,
    fontFamily: "Inter_700Bold",
    textAlign:  "center",
    letterSpacing: 0.3,
  },
  titleEn: {
    color:      "rgba(245,240,232,0.50)",
    fontSize:   14,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    marginTop:  6,
    letterSpacing: 0.5,
  },
  divider: {
    width:           44,
    height:          1.5,
    backgroundColor: GOLD,
    opacity:         0.35,
    borderRadius:    1,
    marginTop:       20,
  },

  cards: {
    width:  "100%",
    gap:    16,
    marginBottom: 28,
  },

  cardPressable: {
    width: "100%",
  },
  card: {
    backgroundColor:   "rgba(255,255,255,0.04)",
    borderWidth:       1.5,
    borderColor:       "rgba(201,168,76,0.22)",
    borderRadius:      22,
    paddingVertical:   26,
    paddingHorizontal: 28,
    alignItems:        "center",
    gap:               8,
    position:          "relative",
  },

  badge: {
    position:          "absolute",
    top:               14,
    right:             16,
    backgroundColor:   "rgba(201,168,76,0.15)",
    borderWidth:       1,
    borderColor:       "rgba(201,168,76,0.30)",
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  badgeText: {
    color:      GOLD,
    fontSize:   11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },

  flag: {
    fontSize:    44,
    lineHeight:  52,
    marginBottom: 2,
  },

  langName: {
    color:      WHITE,
    fontSize:   24,
    fontFamily: "Inter_700Bold",
    textAlign:  "center",
  },
  langSub: {
    color:      "rgba(245,240,232,0.45)",
    fontSize:   13,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
  },
  rtl: {
    writingDirection: "rtl",
  },

  arrowWrap: {
    marginTop:       6,
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(201,168,76,0.25)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  arrow: {
    color:      GOLD,
    fontSize:   20,
    lineHeight: 22,
    fontFamily: "Inter_700Bold",
  },
  arrowRtl: {},
  arrowLtr: {},

  note: {
    color:      "rgba(245,240,232,0.22)",
    fontSize:   11,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    lineHeight: 17,
    maxWidth:   300,
  },
});
