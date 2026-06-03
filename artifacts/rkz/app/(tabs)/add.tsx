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

import { apiPost } from "@/constants/api";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  PROPERTY_TYPE_LABELS,
  Platform as PlatformType,
  PropertyType,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ALL_PLATFORMS: PlatformType[] = ["aqar", "bayut", "wasalt", "property_finder"];
const PROP_TYPES: PropertyType[] = ["villa", "apartment", "land", "commercial", "compound", "floor"];

type Step = "form" | "publishing" | "done";

interface PriceSuggestion {
  min: number;
  max: number;
  suggested: number;
  note: string;
}

export default function AddPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addProperty } = useApp();

  const [propType, setPropType] = useState<PropertyType>("villa");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("الرياض");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(new Set(ALL_PLATFORMS));
  const [step, setStep] = useState<Step>("form");

  const [locationLoading, setLocationLoading] = useState(false);
  const [priceSuggesting, setPriceSuggesting] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [descGenerating, setDescGenerating] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [publishedPlatforms, setPublishedPlatforms] = useState<PlatformType[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAgreed, setAuthAgreed] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== "granted") return;
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.6, allowsEditing: true });
      if (!r.canceled) setPhotos((p) => [...p, r.assets[0].uri]);
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsMultipleSelection: true, quality: 0.6, selectionLimit: 8 });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, 8));
  }

  // ── Feature 2: Auto-Geocoding ──────────────────────────────────────────────
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
            // Try subregion (neighborhood/district), then district, then region
            const detectedDistrict = g.subregion ?? g.district ?? g.region ?? "";
            if (detectedDistrict) setDistrict(detectedDistrict);
          }
        }
      } else {
        // Web demo fallback
        await new Promise((r) => setTimeout(r, 900));
        setCity("الرياض");
        setDistrict("النرجس");
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLocationLoading(false);
  }

  // ── Feature 1: AI Pricing Suggestion ──────────────────────────────────────
  async function suggestPrice() {
    if (!city) return;
    Keyboard.dismiss();
    setPriceSuggesting(true);
    setPriceSuggestion(null);
    try {
      const result = await apiPost<PriceSuggestion>("/rkz/suggest-price", {
        type: propType,
        city,
        district: district || undefined,
        area: area ? parseFloat(area) : undefined,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      });
      setPriceSuggestion(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setPriceSuggesting(false);
  }

  function applySuggestedPrice() {
    if (!priceSuggestion) return;
    setPrice(String(priceSuggestion.suggested));
    setPriceSuggestion(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // ── Feature 3: AI Description Generator ───────────────────────────────────
  async function generateDescription() {
    if (!city) return;
    Keyboard.dismiss();
    setDescGenerating(true);
    try {
      const result = await apiPost<{ description: string }>("/rkz/generate-description", {
        type: propType,
        city,
        district: district || undefined,
        area: area ? parseFloat(area) : undefined,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        price: price ? parseFloat(price.replace(/,/g, "")) : undefined,
      });
      setDescription(result.description);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setDescGenerating(false);
  }

  function togglePlatform(p: PlatformType) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) { if (next.size === 1) return prev; next.delete(p); }
      else next.add(p);
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
      Animated.timing(progressAnim, { toValue: (i + 1) / platforms.length, duration: 300, useNativeDriver: false }).start();
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
      paddingTop: topPad + 16,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
    scroll: { flex: 1 },
    section: { paddingHorizontal: 20, marginTop: 22 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 8 },
    // Type pills
    typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    typePill: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.muted, borderWidth: 1.5, borderColor: "transparent" },
    typePillActive: { backgroundColor: colors.navy, borderColor: colors.gold },
    typePillText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    typePillTextActive: { color: "#FFFFFF" },
    // Price
    priceRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    priceInput: { flex: 1, height: 52, paddingHorizontal: 16, fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.foreground },
    priceCurrency: { paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    aiBtn: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: colors.navy + "12",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.navy + "25",
    },
    aiBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.navy },
    // Suggestion card
    suggestionCard: {
      marginTop: 10,
      backgroundColor: colors.goldLight,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    suggestionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    suggestionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.navy },
    suggestionPrice: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.navy },
    suggestionRange: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.navyLight + "BB" },
    suggestionNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.navyLight, lineHeight: 18 },
    applyBtn: {
      backgroundColor: colors.gold,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignSelf: "flex-start",
    },
    applyBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: colors.navy },
    // Location
    locationRow: { flexDirection: "row", gap: 8 },
    inputBox: { flex: 1, height: 52, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.foreground, borderWidth: 1, borderColor: colors.border },
    gpsBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
    // Details
    detailsRow: { flexDirection: "row", gap: 10 },
    detailInput: { flex: 1, height: 52, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.foreground, borderWidth: 1, borderColor: colors.border, textAlign: "center" },
    // Description
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
    },
    descBtnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    descCharCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    // Photos
    photoRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    photoThumb: { width: 72, height: 72, borderRadius: 10 },
    addPhotoBtn: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.muted, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
    // Platforms
    platformRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    platformPill: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 6 },
    platformText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    // Publish
    publishBtn: { margin: 20, marginBottom: 0, backgroundColor: colors.gold, borderRadius: 16, height: 58, alignItems: "center", justifyContent: "center", shadowColor: colors.gold, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    publishBtnDisabled: { opacity: 0.4 },
    publishBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.navy },
    // Publishing overlay
    publishingContainer: { flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", padding: 32 },
    publishingTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 24, marginBottom: 8, textAlign: "center" },
    publishingSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 36 },
    progressBar: { width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden", marginBottom: 32 },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
    platformCheckRow: { width: "100%", gap: 10 },
    platformCheck: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" },
    platformCheckDone: { backgroundColor: "rgba(74,222,128,0.1)" },
    platformCheckText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#FFFFFF" },
    platformCheckIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    // Done
    doneContainer: { flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", padding: 32 },
    doneBadge: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", marginBottom: 24 },
    doneTitle: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
    doneSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 40 },
    doneBtn: { backgroundColor: colors.gold, borderRadius: 14, height: 54, paddingHorizontal: 40, alignItems: "center", justifyContent: "center" },
    doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.navy },
    // Digital Authorization Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center", marginBottom: 16 },
    modalDivider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
    modalBody: { backgroundColor: colors.muted, borderRadius: 14, padding: 16, marginBottom: 20 },
    modalBodyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 22, textAlign: "right" },
    modalCheckRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24, paddingHorizontal: 4 },
    modalCheckBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.navy, alignItems: "center", justifyContent: "center" },
    modalCheckBoxChecked: { backgroundColor: colors.navy },
    modalCheckLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "right" },
    modalConfirmBtn: { backgroundColor: colors.gold, borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center", shadowColor: colors.gold, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
    modalConfirmBtnDisabled: { opacity: 0.35 },
    modalConfirmBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.navy },
    modalCancelBtn: { marginTop: 12, height: 44, alignItems: "center", justifyContent: "center" },
    modalCancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  });

  // ── Publishing overlay ─────────────────────────────────────────────────────
  if (step === "publishing") {
    const platforms = Array.from(selectedPlatforms);
    return (
      <View style={S.publishingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={S.publishingTitle}>جارٍ النشر</Text>
        <Text style={S.publishingSubtitle}>يتم نشر عقارك على {platforms.length} منصة الآن</Text>
        <View style={S.progressBar}>
          <Animated.View style={[S.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>
        <View style={S.platformCheckRow}>
          {platforms.map((p) => {
            const done = publishedPlatforms.includes(p);
            return (
              <View key={p} style={[S.platformCheck, done && S.platformCheckDone]}>
                <View style={[S.platformCheckIcon, { backgroundColor: done ? "#4ADE80" : "rgba(255,255,255,0.1)" }]}>
                  {done ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />}
                </View>
                <Text style={S.platformCheckText}>{PLATFORM_LABELS[p]}</Text>
                {done && <Text style={{ color: "#4ADE80", fontSize: 12, fontFamily: "Inter_500Medium" }}>تم ✓</Text>}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Done overlay ───────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <View style={S.doneContainer}>
        <View style={S.doneBadge}><MaterialIcons name="check" size={44} color={colors.navy} /></View>
        <Text style={S.doneTitle}>تم النشر بنجاح!</Text>
        <Text style={S.doneSubtitle}>عقارك الآن منشور على {selectedPlatforms.size} منصات وسيظهر للمشترين فوراً</Text>
        <Pressable style={({ pressed }) => [S.doneBtn, pressed && { opacity: 0.85 }]} onPress={() => {
          setStep("form"); setPrice(""); setDistrict(""); setArea(""); setBedrooms(""); setPhotos([]);
          setDescription(""); setPropType("villa"); setPriceSuggestion(null);
          setSelectedPlatforms(new Set(ALL_PLATFORMS)); progressAnim.setValue(0); setPublishedPlatforms([]);
          router.replace("/(tabs)");
        }}>
          <Text style={S.doneBtnText}>العودة للرئيسية</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main Form ──────────────────────────────────────────────────────────────
  const showBedrooms = ["villa", "apartment", "floor", "compound"].includes(propType);

  return (
    <View style={S.container}>
      <View style={S.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={S.headerTitle}>إضافة عقار جديد</Text>
      </View>

      <ScrollView style={S.scroll} contentContainerStyle={{ paddingBottom: bottomPad }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Property type */}
        <View style={S.section}>
          <Text style={S.label}>نوع العقار</Text>
          <View style={S.typeRow}>
            {PROP_TYPES.map((t) => (
              <Pressable key={t} style={({ pressed }) => [S.typePill, propType === t && S.typePillActive, pressed && { opacity: 0.8 }]}
                onPress={() => { setPropType(t); setPriceSuggestion(null); Haptics.selectionAsync(); }}>
                <Text style={[S.typePillText, propType === t && S.typePillTextActive]}>{PROPERTY_TYPE_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Price + AI suggestion */}
        <View style={S.section}>
          <Text style={S.label}>السعر *</Text>
          <View style={S.priceRow}>
            <TextInput style={S.priceInput} value={price} onChangeText={(t) => { setPrice(t); setPriceSuggestion(null); }}
              placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" returnKeyType="done" />
            <Text style={S.priceCurrency}>ريال</Text>
          </View>

          {/* AI Price Button */}
          <Pressable style={({ pressed }) => [S.aiBtn, pressed && { opacity: 0.75 }, (priceSuggesting || !city) && { opacity: 0.45 }]}
            onPress={suggestPrice} disabled={priceSuggesting || !city}>
            {priceSuggesting
              ? <ActivityIndicator size="small" color={colors.navy} />
              : <Text style={{ fontSize: 14 }}>✨</Text>}
            <Text style={S.aiBtnText}>{priceSuggesting ? "جارٍ التحليل..." : "اقتراح السعر بالذكاء الاصطناعي"}</Text>
          </Pressable>

          {/* Suggestion result card */}
          {priceSuggestion && (
            <View style={S.suggestionCard}>
              <View style={S.suggestionHeader}>
                <Text style={S.suggestionTitle}>✨ اقتراح الذكاء الاصطناعي</Text>
                <Pressable onPress={() => setPriceSuggestion(null)}>
                  <MaterialIcons name="close" size={18} color={colors.navyLight} />
                </Pressable>
              </View>
              <Text style={S.suggestionPrice}>{priceSuggestion.suggested.toLocaleString("ar-SA")} ريال</Text>
              <Text style={S.suggestionRange}>
                النطاق: {priceSuggestion.min.toLocaleString("ar-SA")} — {priceSuggestion.max.toLocaleString("ar-SA")} ريال
              </Text>
              {!!priceSuggestion.note && <Text style={S.suggestionNote}>{priceSuggestion.note}</Text>}
              <Pressable style={({ pressed }) => [S.applyBtn, pressed && { opacity: 0.8 }]} onPress={applySuggestedPrice}>
                <Text style={S.applyBtnText}>تطبيق السعر المقترح</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Location + Auto-Geocoding */}
        <View style={S.section}>
          <Text style={S.label}>الموقع *</Text>
          <View style={[S.locationRow, { marginBottom: 10 }]}>
            <TextInput style={S.inputBox} value={city} onChangeText={setCity} placeholder="المدينة" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={S.locationRow}>
            <TextInput style={S.inputBox} value={district} onChangeText={setDistrict} placeholder="الحي (يُملأ تلقائياً بالـ GPS)" placeholderTextColor={colors.mutedForeground} />
            <Pressable style={({ pressed }) => [S.gpsBtn, pressed && { opacity: 0.8 }]} onPress={detectLocation} disabled={locationLoading}>
              {locationLoading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <MaterialIcons name="my-location" size={22} color="#FFFFFF" />}
            </Pressable>
          </View>
        </View>

        {/* Details */}
        <View style={S.section}>
          <Text style={S.label}>تفاصيل {showBedrooms ? "" : ""} (اختياري)</Text>
          <View style={S.detailsRow}>
            <TextInput style={S.detailInput} value={area} onChangeText={setArea} placeholder="المساحة م²" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />
            {showBedrooms && (
              <TextInput style={S.detailInput} value={bedrooms} onChangeText={setBedrooms} placeholder="الغرف" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />
            )}
          </View>
        </View>

        {/* AI Description Generator */}
        <View style={S.section}>
          <View style={S.descBtnRow}>
            <Text style={S.label}>وصف الإعلان (اختياري)</Text>
            <Pressable style={({ pressed }) => [S.aiBtn, { marginTop: 0 }, pressed && { opacity: 0.75 }, (descGenerating || !city) && { opacity: 0.45 }]}
              onPress={generateDescription} disabled={descGenerating || !city}>
              {descGenerating
                ? <ActivityIndicator size="small" color={colors.navy} />
                : <Text style={{ fontSize: 13 }}>✨</Text>}
              <Text style={S.aiBtnText}>{descGenerating ? "جارٍ الكتابة..." : "توليد وصف احترافي"}</Text>
            </Pressable>
          </View>
          <TextInput
            style={S.descBox}
            value={description}
            onChangeText={setDescription}
            placeholder="اكتب وصفاً جذاباً للعقار، أو اضغط زر التوليد بالذكاء الاصطناعي…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
          />
          {description.length > 0 && (
            <Text style={[S.descCharCount, { marginTop: 4, textAlign: "right" }]}>{description.length} حرف</Text>
          )}
        </View>

        {/* Photos */}
        <View style={S.section}>
          <Text style={S.label}>الصور ({photos.length}/8)</Text>
          <View style={S.photoRow}>
            {photos.map((uri, i) => (
              <Pressable key={i} onLongPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                <Image source={{ uri }} style={S.photoThumb} />
              </Pressable>
            ))}
            {photos.length < 8 && (
              <Pressable style={({ pressed }) => [S.addPhotoBtn, pressed && { opacity: 0.7 }]} onPress={pickImage}>
                <Feather name="camera" size={24} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Platforms */}
        <View style={S.section}>
          <Text style={S.label}>المنصات ({selectedPlatforms.size})</Text>
          <View style={S.platformRow}>
            {ALL_PLATFORMS.map((p) => {
              const active = selectedPlatforms.has(p);
              return (
                <Pressable key={p} style={({ pressed }) => [S.platformPill, { backgroundColor: active ? PLATFORM_COLORS[p] : colors.muted, borderColor: active ? PLATFORM_COLORS[p] : colors.border }, pressed && { opacity: 0.8 }]}
                  onPress={() => togglePlatform(p)}>
                  <MaterialIcons name={active ? "check" : "add"} size={14} color={active ? "#FFFFFF" : colors.mutedForeground} />
                  <Text style={[S.platformText, { color: active ? "#FFFFFF" : colors.mutedForeground }]}>{PLATFORM_LABELS[p]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Publish — opens authorization modal */}
        <Pressable
          style={({ pressed }) => [S.publishBtn, !canPublish && S.publishBtnDisabled, pressed && canPublish && { opacity: 0.88 }]}
          onPress={() => { if (canPublish) { setAuthAgreed(false); setShowAuthModal(true); } }}
          disabled={!canPublish}
        >
          <Text style={S.publishBtnText}>نشر على {selectedPlatforms.size} منصات</Text>
        </Pressable>

      </ScrollView>

      {/* ── Digital Authorization Modal ─────────────────────────────────────── */}
      <Modal visible={showAuthModal} transparent animationType="slide" onRequestClose={() => setShowAuthModal(false)}>
        <Pressable style={S.modalOverlay} onPress={() => setShowAuthModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={S.modalSheet}>
            <View style={S.modalHandle} />

            <Text style={S.modalTitle}>اتفاقية التفويض الرقمي</Text>
            <View style={S.modalDivider} />

            <View style={S.modalBody}>
              <Text style={S.modalBodyText}>
                بتأكيدك، تفوّض منصة <Text style={{ fontFamily: "Inter_700Bold" }}>Rkz</Text> للتصرف بوصفها وكيلك الرقمي لنشر عقارك وإدارته وتحديث بياناته على المنصات العقارية الكبرى (عقار، بيوت، وصلة، Property Finder وغيرها) لتحقيق أقصى قدر من الوصول.{"\n\n"}نلتزم بدقة المعلومات المقدمة والتعامل مع الاستفسارات الأولية نيابةً عنك. بموافقتك، تُقرّ بصحة جميع البيانات التي أدخلتها.
              </Text>
            </View>

            <Pressable
              style={S.modalCheckRow}
              onPress={() => { setAuthAgreed((v) => !v); Haptics.selectionAsync(); }}
            >
              <View style={[S.modalCheckBox, authAgreed && S.modalCheckBoxChecked]}>
                {authAgreed && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={S.modalCheckLabel}>أوافق على شروط التفويض الرقمي</Text>
            </Pressable>

            <Pressable
              style={[S.modalConfirmBtn, !authAgreed && S.modalConfirmBtnDisabled]}
              disabled={!authAgreed}
              onPress={() => { setShowAuthModal(false); handlePublish(); }}
            >
              <Text style={S.modalConfirmBtnText}>تأكيد ونشر العقار</Text>
            </Pressable>

            <Pressable style={S.modalCancelBtn} onPress={() => setShowAuthModal(false)}>
              <Text style={S.modalCancelBtnText}>إلغاء</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}
