import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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

import { useApp } from "@/context/AppContext";
import { type AppConfig, type FeatureItem, type PlatformConfig, type PinResult, DEFAULT_CONFIG, useConfig } from "@/context/DynamicConfig";
import { ADMIN_MASTER_PIN } from "@/constants/adminConfig";
import { useColors } from "@/hooks/useColors";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLocale } from "@/hooks/useLocale";

// ─────────────────────────────────────────────────────────────────────────────
// Preset Themes
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = [
  { id: "navygold", nameAr: "البحري الذهبي", nameEn: "Navy & Gold", primary: "#D4A843", navy: "#0F2040", bg: "#F5F7FA" },
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
// FeatureItemEditor — collapsible editor for one welcome-screen feature card
// ─────────────────────────────────────────────────────────────────────────────
function FeatureItemEditor({
  index,
  feature,
  onChange,
  isAr,
  labelFn,
  labelTitleAr,
  labelTitleEn,
  labelBodyAr,
  labelBodyEn,
}: {
  index: number;
  feature: FeatureItem;
  onChange: (updated: FeatureItem) => void;
  isAr: boolean;
  labelFn: (i: number) => string;
  labelTitleAr: string;
  labelTitleEn: string;
  labelBodyAr: string;
  labelBodyEn: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = isAr ? feature.titleAr : feature.titleEn;

  return (
    <View>
      <Pressable
        onPress={() => { setExpanded((e) => !e); Haptics.selectionAsync(); }}
        style={[styles.featureEditorHeader, isAr && { flexDirection: "row-reverse" }]}
      >
        <View style={styles.featIndexBadge}>
          <Text style={styles.featIndexText}>{index + 1}</Text>
        </View>
        <Text style={[styles.featSummary, isAr && { textAlign: "right" }]} numberOfLines={1}>
          {label || labelFn(index + 1)}
        </Text>
        <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={20} color="#6B7280" />
      </Pressable>
      {expanded && (
        <View style={styles.featureEditorBody}>
          <FieldRow label={labelTitleAr} value={feature.titleAr} onChange={(v) => onChange({ ...feature, titleAr: v })} isAr />
          <FieldRow label={labelTitleEn} value={feature.titleEn} onChange={(v) => onChange({ ...feature, titleEn: v })} />
          <FieldRow label={labelBodyAr} value={feature.bodyAr} onChange={(v) => onChange({ ...feature, bodyAr: v })} isAr multiline />
          <FieldRow label={labelBodyEn} value={feature.bodyEn} onChange={(v) => onChange({ ...feature, bodyEn: v })} multiline />
        </View>
      )}
      {index < 3 && <View style={styles.divider} />}
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
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lockedMin, setLockedMin] = useState<number | null>(null);
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
    if (lockedMin !== null) return;
    setLoading(true);
    const result: PinResult = await verifyPin(pin);
    setLoading(false);
    if (result.valid) {
      setLockedMin(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock(pin);
    } else if (result.locked) {
      setPin("");
      setLockedMin(result.minutesLeft ?? 30);
      setError(true);
      setErrorMsg(t.admin.lockedOut(result.minutesLeft ?? 30));
      shake();
    } else {
      setPin("");
      setError(true);
      const left = result.attemptsLeft ?? 0;
      setErrorMsg(left > 0 ? `${t.admin.pinWrong} — ${t.admin.attemptsLeft(left)}` : t.admin.pinWrong);
      shake();
      setTimeout(() => { setError(false); setErrorMsg(""); }, 3000);
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
              if (lockedMin !== null) return;
              setPin(v.slice(0, 24));
              setError(false);
              setErrorMsg("");
            }}
            placeholder={t.admin.pinPlaceholder}
            placeholderTextColor="rgba(255,255,255,0.35)"
            keyboardType="default"
            secureTextEntry
            maxLength={24}
            autoFocus
            editable={lockedMin === null}
            style={[pinStyles.pinInput, error && pinStyles.pinInputError, lockedMin !== null && { opacity: 0.4 }]}
            onSubmitEditing={handleSubmit}
          />
          {!!errorMsg && (
            <Text style={[pinStyles.errorText, lockedMin !== null && { color: "#FCA5A5" }]}>{errorMsg}</Text>
          )}
        </Animated.View>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [pinStyles.submitBtn, pressed && { opacity: 0.85 }]}
          disabled={loading || pin.length < 4 || lockedMin !== null}
        >
          {loading ? (
            <ActivityIndicator color="#0F2040" size="small" />
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
    content: { ...config.content, features: [...(config.content.features ?? [])] },
    platforms: [...(config.platforms ?? [])],
    propertyTypes: [...(config.propertyTypes ?? [])],
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPlatId, setNewPlatId] = useState("");
  const [newPlatLabelAr, setNewPlatLabelAr] = useState("");
  const [newPlatLabelEn, setNewPlatLabelEn] = useState("");
  const [newPlatColor, setNewPlatColor] = useState("#2563EB");
  const [platError, setPlatError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const hasSavedRef = useRef(false);

  // ── Property Types CRUD state ──────────────────────────────────────────────
  const [newTypeId, setNewTypeId] = useState("");
  const [newTypeAr, setNewTypeAr] = useState("");
  const [newTypeEn, setNewTypeEn] = useState("");
  const [typeError, setTypeError] = useState("");

  function addPropertyType() {
    const id = newTypeId.trim().replace(/\s+/g, "_").toLowerCase();
    if (!id || !newTypeAr.trim() || !newTypeEn.trim()) {
      setTypeError(t.admin.propertyTypeIdRequired);
      return;
    }
    if (draft.propertyTypes.some((pt) => pt.id === id)) {
      setTypeError(t.admin.propertyTypeDuplicate);
      return;
    }
    setDraft((d) => ({
      ...d,
      propertyTypes: [...d.propertyTypes, { id, labelAr: newTypeAr.trim(), labelEn: newTypeEn.trim() }],
    }));
    setNewTypeId("");
    setNewTypeAr("");
    setNewTypeEn("");
    setTypeError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function deletePropertyType(idx: number) {
    setDraft((d) => ({ ...d, propertyTypes: d.propertyTypes.filter((_, i) => i !== idx) }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Operations Center state ────────────────────────────────────────────────
  interface ChatExchange { id: string; ts: string; userMsg: string; reply: string; blocked: boolean; lang: string; }
  interface BuyerIntentRow { id: string; ts: string; type: string; city: string; budget?: number; area?: number; bedrooms?: number; }
  interface ViolationRow { id: string; ts: string; message: string; pattern: string; }

  const [opsChat, setOpsChat] = useState<ChatExchange[]>([]);
  const [opsBuyers, setOpsBuyers] = useState<BuyerIntentRow[]>([]);
  const [opsViolations, setOpsViolations] = useState<ViolationRow[]>([]);
  const [opsRefreshed, setOpsRefreshed] = useState<Date | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [clearingViol, setClearingViol] = useState(false);

  // ── Portal CMS state ──────────────────────────────────────────────────────
  const [draftPortal, setDraftPortal] = useState<{
    brandingNameEn: string; brandingNameAr: string;
    heroTitleEn: string; heroTitleAr: string;
    heroSubtitleEn: string; heroSubtitleAr: string;
    footerDescEn: string;
    contactEmail: string; contactPhone: string;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalMsg, setPortalMsg] = useState("");

  // showSpinner=true only for manual refresh button; auto-poll is silent
  const refreshOps = useCallback(async (showSpinner = false) => {
    if (showSpinner) setOpsLoading(true);
    setOpsChat([]);
    setOpsViolations([]);
    setOpsBuyers([]);
    setOpsRefreshed(new Date());
    if (showSpinner) setOpsLoading(false);
  }, []);

  async function clearViolations() {
    setClearingViol(true);
    setOpsViolations([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClearingViol(false);
  }

  useEffect(() => {
    void refreshOps(false);
    const id = setInterval(() => void refreshOps(false), 30_000);
    return () => clearInterval(id);
  }, [refreshOps]);

  // ── Portal CMS helpers ───────────────────────────────────────────────────
  const fetchPortalContent = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/realestate-api/cms/site-content");
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { content: Record<string, Record<string, string>> };
      const c = data.content;
      setDraftPortal({
        brandingNameEn: c.branding?.companyNameEn  ?? "",
        brandingNameAr: c.branding?.companyNameAr  ?? "",
        heroTitleEn:    c.hero?.titleEn             ?? "",
        heroTitleAr:    c.hero?.titleAr             ?? "",
        heroSubtitleEn: c.hero?.subtitleEn          ?? "",
        heroSubtitleAr: c.hero?.subtitleAr          ?? "",
        footerDescEn:   c.footer?.descriptionEn     ?? "",
        contactEmail:   c.contact?.email            ?? "",
        contactPhone:   c.contact?.phone            ?? "",
      });
    } catch { /* portal unreachable */ }
    setPortalLoading(false);
  }, []);

  useEffect(() => { void fetchPortalContent(); }, [fetchPortalContent]);

  async function savePortalContent() {
    if (!draftPortal) return;
    setPortalSaving(true);
    setPortalMsg("");
    try {
      const opts = (body: unknown) => ({
        method: "PUT" as const,
        headers: { "Content-Type": "application/json" },
        credentials: "include" as RequestCredentials,
        body: JSON.stringify(body),
      });
      const results = await Promise.all([
        fetch("/realestate-api/cms/site-content/branding", opts({
          companyNameEn: draftPortal.brandingNameEn,
          companyNameAr: draftPortal.brandingNameAr,
        })),
        fetch("/realestate-api/cms/site-content/hero", opts({
          titleEn: draftPortal.heroTitleEn, titleAr: draftPortal.heroTitleAr,
          subtitleEn: draftPortal.heroSubtitleEn, subtitleAr: draftPortal.heroSubtitleAr,
        })),
        fetch("/realestate-api/cms/site-content/footer", opts({ descriptionEn: draftPortal.footerDescEn })),
        fetch("/realestate-api/cms/site-content/contact", opts({ email: draftPortal.contactEmail, phone: draftPortal.contactPhone })),
      ]);
      const failed = results.find(r => !r.ok);
      if (failed) {
        const st = failed.status;
        setPortalMsg(st === 401 || st === 403
          ? (isAr ? "❌ سجّل دخولك كمدير في البوابة أولاً" : "❌ Sign in as admin on Investor Portal first")
          : (isAr ? "❌ فشل الحفظ" : "❌ Save failed"));
      } else {
        setPortalMsg(isAr ? "✅ تم الحفظ" : "✅ Saved");
        setTimeout(() => setPortalMsg(""), 3500);
      }
    } catch {
      setPortalMsg(isAr ? "❌ خطأ في الاتصال" : "❌ Connection error");
    }
    setPortalSaving(false);
  }

  // Rollback live preview on unmount if not saved
  useEffect(() => {
    return () => {
      if (!hasSavedRef.current) rollbackAdmin();
    };
  }, [rollbackAdmin]);

  // Update branding field + live preview.
  // Hex color fields and logo/tint are applied immediately for instant preview.
  // Preset themes only touch primaryColor/navyColor/backgroundColor — the
  // fine-tune fields (borderColor, buttonColor, cardBg, logoTint) are never
  // overwritten by a preset, preserving manual selections.
  const updateBranding = useCallback(
    (key: keyof AppConfig["branding"], value: string | null) => {
      const newBranding = { ...draft.branding, [key]: value };
      setDraft((d) => ({ ...d, branding: newBranding }));
      const HEX_KEYS = ["primaryColor", "navyColor", "backgroundColor", "borderColor", "buttonColor", "cardBg"];
      const MEDIA_KEYS: (keyof AppConfig["branding"])[] = ["logoUrl", "logoTint"];
      const isValidHex = HEX_KEYS.includes(key) && typeof value === "string" && HEX_RE.test(value);
      const isMedia = MEDIA_KEYS.includes(key);
      if (isValidHex || isMedia) {
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

  const pickAndUploadLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        isAr ? "إذن مطلوب" : "Permission Required",
        isAr ? "يرجى السماح بالوصول إلى معرض الصور" : "Please allow photo library access to upload a logo"
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const { base64, mimeType } = result.assets[0];
    if (!base64) return;
    setLogoUploading(true);
    try {
      const dataUri = `data:${mimeType ?? "image/jpeg"};base64,${base64}`;
      updateBranding("logoUrl", dataUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(isAr ? "خطأ" : "Error", isAr ? "فشل رفع الشعار" : "Failed to set logo");
    } finally {
      setLogoUploading(false);
    }
  }, [isAr, updateBranding]);

  async function handleSave() {
    setSaving(true);
    setSavedMsg("");
    try {
      const updates: Partial<AppConfig> & { admin?: { pin: string } } = {
        branding: draft.branding,
        content: draft.content,
        platforms: draft.platforms,
        propertyTypes: draft.propertyTypes,
      };
      if (newPin.length >= 8) {
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
            <MaterialIcons name={isAr ? "chevron-right" : "chevron-left"} size={20} color="#FFFFFF" />
            <Text style={styles.backPressText}>{isAr ? "رجوع" : "Back"}</Text>
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
            placeholder="Esteti In"
            isAr={isAr}
          />

          {/* ── Logo Upload ── */}
          <Text style={[styles.fieldLabel, isAr && { textAlign: "right" }]}>{t.admin.logoPreview}</Text>
          <View style={[styles.logoRow, isAr && { flexDirection: "row-reverse" }]}>
            {draft.branding.logoUrl ? (
              <Image
                source={{ uri: draft.branding.logoUrl }}
                style={styles.logoThumb}
                contentFit="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialIcons name="image" size={28} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1, gap: 8 }}>
              <Pressable
                onPress={pickAndUploadLogo}
                disabled={logoUploading}
                style={({ pressed }) => [styles.uploadLogoBtn, pressed && { opacity: 0.8 }, logoUploading && { opacity: 0.6 }]}
              >
                {logoUploading
                  ? <ActivityIndicator size="small" color="#2563EB" />
                  : <MaterialIcons name="photo-library" size={16} color="#2563EB" />}
                <Text style={styles.uploadLogoBtnText}>
                  {logoUploading ? (isAr ? "جارٍ التحميل..." : "Loading...") : t.admin.logoUploadBtn}
                </Text>
              </Pressable>
              {!!draft.branding.logoUrl && (
                <Pressable
                  onPress={() => updateBranding("logoUrl", null)}
                  style={({ pressed }) => [styles.removeLogoBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="delete-outline" size={14} color="#DC2626" />
                  <Text style={styles.removeLogoBtnText}>{t.admin.logoRemove}</Text>
                </Pressable>
              )}
            </View>
          </View>

          <FieldRow
            label={t.admin.logoOrUrl}
            value={draft.branding.logoUrl?.startsWith("data:") ? "" : (draft.branding.logoUrl ?? "")}
            onChange={(v) => updateBranding("logoUrl", v || null)}
            placeholder="https://example.com/logo.png"
            isAr={isAr}
          />

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

          {/* ── Theme palette (presets only touch these 3) ── */}
          <Text style={[styles.fieldLabel, { fontWeight: "600", marginBottom: 6 }, isAr && { textAlign: "right" }]}>
            {isAr ? "لوحة الألوان الرئيسية" : "Theme Palette"}
          </Text>
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

          {/* ── Fine-tune controls (never overwritten by presets) ── */}
          <View style={[styles.divider, { marginVertical: 14 }]} />
          <Text style={[styles.fieldLabel, { fontWeight: "600", marginBottom: 6 }, isAr && { textAlign: "right" }]}>
            {isAr ? "🎨 تخصيص دقيق — يُقدَّم على الثيم" : "🎨 Fine-tune Colors — overrides theme"}
          </Text>
          <ColorInput
            label={isAr ? "لون الإطار / الحدود" : "Border / Frame Color"}
            value={draft.branding.borderColor ?? draft.branding.navyColor}
            onChange={(v) => updateBranding("borderColor", v)}
            isAr={isAr}
          />
          <ColorInput
            label={isAr ? "لون الزر / التمييز" : "Button / Accent Color"}
            value={draft.branding.buttonColor ?? draft.branding.primaryColor}
            onChange={(v) => updateBranding("buttonColor", v)}
            isAr={isAr}
          />
          <ColorInput
            label={isAr ? "خلفية البطاقات / الداخلية" : "Card / Dashboard Background"}
            value={draft.branding.cardBg ?? "#FFFFFF"}
            onChange={(v) => updateBranding("cardBg", v)}
            isAr={isAr}
          />
          <ColorInput
            label={isAr ? "تلوين الشعار (اتركه فارغاً لإيقافه)" : "Logo Tint (leave blank to disable)"}
            value={draft.branding.logoTint ?? ""}
            onChange={(v) => updateBranding("logoTint", v.trim() || null)}
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

        {/* ── 2.5 WELCOME SCREEN FEATURES ─────────────────────────────────── */}
        <SectionCard icon="stars" title={t.admin.featuresSection} iconBg="#F5F3FF" iconColor="#7C3AED" isAr={isAr}>
          <Text style={[styles.fieldLabel, styles.pinHint, isAr && { textAlign: "right" }]}>
            {t.admin.featuresHint}
          </Text>
          {draft.content.features.map((feat, idx) => (
            <FeatureItemEditor
              key={idx}
              index={idx}
              feature={feat}
              onChange={(updated) =>
                setDraft((d) => ({
                  ...d,
                  content: {
                    ...d.content,
                    features: d.content.features.map((f, i) => (i === idx ? updated : f)),
                  },
                }))
              }
              isAr={isAr}
              labelFn={t.admin.featureItem}
              labelTitleAr={t.admin.featureTitleAr}
              labelTitleEn={t.admin.featureTitleEn}
              labelBodyAr={t.admin.featureBodyAr}
              labelBodyEn={t.admin.featureBodyEn}
            />
          ))}
        </SectionCard>

        {/* ── 3. PLATFORM CONTROL ────────────────────────────────────────── */}
        <SectionCard icon="public" title={t.admin.platformsSection} iconBg="#F0FDF4" iconColor="#16A34A" isAr={isAr}>
          {draft.platforms.map((plat, idx) => (
            <React.Fragment key={plat.id}>
              <View style={[styles.platformRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[styles.platDot, { backgroundColor: plat.color + "20" }]}>
                  <View style={[styles.platDotInner, { backgroundColor: plat.color }]} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.platName, isAr && { textAlign: "right" }]}>
                    {plat.labelAr} / {plat.labelEn}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF" }}>
                    id: {plat.id}
                  </Text>
                </View>
                <Switch
                  value={plat.enabled}
                  onValueChange={(v) => {
                    Haptics.selectionAsync();
                    setDraft((d) => ({
                      ...d,
                      platforms: d.platforms.map((p, i) => (i === idx ? { ...p, enabled: v } : p)),
                    }));
                  }}
                  trackColor={{ false: "#D1D5DB", true: draft.branding.primaryColor }}
                  thumbColor="#FFFFFF"
                />
                <Pressable
                  onPress={() => {
                    setDraft((d) => ({ ...d, platforms: d.platforms.filter((_, i) => i !== idx) }));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={({ pressed }) => [styles.deleteTypeBtn, pressed && { opacity: 0.7 }, { marginLeft: 8 }]}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
              {idx < draft.platforms.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}

          {/* Add new platform form */}
          <View style={[styles.divider, { marginVertical: 14 }]} />
          {draft.platforms.length >= 10 ? (
            <Text style={{ fontSize: 12, color: "#F59E0B", fontFamily: "Inter_500Medium", textAlign: isAr ? "right" : "left", marginBottom: 8 }}>
              {t.admin.platformsMax}
            </Text>
          ) : (
            <>
              <FieldRow
                label={t.admin.platformId}
                value={newPlatId}
                onChange={(v) => { setNewPlatId(v); setPlatError(""); }}
                placeholder="nafath"
                isAr={false}
              />
              <FieldRow
                label={t.admin.platformLabelAr}
                value={newPlatLabelAr}
                onChange={(v) => { setNewPlatLabelAr(v); setPlatError(""); }}
                placeholder="نافذة"
                isAr
              />
              <FieldRow
                label={t.admin.platformLabelEn}
                value={newPlatLabelEn}
                onChange={(v) => { setNewPlatLabelEn(v); setPlatError(""); }}
                placeholder="Nafath"
              />
              <FieldRow
                label={t.admin.platformColor}
                value={newPlatColor}
                onChange={(v) => { setNewPlatColor(v); setPlatError(""); }}
                placeholder="#2563EB"
                isAr={false}
              />
              {!!platError && (
                <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 10, textAlign: isAr ? "right" : "left", fontFamily: "Inter_500Medium" }}>
                  {platError}
                </Text>
              )}
              <Pressable
                onPress={() => {
                  const id = newPlatId.trim().replace(/\s+/g, "_").toLowerCase();
                  if (!id || !newPlatLabelAr.trim() || !newPlatLabelEn.trim()) {
                    setPlatError(t.admin.platformRequired);
                    return;
                  }
                  if (draft.platforms.some((p) => p.id === id)) {
                    setPlatError(t.admin.platformDuplicate);
                    return;
                  }
                  setDraft((d) => ({
                    ...d,
                    platforms: [
                      ...d.platforms,
                      { id, labelAr: newPlatLabelAr.trim(), labelEn: newPlatLabelEn.trim(), enabled: true, color: newPlatColor.trim() || "#2563EB" },
                    ],
                  }));
                  setNewPlatId(""); setNewPlatLabelAr(""); setNewPlatLabelEn(""); setNewPlatColor("#2563EB"); setPlatError("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [styles.addTypeBtn, pressed && { opacity: 0.85 }]}
              >
                <MaterialIcons name="add-circle-outline" size={18} color="#16A34A" />
                <Text style={[styles.addTypeBtnText, { color: "#16A34A" }]}>{t.admin.addPlatformBtn}</Text>
              </Pressable>
            </>
          )}
        </SectionCard>

        {/* ── 3.5 PROPERTY TYPES ─────────────────────────────────────────── */}
        <SectionCard icon="category" title={t.admin.propertyTypesSection} iconBg="#FFF7ED" iconColor="#EA580C" isAr={isAr}>
          <Text style={[styles.fieldLabel, styles.pinHint, isAr && { textAlign: "right" }]}>
            {t.admin.propertyTypesHint}
          </Text>

          {/* Existing type list */}
          {draft.propertyTypes.map((pt, idx) => (
            <React.Fragment key={pt.id}>
              <View style={[styles.platformRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.platName, isAr && { textAlign: "right" }]}>
                    {pt.labelAr} / {pt.labelEn}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF" }}>
                    id: {pt.id}
                  </Text>
                </View>
                <Pressable
                  onPress={() => deletePropertyType(idx)}
                  style={({ pressed }) => [styles.deleteTypeBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
              {idx < draft.propertyTypes.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}

          {/* Add new type form */}
          <View style={[styles.divider, { marginVertical: 14 }]} />
          <FieldRow
            label={t.admin.propertyTypeIdHint}
            value={newTypeId}
            onChange={(v) => { setNewTypeId(v); setTypeError(""); }}
            placeholder="rest_house"
            isAr={isAr}
          />
          <FieldRow
            label={t.admin.propertyTypeArLabel}
            value={newTypeAr}
            onChange={(v) => { setNewTypeAr(v); setTypeError(""); }}
            placeholder="استراحة"
            isAr
          />
          <FieldRow
            label={t.admin.propertyTypeEnLabel}
            value={newTypeEn}
            onChange={(v) => { setNewTypeEn(v); setTypeError(""); }}
            placeholder="Rest House"
          />
          {!!typeError && (
            <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 10, textAlign: isAr ? "right" : "left", fontFamily: "Inter_500Medium" }}>
              {typeError}
            </Text>
          )}
          <Pressable
            onPress={addPropertyType}
            style={({ pressed }) => [styles.addTypeBtn, pressed && { opacity: 0.85 }]}
          >
            <MaterialIcons name="add-circle-outline" size={18} color="#EA580C" />
            <Text style={styles.addTypeBtnText}>{t.admin.addPropertyType}</Text>
          </Pressable>
        </SectionCard>

        {/* ── 4. SECURITY ────────────────────────────────────────────────── */}
        <SectionCard icon="lock" title={t.admin.securitySection} iconBg="#FFF1F2" iconColor="#DC2626" isAr={isAr}>
          <Text style={[styles.fieldLabel, styles.pinHint, isAr && { textAlign: "right" }]}>
            {t.admin.currentPinHint}
          </Text>
          <TextInput
            value={newPin}
            onChangeText={(v) => setNewPin(v.slice(0, 24))}
            placeholder={t.admin.newPinLabel}
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            secureTextEntry
            maxLength={24}
            style={[styles.fieldInput, isAr && { textAlign: "right" }]}
          />
        </SectionCard>

        {/* ── 5. OPERATIONS CENTER ───────────────────────────────────────── */}
        <SectionCard icon="monitor-heart" title={isAr ? "مركز العمليات المباشر" : "Live Operations Center"} iconBg="#EEF2FF" iconColor="#4F46E5" isAr={isAr}>
          {/* Header row: stats + refresh */}
          <View style={[styles.opsHeaderRow, isAr && { flexDirection: "row-reverse" }]}>
            <View style={[styles.opsStatChip, { backgroundColor: "#EEF2FF" }]}>
              <MaterialIcons name="chat" size={13} color="#4F46E5" />
              <Text style={[styles.opsStatText, { color: "#4F46E5" }]}>{opsChat.length}</Text>
            </View>
            <View style={[styles.opsStatChip, { backgroundColor: "#FEF2F2" }]}>
              <MaterialIcons name="gpp-bad" size={13} color="#DC2626" />
              <Text style={[styles.opsStatText, { color: "#DC2626" }]}>{opsViolations.length}</Text>
            </View>
            <View style={[styles.opsStatChip, { backgroundColor: "#F0FDF4" }]}>
              <MaterialIcons name="people" size={13} color="#16A34A" />
              <Text style={[styles.opsStatText, { color: "#16A34A" }]}>{opsBuyers.length}</Text>
            </View>
            <Pressable
              onPress={() => void refreshOps(true)}
              disabled={opsLoading}
              style={({ pressed }) => [styles.opsRefreshBtn, pressed && { opacity: 0.7 }, opsLoading && { opacity: 0.5 }]}
            >
              {opsLoading
                ? <ActivityIndicator size="small" color="#4F46E5" />
                : <MaterialIcons name="refresh" size={18} color="#4F46E5" />}
            </Pressable>
          </View>
          {opsRefreshed && (
            <Text style={[styles.opsLastRefresh, isAr && { textAlign: "right" }]}>
              {isAr ? `آخر تحديث: ${opsRefreshed.toLocaleTimeString("ar-SA")}` : `Last refresh: ${opsRefreshed.toLocaleTimeString()}`}
            </Text>
          )}

          {/* ── Chat Feed ── */}
          <View style={styles.opsSubHead}>
            <MaterialIcons name="chat-bubble-outline" size={14} color="#4F46E5" />
            <Text style={[styles.opsSubTitle, { color: "#4F46E5" }]}>{isAr ? "تغذية الدردشة" : "Chat Feed"}</Text>
          </View>
          {opsChat.length === 0 ? (
            <Text style={styles.opsEmpty}>{isAr ? "لا توجد محادثات بعد" : "No conversations yet"}</Text>
          ) : (
            opsChat.slice(0, 8).map((ex, i) => (
              <View key={ex.id} style={[styles.opsChatRow, ex.blocked && { backgroundColor: "#FEF2F2" }, isAr && { flexDirection: "row-reverse" }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.opsChatUser, isAr && { textAlign: "right" }]} numberOfLines={1}>
                    {ex.blocked ? "🛡️ " : "💬 "}{ex.userMsg}
                  </Text>
                  {!ex.blocked && (
                    <Text style={[styles.opsChatReply, isAr && { textAlign: "right" }]} numberOfLines={1}>
                      🤖 {ex.reply}
                    </Text>
                  )}
                  <Text style={[styles.opsChatTs, isAr && { textAlign: "right" }]}>
                    {new Date(ex.ts).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}{ex.lang.toUpperCase()}
                    {ex.blocked ? (isAr ? " · محظور" : " · BLOCKED") : ""}
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={[styles.divider, { marginVertical: 14 }]} />

          {/* ── Buyer Demand ── */}
          <View style={styles.opsSubHead}>
            <MaterialIcons name="people-outline" size={14} color="#16A34A" />
            <Text style={[styles.opsSubTitle, { color: "#16A34A" }]}>{isAr ? "طلبات المشترين" : "Buyer Demand"}</Text>
            <View style={[styles.opsStatChip, { backgroundColor: "#F0FDF4", marginStart: "auto" }]}>
              <Text style={[styles.opsStatText, { color: "#16A34A" }]}>{opsBuyers.length} {isAr ? "طلب" : "total"}</Text>
            </View>
          </View>
          {opsBuyers.length === 0 ? (
            <Text style={styles.opsEmpty}>{isAr ? "لا توجد طلبات مسجّلة بعد" : "No registered demands yet"}</Text>
          ) : (
            opsBuyers.slice(0, 5).map((b) => (
              <View key={b.id} style={[styles.opsBuyerRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.opsBuyerMain, isAr && { textAlign: "right" }]}>
                    {b.type} · {b.city}
                    {b.budget ? ` · ${b.budget.toLocaleString()} ريال` : ""}
                  </Text>
                  {(b.area || b.bedrooms) ? (
                    <Text style={[styles.opsChatTs, isAr && { textAlign: "right" }]}>
                      {b.area ? `${b.area}م²` : ""}{b.area && b.bedrooms ? " · " : ""}{b.bedrooms ? `${b.bedrooms} غرف` : ""}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.opsChatTs}>{new Date(b.ts).toLocaleDateString(isAr ? "ar-SA" : "en-GB")}</Text>
              </View>
            ))
          )}

          <View style={[styles.divider, { marginVertical: 14 }]} />

          {/* ── Violations ── */}
          <View style={[styles.opsSubHead, isAr && { flexDirection: "row-reverse" }]}>
            <MaterialIcons name="gpp-bad" size={14} color="#DC2626" />
            <Text style={[styles.opsSubTitle, { color: "#DC2626" }]}>{isAr ? "مخالفات الاتصال" : "Contact Violations"}</Text>
            {opsViolations.length > 0 && (
              <Pressable
                onPress={clearViolations}
                disabled={clearingViol}
                style={({ pressed }) => [styles.opsClearBtn, pressed && { opacity: 0.7 }]}
              >
                {clearingViol
                  ? <ActivityIndicator size="small" color="#DC2626" />
                  : <Text style={styles.opsClearBtnText}>{isAr ? "مسح الكل" : "Clear All"}</Text>}
              </Pressable>
            )}
          </View>
          {opsViolations.length === 0 ? (
            <Text style={styles.opsEmpty}>{isAr ? "لا توجد مخالفات مسجّلة ✅" : "No violations recorded ✅"}</Text>
          ) : (
            opsViolations.slice(0, 6).map((v) => (
              <View key={v.id} style={[styles.opsViolRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.opsBuyerMain, { color: "#DC2626" }, isAr && { textAlign: "right" }]} numberOfLines={1}>
                    🚨 {v.message}
                  </Text>
                  <Text style={[styles.opsChatTs, isAr && { textAlign: "right" }]}>
                    {v.pattern} · {new Date(v.ts).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        {/* ── 6. REAL ESTATE PORTAL CONTENT ──────────────────────────────── */}
        <SectionCard icon="language" title={isAr ? "محتوى البوابة العقارية" : "Real Estate Portal CMS"} iconBg="#F0F9FF" iconColor="#0284C7" isAr={isAr}>
          <Text style={[styles.fieldLabel, styles.pinHint, isAr && { textAlign: "right" }]}>
            {isAr ? "تحرير محتوى الموقع العقاري مباشرةً من لوحة التحكم" : "Edit the real estate portal's live site content from here"}
          </Text>
          {portalLoading ? (
            <ActivityIndicator size="small" color="#0284C7" style={{ marginVertical: 16 }} />
          ) : draftPortal ? (
            <>
              {/* Branding */}
              <Text style={[styles.fieldLabel, { fontWeight: "600", marginBottom: 8, marginTop: 4 }, isAr && { textAlign: "right" }]}>
                {isAr ? "🏷️ العلامة التجارية" : "🏷️ Branding"}
              </Text>
              <FieldRow
                label={isAr ? "اسم الشركة (إنجليزي)" : "Company Name (EN)"}
                value={draftPortal.brandingNameEn}
                onChange={(v) => setDraftPortal(d => d ? { ...d, brandingNameEn: v } : d)}
                placeholder="Esteti In Smart Solutions"
              />
              <FieldRow
                label={isAr ? "اسم الشركة (عربي)" : "Company Name (AR)"}
                value={draftPortal.brandingNameAr}
                onChange={(v) => setDraftPortal(d => d ? { ...d, brandingNameAr: v } : d)}
                placeholder="استيتي إن للحلول الذكية"
                isAr
              />
              <View style={[styles.divider, { marginVertical: 12 }]} />

              {/* Hero */}
              <Text style={[styles.fieldLabel, { fontWeight: "600", marginBottom: 8 }, isAr && { textAlign: "right" }]}>
                {isAr ? "🖼️ القسم الرئيسي (Hero)" : "🖼️ Hero Section"}
              </Text>
              <FieldRow
                label={isAr ? "العنوان الرئيسي (إنجليزي)" : "Hero Title (EN)"}
                value={draftPortal.heroTitleEn}
                onChange={(v) => setDraftPortal(d => d ? { ...d, heroTitleEn: v } : d)}
                multiline
              />
              <FieldRow
                label={isAr ? "العنوان الرئيسي (عربي)" : "Hero Title (AR)"}
                value={draftPortal.heroTitleAr}
                onChange={(v) => setDraftPortal(d => d ? { ...d, heroTitleAr: v } : d)}
                multiline
                isAr
              />
              <FieldRow
                label={isAr ? "العنوان الفرعي (إنجليزي)" : "Hero Subtitle (EN)"}
                value={draftPortal.heroSubtitleEn}
                onChange={(v) => setDraftPortal(d => d ? { ...d, heroSubtitleEn: v } : d)}
                multiline
              />
              <FieldRow
                label={isAr ? "العنوان الفرعي (عربي)" : "Hero Subtitle (AR)"}
                value={draftPortal.heroSubtitleAr}
                onChange={(v) => setDraftPortal(d => d ? { ...d, heroSubtitleAr: v } : d)}
                multiline
                isAr
              />
              <View style={[styles.divider, { marginVertical: 12 }]} />

              {/* Footer & Contact */}
              <Text style={[styles.fieldLabel, { fontWeight: "600", marginBottom: 8 }, isAr && { textAlign: "right" }]}>
                {isAr ? "📧 التذييل والتواصل" : "📧 Footer & Contact"}
              </Text>
              <FieldRow
                label={isAr ? "وصف التذييل (إنجليزي)" : "Footer Description (EN)"}
                value={draftPortal.footerDescEn}
                onChange={(v) => setDraftPortal(d => d ? { ...d, footerDescEn: v } : d)}
                multiline
              />
              <FieldRow
                label={isAr ? "البريد الإلكتروني" : "Contact Email"}
                value={draftPortal.contactEmail}
                onChange={(v) => setDraftPortal(d => d ? { ...d, contactEmail: v } : d)}
                placeholder="info@rozoz.com"
              />
              <FieldRow
                label={isAr ? "رقم الهاتف" : "Contact Phone"}
                value={draftPortal.contactPhone}
                onChange={(v) => setDraftPortal(d => d ? { ...d, contactPhone: v } : d)}
                placeholder="+966 11 234 5678"
              />

              {!!portalMsg && (
                <Text style={[
                  styles.savedText,
                  { marginTop: 8 },
                  portalMsg.includes("❌") ? { color: "#DC2626" } : {},
                  isAr && { textAlign: "right" },
                ]}>
                  {portalMsg}
                </Text>
              )}

              <Pressable
                onPress={savePortalContent}
                disabled={portalSaving}
                style={({ pressed }) => [
                  styles.addTypeBtn,
                  { marginTop: 12, backgroundColor: "#F0F9FF", borderColor: "#0284C7", borderWidth: 1 },
                  pressed && { opacity: 0.8 },
                  portalSaving && { opacity: 0.6 },
                ]}
              >
                {portalSaving
                  ? <ActivityIndicator size="small" color="#0284C7" />
                  : <MaterialIcons name="cloud-upload" size={16} color="#0284C7" />}
                <Text style={[styles.addTypeBtnText, { color: "#0284C7" }]}>
                  {portalSaving
                    ? (isAr ? "جارٍ الحفظ..." : "Saving...")
                    : (isAr ? "حفظ محتوى البوابة" : "Save Portal Content")}
                </Text>
              </Pressable>

              <Text style={[styles.pinHint, { marginTop: 8 }, isAr && { textAlign: "right" }]}>
                {isAr
                  ? "💡 يتطلب تسجيل الدخول كمدير في بوابة المستثمرين لحفظ التغييرات"
                  : "💡 Requires admin sign-in on the Investor Portal to save changes"}
              </Text>
            </>
          ) : (
            <Text style={styles.opsEmpty}>
              {isAr ? "تعذّر الاتصال بالبوابة العقارية" : "Could not reach the real estate portal"}
            </Text>
          )}
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
              <ActivityIndicator color="#0F2040" size="small" />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color="#0F2040" />
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
  const { user: appUser } = useApp();
  const { beginAdminSession } = useConfig();
  const isAdmin = useIsAdmin();

  // Phone-identified admins and already-authorized users bypass the PIN gate.
  const alreadyAuthorized = appUser?.authorized === true;
  const [authorizedPin, setAuthorizedPin] = useState<string | null>(
    isAdmin || alreadyAuthorized ? ADMIN_MASTER_PIN : null
  );

  // Snapshot current config so we can roll back if user discards changes
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
  backPress: { flexDirection: "row", alignItems: "center", gap: 4 },
  backPressText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
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

  deleteTypeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  addTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#EA580C",
    borderStyle: "dashed",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  addTypeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#EA580C",
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F2040" },
  discardBtn: { alignItems: "center", paddingVertical: 12 },
  discardText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7280" },

  // ── Operations Center ──────────────────────────────────────────────────────
  opsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  opsStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  opsStatText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  opsRefreshBtn: {
    marginLeft: "auto" as unknown as number,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
  },
  opsLastRefresh: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    marginBottom: 12,
  },
  opsSubHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  opsSubTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  opsEmpty: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    marginBottom: 10,
  },
  opsChatRow: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    padding: 8,
    marginBottom: 6,
  },
  opsChatUser: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#111827" },
  opsChatReply: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
  opsChatTs: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  opsBuyerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  opsBuyerMain: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#111827" },
  opsViolRow: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    padding: 8,
    marginBottom: 6,
  },
  opsClearBtn: {
    marginLeft: "auto" as unknown as number,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  opsClearBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#DC2626" },

  // ── Logo upload ────────────────────────────────────────────────────────────
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  logoThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadLogoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  uploadLogoBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  removeLogoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignSelf: "flex-start",
  },
  removeLogoBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#DC2626" },

  // ── Feature item editor ────────────────────────────────────────────────────
  featureEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  featIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  featIndexText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#7C3AED" },
  featSummary: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: "#111827" },
  featureEditorBody: {
    paddingLeft: 12,
    paddingTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#EDE9FE",
    marginLeft: 12,
    marginBottom: 8,
  },
});

const pinStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F2040",
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
    color: "#0F2040",
  },
});
