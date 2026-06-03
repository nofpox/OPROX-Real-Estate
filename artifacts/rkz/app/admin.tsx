import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type AppConfig, DEFAULT_CONFIG, useConfig } from "@/context/DynamicConfig";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

// ─────────────────────────────────────────────────────────────────────────────
// Preset Themes
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = [
  { id: "navygold", nameAr: "البحري الذهبي", nameEn: "Navy & Gold", primary: "#D4A843", navy: "#0A1628", bg: "#F5F7FA" },
  { id: "emerald",  nameAr: "زمرد الخليج",   nameEn: "Gulf Emerald", primary: "#10B981", navy: "#064E3B", bg: "#ECFDF5" },
  { id: "purple",   nameAr: "البنفسجي الملكي", nameEn: "Royal Purple", primary: "#7C3AED", navy: "#2D1B69", bg: "#F5F3FF" },
  { id: "crimson",  nameAr: "أحمر النخبة",   nameEn: "Elite Red",    primary: "#DC2626", navy: "#1C1917", bg: "#FFF1F2" },
  { id: "ocean",    nameAr: "الأزرق الملكي", nameEn: "Royal Blue",   primary: "#2563EB", navy: "#1E3A5F", bg: "#EFF6FF" },
  { id: "desert",   nameAr: "رمال الصحراء",  nameEn: "Desert Sand",  primary: "#D97706", navy: "#44261B", bg: "#FFFBF5" },
] as const;

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// ─────────────────────────────────────────────────────────────────────────────
// ColorInput — swatch + hex input with live validation
// ─────────────────────────────────────────────────────────────────────────────
function ColorInput({
  label,
  value,
  onChange,
  isAr,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  isAr: boolean;
}) {
  const [text, setText] = useState(value);
  const isValid = HEX_RE.test(text);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, isAr && { textAlign: "right" }]}>{label}</Text>
      <View style={[styles.colorRow, isAr && { flexDirection: "row-reverse" }]}>
        <View
          style={[
            styles.colorSwatch,
            { backgroundColor: isValid ? text : "#CCCCCC" },
          ]}
        />
        <TextInput
          value={text}
          onChangeText={(raw) => {
            const v = raw.startsWith("#") ? raw : `#${raw}`;
            setText(v);
            if (HEX_RE.test(v)) onChange(v.toUpperCase());
          }}
          placeholder="#RRGGBB"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
          maxLength={7}
          style={[styles.hexInput, isAr && { textAlign: "right" }]}
        />
        {isValid && (
          <View style={styles.validDot}>
            <MaterialIcons name="check-circle" size={16} color="#10B981" />
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  iconBg,
  iconColor,
  children,
  isAr,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
  isAr: boolean;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={[styles.sectionHeader, isAr && { flexDirection: "row-reverse" }]}>
        <View style={[styles.sectionIconBox, { backgroundColor: iconBg }]}>
          <MaterialIcons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, isAr && { textAlign: "right" }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldRow — label + text input
// ─────────────────────────────────────────────────────────────────────────────
function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  isAr,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isAr?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, isAr && { textAlign: "right" }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        style={[styles.fieldInput, isAr && { textAlign: "right" }, multiline && { height: 72, textAlignVertical: "top" }]}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN Gate
// ─────────────────────────────────────────────────────────────────────────────
function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const insets = useSafeAreaInsets();
  const { verifyPin } = useConfig();
  const { isAr, t } = useLocale();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleSubmit() {
    if (pin.length < 4) return;
    setLoading(true);
    const valid = await verifyPin(pin);
    setLoading(false);
    if (valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock(pin);
    } else {
      setPin("");
      setError(true);
      shake();
      setTimeout(() => setError(false), 2500);
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <View style={[pinStyles.container, { paddingTop: topPad, paddingBottom: insets.bottom + 32 }]}>
      <Pressable onPress={() => router.back()} style={[pinStyles.backBtn, isAr && { alignSelf: "flex-end" }]}>
        <MaterialIcons name={isAr ? "chevron-right" : "chevron-left"} size={24} color="rgba(255,255,255,0.7)" />
        <Text style={pinStyles.backText}>{isAr ? "رجوع" : "Back"}</Text>
      </Pressable>

      <View style={pinStyles.center}>
        <View style={pinStyles.iconBox}>
          <MaterialIcons name="security" size={36} color="#D4A843" />
        </View>
        <Text style={pinStyles.title}>{t.admin.title}</Text>
        <Text style={pinStyles.subtitle}>{t.admin.pinSubtitle}</Text>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }], width: "100%" }}>
          <TextInput
            value={pin}
            onChangeText={(v) => {
              setPin(v.replace(/[^0-9]/g, "").slice(0, 4));
              setError(false);
            }}
            placeholder={t.admin.pinPlaceholder}
            placeholderTextColor="rgba(255,255,255,0.35)"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            autoFocus
            style={[pinStyles.pinInput, error && pinStyles.pinInputError]}
            onSubmitEditing={handleSubmit}
          />
          {error && (
            <Text style={pinStyles.errorText}>{t.admin.pinWrong}</Text>
          )}
        </Animated.View>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [pinStyles.submitBtn, pressed && { opacity: 0.85 }]}
          disabled={loading || pin.length < 4}
        >
          {loading ? (
            <ActivityIndicator color="#0A1628" size="small" />
          ) : (
            <Text style={pinStyles.submitText}>{t.admin.pinBtn}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Panel
// ─────────────────────────────────────────────────────────────────────────────
function AdminPanel({ authorizedPin }: { authorizedPin: string }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { config, updateConfig, applyLocally, rollbackAdmin } = useConfig();
  const { isAr, t } = useLocale();

  const [draft, setDraft] = useState<AppConfig>({
    branding: { ...config.branding },
    content: { ...config.content },
    platforms: { ...config.platforms },
  });
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const hasSavedRef = useRef(false);

  // Rollback live preview on unmount if not saved
  useEffect(() => {
    return () => {
      if (!hasSavedRef.current) rollbackAdmin();
    };
  }, [rollbackAdmin]);

  // Update branding field + live preview for colors
  const updateBranding = useCallback(
    (key: keyof AppConfig["branding"], value: string) => {
      const newBranding = { ...draft.branding, [key]: value };
      setDraft((d) => ({ ...d, branding: newBranding }));
      if (["primaryColor", "navyColor", "backgroundColor"].includes(key) && HEX_RE.test(value)) {
        applyLocally({ branding: newBranding });
      }
    },
    [draft.branding, applyLocally]
  );

  const applyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      const newBranding: AppConfig["branding"] = {
        ...draft.branding,
        primaryColor: preset.primary,
        navyColor: preset.navy,
        backgroundColor: preset.bg,
      };
      setDraft((d) => ({ ...d, branding: newBranding }));
      applyLocally({ branding: newBranding });
      Haptics.selectionAsync();
    },
    [draft.branding, applyLocally]
  );

  async function handleSave() {
    setSaving(true);
    setSavedMsg("");
    try {
      const updates: Partial<AppConfig> & { admin?: { pin: string } } = {
        branding: draft.branding,
        content: draft.content,
        platforms: draft.platforms,
      };
      if (newPin.length === 4) {
        (updates as Record<string, unknown>).admin = { pin: newPin };
      }
      await updateConfig(authorizedPin, updates as Partial<AppConfig>);
      hasSavedRef.current = true;
      setSavedMsg(t.admin.saved);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      Alert.alert(t.admin.saveError, err instanceof Error ? err.message : "Unknown error");
    }
    setSaving(false);
  }

  function handleDiscard() {
    rollbackAdmin();
    router.back();
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20;

  return (
    <View style={[styles.panelContainer, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.panelHeader, { backgroundColor: colors.navy, paddingTop: topPad + 12 }]}>
        <View style={[styles.panelHeaderInner, isAr && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={handleDiscard} style={styles.backPress}>
            <MaterialIcons name={isAr ? "chevron-right" : "chevron-left"} size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.panelTitle}>{t.admin.title}</Text>
            <Text style={styles.panelSubtitle}>{t.admin.subtitle}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Live preview bar */}
        <View style={[styles.previewBar, isAr && { flexDirection: "row-reverse" }]}>
          <MaterialIcons name="visibility" size={12} color="rgba(255,255,255,0.55)" />
          <Text style={styles.previewLabel}>{t.admin.livePreviewNote}</Text>
          <View style={[styles.previewSwatch, { backgroundColor: draft.branding.primaryColor }]} />
          <View style={[styles.previewSwatch, { backgroundColor: draft.branding.navyColor }]} />
          <View style={[styles.previewSwatch, { backgroundColor: draft.branding.backgroundColor, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }]} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. BRANDING & IDENTITY ──────────────────────────────────────── */}
        <SectionCard icon="palette" title={t.admin.brandingSection} iconBg="#FEF3C7" iconColor="#D97706" isAr={isAr}>
          <FieldRow
            label={t.admin.appNameLabel}
            value={draft.branding.appName}
            onChange={(v) => updateBranding("appName", v)}
            placeholder="RKZ"
            isAr={isAr}
          />

          <FieldRow
            label={t.admin.logoUrlLabel}
            value={draft.branding.logoUrl ?? ""}
            onChange={(v) => updateBranding("logoUrl", v || null as unknown as string)}
            placeholder="https://example.com/logo.png"
            isAr={isAr}
          />

          {!!draft.branding.logoUrl && (
            <View style={{ marginBottom: 14, alignItems: "center" }}>
              <Text style={[styles.fieldLabel, isAr && { textAlign: "right", alignSelf: "flex-end" }]}>
                {t.admin.logoPreview}
              </Text>
              <Image
                source={{ uri: draft.branding.logoUrl }}
                style={{ width: 72, height: 72, borderRadius: 16, marginTop: 8 }}
                contentFit="contain"
              />
            </View>
          )}

          {/* Preset Themes */}
          <Text style={[styles.fieldLabel, isAr && { textAlign: "right" }]}>{t.admin.presetsLabel}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
            contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingHorizontal: 2 }}
          >
            {PRESETS.map((p) => {
              const isActive =
                draft.branding.primaryColor === p.primary &&
                draft.branding.navyColor === p.navy;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => applyPreset(p)}
                  style={[styles.presetCard, isActive && { borderColor: p.primary, borderWidth: 2 }]}
                >
                  <View style={styles.presetSwatches}>
                    <View style={[styles.presetSwatch, { backgroundColor: p.navy }]} />
                    <View style={[styles.presetSwatch, { backgroundColor: p.primary }]} />
                    <View style={[styles.presetSwatch, { backgroundColor: p.bg }]} />
                  </View>
                  <Text style={styles.presetName} numberOfLines={1}>
                    {isAr ? p.nameAr : p.nameEn}
                  </Text>
                  {isActive && (
                    <MaterialIcons name="check-circle" size={14} color={p.primary} style={styles.presetCheck} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.divider} />

          <ColorInput
            label={t.admin.primaryColorLabel}
            value={draft.branding.primaryColor}
            onChange={(v) => updateBranding("primaryColor", v)}
            isAr={isAr}
          />
          <ColorInput
            label={t.admin.darkColorLabel}
            value={draft.branding.navyColor}
            onChange={(v) => updateBranding("navyColor", v)}
            isAr={isAr}
          />
          <ColorInput
            label={t.admin.bgColorLabel}
            value={draft.branding.backgroundColor}
            onChange={(v) => updateBranding("backgroundColor", v)}
            isAr={isAr}
          />
        </SectionCard>

        {/* ── 2. CONTENT MANAGEMENT ──────────────────────────────────────── */}
        <SectionCard icon="edit-note" title={t.admin.contentSection} iconBg="#EFF6FF" iconColor="#2563EB" isAr={isAr}>
          <FieldRow
            label={t.admin.taglineArLabel}
            value={draft.content.welcomeTaglineAr}
            onChange={(v) => setDraft((d) => ({ ...d, content: { ...d.content, welcomeTaglineAr: v } }))}
            isAr={isAr}
          />
          <FieldRow
            label={t.admin.taglineEnLabel}
            value={draft.content.welcomeTaglineEn}
            onChange={(v) => setDraft((d) => ({ ...d, content: { ...d.content, welcomeTaglineEn: v } }))}
          />
          <FieldRow
            label={t.admin.headlineArLabel}
            value={draft.content.welcomeHeadlineAr}
            onChange={(v) => setDraft((d) => ({ ...d, content: { ...d.content, welcomeHeadlineAr: v } }))}
            isAr={isAr}
            multiline
          />
          <FieldRow
            label={t.admin.headlineEnLabel}
            value={draft.content.welcomeHeadlineEn}
            onChange={(v) => setDraft((d) => ({ ...d, content: { ...d.content, welcomeHeadlineEn: v } }))}
            multiline
          />
          <FieldRow
            label={t.admin.ctaArLabel}
            value={draft.content.welcomeCtaAr}
            onChange={(v) => setDraft((d) => ({ ...d, content: { ...d.content, welcomeCtaAr: v } }))}
            isAr={isAr}
          />
          <FieldRow
            label={t.admin.ctaEnLabel}
            value={draft.content.welcomeCtaEn}
            onChange={(v) => setDraft((d) => ({ ...d, content: { ...d.content, welcomeCtaEn: v } }))}
          />
        </SectionCard>

        {/* ── 3. PLATFORM CONTROL ────────────────────────────────────────── */}
        <SectionCard icon="public" title={t.admin.platformsSection} iconBg="#F0FDF4" iconColor="#16A34A" isAr={isAr}>
          {(
            [
              { key: "aqar" as const, nameAr: "عقار", nameEn: "Aqar", color: "#2563EB" },
              { key: "bayut" as const, nameAr: "بيوت", nameEn: "Bayut", color: "#7C3AED" },
              { key: "wasalt" as const, nameAr: "وصلت", nameEn: "Wasalt", color: "#059669" },
              { key: "property_finder" as const, nameAr: "بروبرتي فايندر", nameEn: "Property Finder", color: "#D97706" },
            ] satisfies { key: keyof AppConfig["platforms"]; nameAr: string; nameEn: string; color: string }[]
          ).map((item, i, arr) => (
            <React.Fragment key={item.key}>
              <View style={[styles.platformRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[styles.platDot, { backgroundColor: item.color + "20" }]}>
                  <View style={[styles.platDotInner, { backgroundColor: item.color }]} />
                </View>
                <Text style={[styles.platName, isAr && { textAlign: "right" }]}>
                  {isAr ? item.nameAr : item.nameEn}
                </Text>
                <Switch
                  value={draft.platforms[item.key]}
                  onValueChange={(v) => {
                    Haptics.selectionAsync();
                    setDraft((d) => ({ ...d, platforms: { ...d.platforms, [item.key]: v } }));
                  }}
                  trackColor={{ false: "#D1D5DB", true: draft.branding.primaryColor }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </SectionCard>

        {/* ── 4. SECURITY ────────────────────────────────────────────────── */}
        <SectionCard icon="lock" title={t.admin.securitySection} iconBg="#FFF1F2" iconColor="#DC2626" isAr={isAr}>
          <Text style={[styles.fieldLabel, styles.pinHint, isAr && { textAlign: "right" }]}>
            {t.admin.currentPinHint}
          </Text>
          <TextInput
            value={newPin}
            onChangeText={(v) => setNewPin(v.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder={t.admin.newPinLabel}
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            style={[styles.fieldInput, isAr && { textAlign: "right" }]}
          />
        </SectionCard>

        {/* ── SAVE / DISCARD ─────────────────────────────────────────────── */}
        <View style={{ marginTop: 8 }}>
          {!!savedMsg && (
            <View style={styles.savedBanner}>
              <MaterialIcons name="check-circle" size={16} color="#10B981" />
              <Text style={styles.savedText}>{savedMsg}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: draft.branding.primaryColor },
              pressed && { opacity: 0.88 },
              saving && { opacity: 0.65 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#0A1628" size="small" />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color="#0A1628" />
                <Text style={styles.saveBtnText}>{t.admin.saveBtn}</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleDiscard}
            style={({ pressed }) => [styles.discardBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.discardText}>{t.admin.discardBtn}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — PIN gate → Admin Panel
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { beginAdminSession } = useConfig();
  const [authorizedPin, setAuthorizedPin] = useState<string | null>(null);

  // Save snapshot when screen mounts so we can roll back if user doesn't save
  useEffect(() => {
    beginAdminSession();
  }, [beginAdminSession]);

  if (!authorizedPin) {
    return <PinGate onUnlock={setAuthorizedPin} />;
  }

  return <AdminPanel authorizedPin={authorizedPin} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  panelContainer: { flex: 1 },
  panelHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  panelHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backPress: { width: 40, alignItems: "flex-start" },
  panelTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  panelSubtitle: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  previewLabel: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  previewSwatch: { width: 16, height: 16, borderRadius: 4 },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#111827",
  },

  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#111827",
  },

  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 0,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  hexInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#111827",
  },
  validDot: { marginLeft: 4 },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },

  presetCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    width: 90,
    position: "relative",
  },
  presetSwatches: { flexDirection: "row", gap: 4, marginBottom: 6 },
  presetSwatch: { width: 20, height: 20, borderRadius: 4 },
  presetName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
    textAlign: "center",
  },
  presetCheck: { position: "absolute", top: 4, right: 4 },

  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  platDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  platDotInner: { width: 12, height: 12, borderRadius: 6 },
  platName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#111827" },

  pinHint: { marginBottom: 8, color: "#9CA3AF", textTransform: "none", letterSpacing: 0 },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  savedText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#059669" },

  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A1628" },
  discardBtn: { alignItems: "center", paddingVertical: 12 },
  discardText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7280" },
});

const pinStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
    paddingHorizontal: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  backText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 14 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 0,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(212,168,67,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 32,
  },
  pinInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    height: 56,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 8,
    width: "100%",
    marginBottom: 8,
  },
  pinInputError: {
    borderColor: "#F87171",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 8,
    width: "100%",
    height: 52,
    backgroundColor: "#D4A843",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0A1628",
  },
});
