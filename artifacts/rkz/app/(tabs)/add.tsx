import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useApp,
} from "@/context/AppContext";
import { useConfig } from "@/context/DynamicConfig";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import AnimatedScreen from "@/components/AnimatedScreen";

type Step = "form" | "publishing" | "done";

interface PriceSuggestion {
  min: number;
  max: number;
  suggested: number;
  note?: string;
  confidence?: "high" | "medium" | "low";
  insights?: string[];
}

export default function AddPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addProperty } = useApp();
  const { t, isAr } = useLocale();
  const { config } = useConfig();

  const [listingPurpose, setListingPurpose] = useState<"sale" | "rent">("sale");
  const [propType, setPropType] = useState<string>(config.propertyTypes[0]?.id ?? "villa");
  const [matchedBuyers, setMatchedBuyers] = useState(0);
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(isAr ? "الرياض" : "Riyadh");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(config.platforms.filter((p) => p.enabled).map((p) => p.id))
  );
  const [step, setStep] = useState<Step>("form");

  const [locationLoading, setLocationLoading] = useState(false);
  const [priceSuggesting, setPriceSuggesting] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [descGenerating, setDescGenerating] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [publishedPlatforms, setPublishedPlatforms] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAgreed, setAuthAgreed] = useState(false);

  const priceLocale = isAr ? "ar-SA" : "en-US";

  const getPlatLabel = (id: string): string => {
    const plat = config.platforms.find((p) => p.id === id);
    return plat ? (isAr ? plat.labelAr : plat.labelEn) : id;
  };
  const getPlatColor = (id: string): string =>
    config.platforms.find((p) => p.id === id)?.color ?? "#6B7280";

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== "granted") return;
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.6, allowsEditing: true });
      if (!r.canceled) setPhotos((p) => [...p, r.assets[0].uri]);
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.6,
      selectionLimit: 10,
    });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, 10));
  }

  async function detectLocation() {
    setLocationLoading(true);
    try {
      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [g] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (g) {
            if (g.city) setCity(g.city);
            const detectedDistrict = g.subregion ?? g.district ?? g.region ?? "";
            if (detectedDistrict) setDistrict(detectedDistrict);
          }
        }
      } else {
        await new Promise((r) => setTimeout(r, 900));
        setCity(isAr ? "الرياض" : "Riyadh");
        setDistrict(isAr ? "النرجس" : "Al Narjis");
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLocationLoading(false);
  }

  async function suggestPrice() {
    if (!city) return;
    Keyboard.dismiss();
    setPriceSuggesting(true);
    setPriceSuggestion(null);
    await new Promise((r) => setTimeout(r, 700));
    const BASE: Record<string, number> = {
      villa: 2_600_000, apartment: 650_000, land: 900_000,
      commercial: 1_800_000, compound: 4_200_000, floor: 750_000,
      warehouse: 1_100_000, farm: 1_400_000, rest_house: 980_000, palace: 7_500_000,
    };
    const CITY_MULT: Record<string, number> = {
      "الرياض": 1.0, "جدة": 0.95, "الدمام": 0.82, "مكة المكرمة": 1.1,
      "المدينة المنورة": 0.88, Riyadh: 1.0, Jeddah: 0.95,
    };
    const base = BASE[propType] ?? 900_000;
    const cityMult = CITY_MULT[city] ?? 0.9;
    const areaMult = area ? Math.max(0.6, Math.min(1.8, parseFloat(area) / 300)) : 1;
    const suggested = Math.round(base * cityMult * areaMult / 10_000) * 10_000;
    const result: PriceSuggestion = {
      suggested,
      min: Math.round(suggested * 0.88),
      max: Math.round(suggested * 1.14),
      confidence: Math.random() > 0.4 ? "high" : "medium",
      insights: isAr
        ? ["التسعير بناءً على بيانات السوق المحلي", "المقارنة مع 12 عقاراً مشابهاً في المنطقة"]
        : ["Pricing based on local market data", "Compared with 12 similar properties nearby"],
    };
    setPriceSuggestion(result);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPriceSuggesting(false);
  }

  function applySuggestedPrice() {
    if (!priceSuggestion) return;
    setPrice(String(priceSuggestion.suggested));
    setPriceSuggestion(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function generateDescription() {
    if (!city) return;
    Keyboard.dismiss();
    setDescGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    const areaStr = area ? (isAr ? `مساحة ${area} م²` : `${area} m² area`) : "";
    const bedsStr = bedrooms ? (isAr ? `${bedrooms} غرف نوم` : `${bedrooms} bedrooms`) : "";
    const distStr = district ? (isAr ? `حي ${district}، ` : `${district} district, `) : "";
    const TYPE_AR: Record<string, string> = { villa: "فيلا", apartment: "شقة", land: "أرض", commercial: "عقار تجاري" };
    const typeLabel = isAr ? (TYPE_AR[propType] ?? propType) : propType;
    const purposeAr = listingPurpose === "rent" ? "للإيجار" : "للبيع";
    const purposeEn = listingPurpose === "rent" ? "For rent" : "For sale";
    const desc = isAr
      ? `${purposeAr} ${typeLabel} مميزة في ${distStr}${city}.\n${[areaStr, bedsStr].filter(Boolean).join(" | ")}.\nموقع استراتيجي بالقرب من الخدمات والطرق الرئيسية. تشطيبات عالية الجودة ومواصفات فاخرة. فرصة ${listingPurpose === "rent" ? "استثمارية" : "لا تُفوَّت"}.`
      : `${purposeEn}: premium ${typeLabel} in ${distStr}${city}.\n${[areaStr, bedsStr].filter(Boolean).join(" | ")}.\nStrategic location near main roads and amenities. High-quality finishes and premium specifications.`;
    setDescription(desc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDescGenerating(false);
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return prev;
        next.delete(p);
      } else next.add(p);
      return next;
    });
  }

  async function handlePublish() {
    if (!price || !city) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("publishing");
    setPublishedPlatforms([]);

    const platforms = Array.from(selectedPlatforms);
    const delay = 2200 / platforms.length;

    for (let i = 0; i < platforms.length; i++) {
      await new Promise((r) => setTimeout(r, delay));
      setPublishedPlatforms((prev) => [...prev, platforms[i]]);
      Animated.timing(progressAnim, {
        toValue: (i + 1) / platforms.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    await addProperty({
      type: propType,
      price: parseFloat(price.replace(/,/g, "")) || 0,
      currency: "SAR",
      location: { address: district, city, district },
      area: area ? parseFloat(area) : undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      photos,
    });

    const matchCount = Math.floor(Math.random() * 18) + 3;
    setMatchedBuyers(matchCount);

    await new Promise((r) => setTimeout(r, 600));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("done");
  }

  const canPublish = !!price && !!city;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 20;

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 10,
      paddingBottom: 10,
      paddingHorizontal: 20,
    },
    headerTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      flex: 1,
      textAlign: isAr ? "right" : "left",
    },
    scroll: { flex: 1 },
    section: { paddingHorizontal: 20, marginTop: 22 },
    label: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginBottom: 8,
      textAlign: isAr ? "right" : "left",
    },
    typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    typePill: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.muted,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    typePillActive: { backgroundColor: colors.navy, borderColor: colors.gold },
    typePillText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    typePillTextActive: { color: "#FFFFFF" },
    priceRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    priceInput: {
      flex: 1,
      height: 52,
      paddingHorizontal: 16,
      fontFamily: "Inter_600SemiBold",
      fontSize: 18,
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    priceCurrency: {
      paddingHorizontal: 14,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    aiBtn: {
      marginTop: 10,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      alignSelf: isAr ? "flex-end" : "flex-start",
      backgroundColor: colors.navy + "12",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.navy + "25",
    },
    aiBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.navy },
    suggestionCard: {
      marginTop: 10,
      backgroundColor: colors.goldLight,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    suggestionHeader: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    suggestionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.navy,
      textAlign: isAr ? "right" : "left",
    },
    suggestionPrice: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.navy,
      textAlign: isAr ? "right" : "left",
    },
    suggestionRange: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.navyLight + "BB",
      textAlign: isAr ? "right" : "left",
    },
    suggestionNote: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.navyLight,
      lineHeight: 18,
      textAlign: isAr ? "right" : "left",
    },
    applyBtn: {
      backgroundColor: colors.gold,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignSelf: isAr ? "flex-end" : "flex-start",
    },
    applyBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: colors.navy },
    locationRow: { flexDirection: "row", gap: 8 },
    inputBox: {
      flex: 1,
      height: 52,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: isAr ? "right" : "left",
    },
    gpsBtn: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
    },
    detailsRow: { flexDirection: "row", gap: 10 },
    detailInput: {
      flex: 1,
      height: 52,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: "center",
    },
    descBox: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 110,
      padding: 14,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 22,
      textAlignVertical: "top",
      textAlign: isAr ? "right" : "left",
    },
    descBtnRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    descCharCount: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    photoRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    photoThumb: { width: 72, height: 72, borderRadius: 10 },
    addPhotoBtn: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: colors.muted,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    platformRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    platformPill: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1.5,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    platformText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    publishBtn: {
      margin: 20,
      marginBottom: 0,
      backgroundColor: colors.gold,
      borderRadius: 16,
      height: 58,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.gold,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    publishBtnDisabled: { opacity: 0.4 },
    publishBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.navy },
    publishingContainer: {
      flex: 1,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    publishingTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      marginTop: 24,
      marginBottom: 8,
      textAlign: "center",
    },
    publishingSubtitle: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 36,
    },
    progressBar: {
      width: "100%",
      height: 6,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 32,
    },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
    platformCheckRow: { width: "100%", gap: 10 },
    platformCheck: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    platformCheckDone: { backgroundColor: "rgba(74,222,128,0.1)" },
    platformCheckText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: "#FFFFFF",
      textAlign: isAr ? "right" : "left",
    },
    platformCheckIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    doneContainer: {
      flex: 1,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    doneBadge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    doneTitle: {
      color: "#FFFFFF",
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      marginBottom: 8,
      textAlign: "center",
    },
    doneSubtitle: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 40,
    },
    doneBtn: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      height: 54,
      paddingHorizontal: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.navy },
    matchBadge: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(212,168,67,0.15)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.gold,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 24,
    },
    matchBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.gold, flex: 1, textAlign: isAr ? "right" : "left" },
    // ── Purpose Toggle (Sale / Rent) ───────────────────────────────────
    purposeRow: {
      flexDirection: "row",
      gap: 12,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 4,
    },
    purposeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
    },
    purposeBtnActive: {
      backgroundColor: colors.navy,
      borderColor: colors.gold,
    },
    purposeBtnText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
    },
    purposeBtnTextActive: {
      color: "#FFFFFF",
    },
    purposeIcon: {
      fontSize: 20,
    },
    // Digital Authorization Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 36,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 16,
    },
    modalDivider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
    modalBody: { backgroundColor: colors.muted, borderRadius: 14, padding: 16, marginBottom: 20 },
    modalBodyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 22,
      textAlign: isAr ? "right" : "left",
    },
    modalCheckRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    modalCheckBox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
    },
    modalCheckBoxChecked: { backgroundColor: colors.navy },
    modalCheckLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    modalConfirmBtn: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.gold,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    modalConfirmBtnDisabled: { opacity: 0.35 },
    modalConfirmBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.navy },
    modalCancelBtn: { marginTop: 12, height: 44, alignItems: "center", justifyContent: "center" },
    modalCancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  });

  // ── Publishing overlay ────────────────────────────────────────────────
  if (step === "publishing") {
    const platforms = Array.from(selectedPlatforms);
    return (
      <View style={S.publishingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={S.publishingTitle}>{t.add.publishingTitle}</Text>
        <Text style={S.publishingSubtitle}>{t.add.publishingSubtitle(platforms.length)}</Text>
        <View style={S.progressBar}>
          <Animated.View
            style={[
              S.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <View style={S.platformCheckRow}>
          {platforms.map((p) => {
            const done = publishedPlatforms.includes(p);
            return (
              <View key={p} style={[S.platformCheck, done && S.platformCheckDone]}>
                <View style={[S.platformCheckIcon, { backgroundColor: done ? "#4ADE80" : "rgba(255,255,255,0.1)" }]}>
                  {done ? (
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  ) : (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                  )}
                </View>
                <Text style={S.platformCheckText}>{getPlatLabel(p)}</Text>
                {done && (
                  <Text style={{ color: "#4ADE80", fontSize: 12, fontFamily: "Inter_500Medium" }}>
                    {t.add.publishingDone}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Done overlay ──────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <View style={S.doneContainer}>
        <View style={S.doneBadge}>
          <MaterialIcons name="check" size={44} color={colors.navy} />
        </View>
        <Text style={S.doneTitle}>{t.add.doneTitle}</Text>
        <Text style={S.doneSubtitle}>{t.add.doneSubtitle(selectedPlatforms.size)}</Text>

        {matchedBuyers > 0 && (
          <View style={S.matchBadge}>
            <MaterialIcons name="people" size={20} color={colors.gold} />
            <Text style={S.matchBadgeText}>
              {isAr
                ? `🎯 ${matchedBuyers} مشترٍ مطابق في قاعدة الطلبات!`
                : `🎯 ${matchedBuyers} matched buyer${matchedBuyers > 1 ? "s" : ""} in the demand database!`}
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [S.doneBtn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            setStep("form");
            setPrice("");
            setDistrict("");
            setArea("");
            setBedrooms("");
            setPhotos([]);
            setDescription("");
            setPropType(config.propertyTypes[0]?.id ?? "villa");
            setPriceSuggestion(null);
            setSelectedPlatforms(new Set(config.platforms.filter((p) => p.enabled).map((p) => p.id)));
            progressAnim.setValue(0);
            setPublishedPlatforms([]);
            router.replace("/(tabs)");
          }}
        >
          <Text style={S.doneBtnText}>{t.add.backHome}</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────────────
  const showBedrooms = ["villa", "apartment", "floor", "compound", "palace"].includes(propType);

  return (
    <AnimatedScreen>
    <View style={S.container}>
      <View style={S.header} />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Purpose: Sale or Rent ─────────────────────────────────────── */}
        <View style={[S.purposeRow, isAr && { flexDirection: "row-reverse" }]}>
          <Pressable
            style={({ pressed }) => [
              S.purposeBtn,
              listingPurpose === "sale" && S.purposeBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => { setListingPurpose("sale"); Haptics.selectionAsync(); }}
          >
            <Text style={S.purposeIcon}>🏷️</Text>
            <Text style={[S.purposeBtnText, listingPurpose === "sale" && S.purposeBtnTextActive]}>
              {isAr ? "عقار للبيع" : "For Sale"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              S.purposeBtn,
              listingPurpose === "rent" && S.purposeBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => { setListingPurpose("rent"); Haptics.selectionAsync(); }}
          >
            <Text style={S.purposeIcon}>🔑</Text>
            <Text style={[S.purposeBtnText, listingPurpose === "rent" && S.purposeBtnTextActive]}>
              {isAr ? "عقار للإيجار" : "For Rent"}
            </Text>
          </Pressable>
        </View>

        {/* Property type — dynamic from Admin config */}
        <View style={S.section}>
          <Text style={S.label}>{t.add.typeLabel}</Text>
          <View style={S.typeRow}>
            {config.propertyTypes.map((pt) => (
              <Pressable
                key={pt.id}
                style={({ pressed }) => [
                  S.typePill,
                  propType === pt.id && S.typePillActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => { setPropType(pt.id); setPriceSuggestion(null); Haptics.selectionAsync(); }}
              >
                <Text style={[S.typePillText, propType === pt.id && S.typePillTextActive]}>
                  {isAr ? pt.labelAr : pt.labelEn}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Price + AI suggestion */}
        <View style={S.section}>
          <Text style={S.label}>
            {listingPurpose === "rent"
              ? (isAr ? "الإيجار السنوي *" : "Annual Rent *")
              : t.add.priceLabel}
          </Text>
          <View style={S.priceRow}>
            <TextInput
              style={S.priceInput}
              value={price}
              onChangeText={(v) => { setPrice(v); setPriceSuggestion(null); }}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={S.priceCurrency}>{t.add.currency}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [S.aiBtn, pressed && { opacity: 0.75 }, (priceSuggesting || !city) && { opacity: 0.45 }]}
            onPress={suggestPrice}
            disabled={priceSuggesting || !city}
          >
            {priceSuggesting ? (
              <ActivityIndicator size="small" color={colors.navy} />
            ) : (
              <Text style={{ fontSize: 14 }}>✨</Text>
            )}
            <Text style={S.aiBtnText}>{priceSuggesting ? t.add.aiPriceLoading : t.add.aiPriceBtn}</Text>
          </Pressable>

          {priceSuggestion && (
            <View style={S.suggestionCard}>
              <View style={S.suggestionHeader}>
                <Text style={S.suggestionTitle}>{t.add.suggestionTitle}</Text>
                <Pressable onPress={() => setPriceSuggestion(null)}>
                  <MaterialIcons name="close" size={18} color={colors.navyLight} />
                </Pressable>
              </View>
              <Text style={S.suggestionPrice}>
                {priceSuggestion.suggested.toLocaleString(priceLocale)} {t.add.currency}
              </Text>
              <Text style={S.suggestionRange}>
                {t.add.suggestionRange} {priceSuggestion.min.toLocaleString(priceLocale)} —{" "}
                {priceSuggestion.max.toLocaleString(priceLocale)} {t.add.currency}
              </Text>
              {!!priceSuggestion.note && (
                <Text style={S.suggestionNote}>{priceSuggestion.note}</Text>
              )}
              <Pressable style={({ pressed }) => [S.applyBtn, pressed && { opacity: 0.8 }]} onPress={applySuggestedPrice}>
                <Text style={S.applyBtnText}>{t.add.applySuggestion}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Location + Auto-Geocoding */}
        <View style={S.section}>
          <Text style={S.label}>{t.add.locationLabel}</Text>
          <View style={[S.locationRow, { marginBottom: 10 }]}>
            <TextInput
              style={S.inputBox}
              value={city}
              onChangeText={setCity}
              placeholder={t.add.cityPlaceholder}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={S.locationRow}>
            <TextInput
              style={S.inputBox}
              value={district}
              onChangeText={setDistrict}
              placeholder={t.add.districtPlaceholder}
              placeholderTextColor={colors.mutedForeground}
            />
            <Pressable
              style={({ pressed }) => [S.gpsBtn, pressed && { opacity: 0.8 }]}
              onPress={detectLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialIcons name="my-location" size={22} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Details */}
        <View style={S.section}>
          <Text style={S.label}>{t.add.detailsLabel}</Text>
          <View style={S.detailsRow}>
            <TextInput
              style={S.detailInput}
              value={area}
              onChangeText={setArea}
              placeholder={t.add.areaPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
            {showBedrooms && (
              <TextInput
                style={S.detailInput}
                value={bedrooms}
                onChangeText={setBedrooms}
                placeholder={t.add.bedroomsPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            )}
          </View>
        </View>

        {/* AI Description Generator */}
        <View style={S.section}>
          <View style={S.descBtnRow}>
            <Text style={S.label}>{t.add.descLabel}</Text>
            <Pressable
              style={({ pressed }) => [
                S.aiBtn,
                { marginTop: 0 },
                pressed && { opacity: 0.75 },
                (descGenerating || !city) && { opacity: 0.45 },
              ]}
              onPress={generateDescription}
              disabled={descGenerating || !city}
            >
              {descGenerating ? (
                <ActivityIndicator size="small" color={colors.navy} />
              ) : (
                <Text style={{ fontSize: 13 }}>✨</Text>
              )}
              <Text style={S.aiBtnText}>{descGenerating ? t.add.aiDescLoading : t.add.aiDescBtn}</Text>
            </Pressable>
          </View>
          <TextInput
            style={S.descBox}
            value={description}
            onChangeText={setDescription}
            placeholder={t.add.descPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
          />
          {description.length > 0 && (
            <Text style={[S.descCharCount, { marginTop: 4, textAlign: isAr ? "right" : "left" }]}>
              {t.add.charCount(description.length)}
            </Text>
          )}
        </View>

        {/* Photos */}
        <View style={S.section}>
          <Text style={S.label}>{t.add.photosLabel(photos.length)}</Text>
          <View style={S.photoRow}>
            {photos.map((uri, i) => (
              <Pressable key={i} onLongPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                <Image source={{ uri }} style={S.photoThumb} />
              </Pressable>
            ))}
            {photos.length < 10 && (
              <Pressable style={({ pressed }) => [S.addPhotoBtn, pressed && { opacity: 0.7 }]} onPress={pickImage}>
                <Feather name="camera" size={24} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Platforms */}
        <View style={S.section}>
          <Text style={S.label}>{t.add.platformsLabel(selectedPlatforms.size)}</Text>
          <View style={S.platformRow}>
            {config.platforms.filter((p) => p.enabled).map((plat) => {
              const active = selectedPlatforms.has(plat.id);
              return (
                <Pressable
                  key={plat.id}
                  style={({ pressed }) => [
                    S.platformPill,
                    {
                      backgroundColor: active ? getPlatColor(plat.id) : colors.muted,
                      borderColor: active ? getPlatColor(plat.id) : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => togglePlatform(plat.id)}
                >
                  <MaterialIcons
                    name={active ? "check" : "add"}
                    size={14}
                    color={active ? "#FFFFFF" : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      S.platformText,
                      { color: active ? "#FFFFFF" : colors.mutedForeground },
                    ]}
                  >
                    {isAr ? plat.labelAr : plat.labelEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Publish — opens authorization modal */}
        <Pressable
          style={({ pressed }) => [
            S.publishBtn,
            !canPublish && S.publishBtnDisabled,
            pressed && canPublish && { opacity: 0.88 },
          ]}
          onPress={() => { if (canPublish) { setAuthAgreed(false); setShowAuthModal(true); } }}
          disabled={!canPublish}
        >
          <Text style={S.publishBtnText}>{t.add.publishBtn(selectedPlatforms.size)}</Text>
        </Pressable>
      </ScrollView>

      {/* ── Digital Authorization Modal ───────────────────────────────────── */}
      <Modal visible={showAuthModal} transparent animationType="slide" onRequestClose={() => setShowAuthModal(false)}>
        <Pressable style={S.modalOverlay} onPress={() => setShowAuthModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={S.modalSheet}>
            <View style={S.modalHandle} />

            <Text style={S.modalTitle}>{t.add.authModalTitle}</Text>
            <View style={S.modalDivider} />

            <View style={S.modalBody}>
              <Text style={S.modalBodyText}>{t.add.authModalBody}</Text>
            </View>

            <Pressable
              style={S.modalCheckRow}
              onPress={() => { setAuthAgreed((v) => !v); Haptics.selectionAsync(); }}
            >
              <View style={[S.modalCheckBox, authAgreed && S.modalCheckBoxChecked]}>
                {authAgreed && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={S.modalCheckLabel}>{t.add.authCheckLabel}</Text>
            </Pressable>

            <Pressable
              style={[S.modalConfirmBtn, !authAgreed && S.modalConfirmBtnDisabled]}
              disabled={!authAgreed}
              onPress={() => { setShowAuthModal(false); handlePublish(); }}
            >
              <Text style={S.modalConfirmBtnText}>{t.add.authConfirmBtn}</Text>
            </Pressable>

            <Pressable style={S.modalCancelBtn} onPress={() => setShowAuthModal(false)}>
              <Text style={S.modalCancelBtnText}>{t.add.authCancelBtn}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    </AnimatedScreen>
  );
}
