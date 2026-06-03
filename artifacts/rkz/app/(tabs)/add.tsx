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

export default function AddPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addProperty } = useApp();

  const [propType, setPropType] = useState<PropertyType>("villa");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("الرياض");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(
    new Set(ALL_PLATFORMS)
  );
  const [step, setStep] = useState<Step>("form");
  const [locationLoading, setLocationLoading] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [publishedPlatforms, setPublishedPlatforms] = useState<PlatformType[]>([]);

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

  async function detectLocation() {
    setLocationLoading(true);
    try {
      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          if (geocode[0]) {
            const g = geocode[0];
            const addr = [g.street, g.district].filter(Boolean).join("، ") || g.name || "";
            if (addr) setAddress(addr);
            if (g.city) setCity(g.city);
          }
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
        setAddress("حي النرجس، طريق الأمير محمد بن سلمان");
        setCity("الرياض");
      }
    } catch {}
    setLocationLoading(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function togglePlatform(p: PlatformType) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return prev;
        next.delete(p);
      } else {
        next.add(p);
      }
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
      location: { address, city },
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
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16;

  const styles = StyleSheet.create({
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
    section: { paddingHorizontal: 20, marginTop: 20 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 8 },
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
      flexDirection: "row",
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
    },
    priceCurrency: {
      paddingHorizontal: 14,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
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
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    publishBtnDisabled: { opacity: 0.4 },
    publishBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.navy },

    // Publishing overlay
    publishingContainer: {
      flex: 1,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    publishingTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 24, marginBottom: 8, textAlign: "center" },
    publishingSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 36 },
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
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    platformCheckDone: { backgroundColor: "rgba(74,222,128,0.1)" },
    platformCheckText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#FFFFFF" },
    platformCheckIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    // Done state
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
    doneTitle: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
    doneSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 40 },
    doneBtn: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      height: 54,
      paddingHorizontal: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.navy },
  });

  if (step === "publishing") {
    const platforms = Array.from(selectedPlatforms);
    return (
      <View style={styles.publishingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.publishingTitle}>جارٍ النشر</Text>
        <Text style={styles.publishingSubtitle}>
          يتم نشر عقارك على {platforms.length} منصة الآن
        </Text>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <View style={styles.platformCheckRow}>
          {platforms.map((p) => {
            const done = publishedPlatforms.includes(p);
            return (
              <View key={p} style={[styles.platformCheck, done && styles.platformCheckDone]}>
                <View style={[styles.platformCheckIcon, { backgroundColor: done ? "#4ADE80" : "rgba(255,255,255,0.1)" }]}>
                  {done ? (
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  ) : (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                  )}
                </View>
                <Text style={styles.platformCheckText}>{PLATFORM_LABELS[p]}</Text>
                {done && <Text style={{ color: "#4ADE80", fontSize: 12, fontFamily: "Inter_500Medium" }}>تم ✓</Text>}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (step === "done") {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneBadge}>
          <MaterialIcons name="check" size={44} color={colors.navy} />
        </View>
        <Text style={styles.doneTitle}>تم النشر بنجاح!</Text>
        <Text style={styles.doneSubtitle}>
          عقارك الآن منشور على {selectedPlatforms.size} منصات وسيظهر للمشترين فوراً
        </Text>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            setStep("form");
            setPrice("");
            setAddress("");
            setArea("");
            setBedrooms("");
            setPhotos([]);
            setPropType("villa");
            setSelectedPlatforms(new Set(ALL_PLATFORMS));
            progressAnim.setValue(0);
            setPublishedPlatforms([]);
            router.replace("/(tabs)");
          }}
        >
          <Text style={styles.doneBtnText}>العودة للرئيسية</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>إضافة عقار جديد</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Property type */}
        <View style={styles.section}>
          <Text style={styles.label}>نوع العقار</Text>
          <View style={styles.typeRow}>
            {PROP_TYPES.map((t) => (
              <Pressable
                key={t}
                style={({ pressed }) => [
                  styles.typePill,
                  propType === t && styles.typePillActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => { setPropType(t); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.typePillText, propType === t && styles.typePillTextActive]}>
                  {PROPERTY_TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>السعر *</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.priceCurrency}>ريال</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>الموقع *</Text>
          <View style={[styles.locationRow, { marginBottom: 10 }]}>
            <TextInput
              style={styles.inputBox}
              value={city}
              onChangeText={setCity}
              placeholder="المدينة"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={styles.locationRow}>
            <TextInput
              style={styles.inputBox}
              value={address}
              onChangeText={setAddress}
              placeholder="الحي أو العنوان"
              placeholderTextColor={colors.mutedForeground}
            />
            <Pressable
              style={({ pressed }) => [styles.gpsBtn, pressed && { opacity: 0.8 }]}
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
        <View style={styles.section}>
          <Text style={styles.label}>تفاصيل (اختياري)</Text>
          <View style={styles.detailsRow}>
            <TextInput
              style={styles.detailInput}
              value={area}
              onChangeText={setArea}
              placeholder="المساحة م²"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
            {(propType === "villa" || propType === "apartment" || propType === "floor" || propType === "compound") && (
              <TextInput
                style={styles.detailInput}
                value={bedrooms}
                onChangeText={setBedrooms}
                placeholder="الغرف"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            )}
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>الصور ({photos.length}/8)</Text>
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <Pressable key={i} onLongPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                <Image source={{ uri }} style={styles.photoThumb} />
              </Pressable>
            ))}
            {photos.length < 8 && (
              <Pressable
                style={({ pressed }) => [styles.addPhotoBtn, pressed && { opacity: 0.7 }]}
                onPress={pickImage}
              >
                <Feather name="camera" size={24} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Platforms */}
        <View style={styles.section}>
          <Text style={styles.label}>المنصات ({selectedPlatforms.size})</Text>
          <View style={styles.platformRow}>
            {ALL_PLATFORMS.map((p) => {
              const active = selectedPlatforms.has(p);
              return (
                <Pressable
                  key={p}
                  style={({ pressed }) => [
                    styles.platformPill,
                    {
                      backgroundColor: active ? PLATFORM_COLORS[p] : colors.muted,
                      borderColor: active ? PLATFORM_COLORS[p] : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => togglePlatform(p)}
                >
                  <MaterialIcons name={active ? "check" : "add"} size={14} color={active ? "#FFFFFF" : colors.mutedForeground} />
                  <Text style={[styles.platformText, { color: active ? "#FFFFFF" : colors.mutedForeground }]}>
                    {PLATFORM_LABELS[p]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Publish button */}
        <Pressable
          style={({ pressed }) => [styles.publishBtn, !canPublish && styles.publishBtnDisabled, pressed && canPublish && { opacity: 0.88 }]}
          onPress={handlePublish}
          disabled={!canPublish}
        >
          <Text style={styles.publishBtnText}>
            نشر على {selectedPlatforms.size} منصات
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
