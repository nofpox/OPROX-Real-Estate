import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
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
import { useConfig } from "@/context/DynamicConfig";
import { useColors } from "@/hooks/useColors";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLocale } from "@/hooks/useLocale";

// Admin PIN (hidden gate — 4 digits)
const ADMIN_PIN = "0786";
// Taps on version text required to surface the PIN modal
const PIN_TAP_THRESHOLD = 7;

export default function SettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { user, setUser, properties } = useApp();
  const { config } = useConfig();
  const { t, isAr } = useLocale();

  const isAdmin = useIsAdmin();

  const [autoRenew,  setAutoRenew]  = useState(true);
  const [notifs,     setNotifs]     = useState(true);
  const [authorized, setAuthorized] = useState(user?.authorized ?? false);

  // ── Admin PIN gate ──────────────────────────────────────────────────────────
  const [pinTapCount,   setPinTapCount]   = useState(0);
  const [showPinModal,  setShowPinModal]  = useState(false);
  const [pinValue,      setPinValue]      = useState("");
  const [pinError,      setPinError]      = useState(false);
  const [pinTarget,     setPinTarget]     = useState<"/admin" | "/admin-dashboard" | "/investor-portal" | "/leases">("/admin-dashboard");
  const pinInputRef = useRef<TextInput>(null);
  const tapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openPinModal(target: typeof pinTarget) {
    setPinTarget(target);
    setPinValue("");
    setPinError(false);
    setShowPinModal(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => pinInputRef.current?.focus(), 300);
  }

  function handleVersionTap() {
    const next = pinTapCount + 1;
    setPinTapCount(next);
    if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
    tapResetTimer.current = setTimeout(() => setPinTapCount(0), 2500);
    if (next >= PIN_TAP_THRESHOLD) {
      setPinTapCount(0);
      openPinModal("/admin");
    }
  }

  function handlePinSubmit() {
    if (pinValue === ADMIN_PIN) {
      setShowPinModal(false);
      setPinValue("");
      setPinError(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(pinTarget);
    } else {
      setPinError(true);
      setPinValue("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setPinError(false), 1500);
    }
  }

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16;

  function handleLogout() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doLogout = () => { setUser(null); router.replace("/login"); };
    // RN-Web's Alert.alert ignores custom buttons / onPress, so logout would
    // appear unresponsive on web. Use window.confirm there, native Alert elsewhere.
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined"
          ? window.confirm(`${t.settings.logoutTitle}\n\n${t.settings.logoutMsg}`)
          : true;
      if (ok) doLogout();
      return;
    }
    Alert.alert(t.settings.logoutTitle, t.settings.logoutMsg, [
      { text: t.settings.cancel, style: "cancel" },
      {
        text: t.settings.logoutConfirm,
        style: "destructive",
        onPress: doLogout,
      },
    ]);
  }

  const publishedCount = properties.filter((p) =>
    p.platforms.some((x) => x.status === "published")
  ).length;

  const S = StyleSheet.create({
    container:   { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 14,
      paddingBottom: 22,
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTextBlock: { flex: 1 },
    headerTitle: {
      color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 3,
      textAlign: isAr ? "right" : "left",
    },
    headerSub: {
      color: "rgba(255,255,255,0.52)", fontSize: 14, fontFamily: "Inter_400Regular",
      textAlign: isAr ? "right" : "left",
    },
    logoutIconBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.08)",
      alignItems: "center", justifyContent: "center",
    },
    scroll:   { flex: 1 },
    profileCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20,
      flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 16,
      shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    avatar: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.navy, alignItems: "center", justifyContent: "center",
    },
    avatarText:    { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
    profileName:   { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: isAr ? "right" : "left" },
    profilePhone:  { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    profileStats:  { marginTop: 6, flexDirection: isAr ? "row-reverse" : "row", gap: 16 },
    profileStat:   { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.gold },
    section:       { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground,
      marginBottom: 10, paddingHorizontal: 4, textTransform: "uppercase",
      letterSpacing: 0.5, textAlign: isAr ? "right" : "left",
    },
    card: {
      backgroundColor: colors.card, borderRadius: 16, overflow: "hidden",
      shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    row: {
      flexDirection: isAr ? "row-reverse" : "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    divider:       { height: 1, backgroundColor: colors.border, marginLeft: 52 },
    iconBox: {
      width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
    },
    rowLabel: {
      flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    authCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16,
      shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    authTitle:  { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6, textAlign: isAr ? "right" : "left" },
    authDesc:   { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 20, marginBottom: 14, textAlign: isAr ? "right" : "left" },
    authRow:    { flexDirection: isAr ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" },
    authStatus: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    connectedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    connectedText:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    versionText: {
      textAlign: "center", marginTop: 16, marginBottom: 4,
      color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular",
    },

    // PIN modal
    modalOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
    },
    pinBox: {
      backgroundColor: colors.card, borderRadius: 20, padding: 28,
      width: "80%", maxWidth: 340, alignItems: "center",
      shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
    },
    pinIconCircle: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: "rgba(201,168,76,0.12)",
      alignItems: "center", justifyContent: "center", marginBottom: 16,
    },
    pinTitle:   { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    pinSub:     { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 20, textAlign: "center" },
    pinInput: {
      width: "100%", height: 52, borderWidth: 1.5,
      borderColor: pinError ? colors.destructive : colors.border,
      borderRadius: 12, paddingHorizontal: 16,
      fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground,
      letterSpacing: 8, textAlign: "center",
      backgroundColor: colors.background,
    },
    pinError: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 8 },
    pinSubmit: {
      marginTop: 16, width: "100%", height: 50, borderRadius: 13,
      backgroundColor: colors.gold, alignItems: "center", justifyContent: "center",
    },
    pinSubmitText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A1628" },
    pinCancel: { marginTop: 12 },
    pinCancelText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  });

  return (
    <View style={S.container}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerRow}>
          <View style={S.headerTextBlock}>
            <Text style={S.headerTitle}>{t.settings.title}</Text>
            <Text style={S.headerSub}>{t.settings.subtitle}</Text>
          </View>
          <Pressable style={S.logoutIconBtn} onPress={handleLogout} hitSlop={8}>
            <MaterialIcons name="logout" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={S.profileCard}>
          <View style={S.avatar}>
            <Text style={S.avatarText}>{user?.phone?.charAt(3) ?? "م"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.profileName}>{user?.name ?? t.settings.ownerFallback}</Text>
            <Text style={S.profilePhone}>{user ? `+966 ${user.phone}` : "—"}</Text>
            <View style={S.profileStats}>
              <Text style={S.profileStat}>{t.settings.propertyCount(properties.length)}</Text>
              <Text style={S.profileStat}>{t.settings.publishedCount(publishedCount)}</Text>
            </View>
          </View>
        </View>

        {/* ── Admin Dashboard (admin-only, hidden from regular users) ──── */}
        {isAdmin && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{isAr ? "إدارة النظام" : "System Administration"}</Text>
            <View style={[S.card, { borderWidth: 1.5, borderColor: colors.gold + "55" }]}>
              <Pressable
                style={({ pressed }) => [S.row, pressed && { opacity: 0.8 }]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/admin-dashboard");
                }}
              >
                <View style={[S.iconBox, { backgroundColor: "rgba(212,168,67,0.14)" }]}>
                  <MaterialIcons name="admin-panel-settings" size={20} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.rowLabel}>{isAr ? "لوحة الإدارة" : "Admin Dashboard"}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }}>
                    {isAr ? "التحليلات · غرفة التحكم · إدارة العقود" : "Analytics · Control Room · Lease Management"}
                  </Text>
                </View>
                <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={18} color={colors.gold} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Authorization toggle */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>{t.settings.authSection}</Text>
          <View style={S.authCard}>
            <Text style={S.authTitle}>{t.settings.authTitle}</Text>
            <Text style={S.authDesc}>{t.settings.authDesc}</Text>
            <View style={S.authRow}>
              <Text style={[S.authStatus, { color: authorized ? colors.success : colors.mutedForeground }]}>
                {authorized ? t.settings.authEnabled : t.settings.authDisabled}
              </Text>
              <Switch
                value={authorized}
                onValueChange={(v) => {
                  setAuthorized(v);
                  void Haptics.selectionAsync();
                  setUser(user ? { ...user, authorized: v } : null);
                }}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Platform connections */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>{t.settings.platformsSection}</Text>
          <View style={S.card}>
            {config.platforms.filter((p) => p.enabled).map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <View style={S.divider} />}
                <View style={S.row}>
                  <View style={[S.iconBox, { backgroundColor: item.color + "20" }]}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                  </View>
                  <Text style={S.rowLabel}>{isAr ? item.labelAr : item.labelEn}</Text>
                  <View style={[S.connectedBadge, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[S.connectedText, { color: "#16A34A" }]}>{t.settings.connected}</Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>{t.settings.prefsSection}</Text>
          <View style={S.card}>
            <View style={S.row}>
              <View style={[S.iconBox, { backgroundColor: "#EFF6FF" }]}>
                <MaterialIcons name="autorenew" size={20} color="#2563EB" />
              </View>
              <Text style={S.rowLabel}>{t.settings.autoRenew}</Text>
              <Switch
                value={autoRenew}
                onValueChange={(v) => { setAutoRenew(v); void Haptics.selectionAsync(); }}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={S.divider} />
            <View style={S.row}>
              <View style={[S.iconBox, { backgroundColor: "#FFF7ED" }]}>
                <MaterialIcons name="notifications-active" size={20} color="#D97706" />
              </View>
              <Text style={S.rowLabel}>{t.settings.notifications}</Text>
              <Switch
                value={notifs}
                onValueChange={(v) => { setNotifs(v); void Haptics.selectionAsync(); }}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={S.divider} />
            <Pressable
              style={({ pressed }) => [S.row, pressed && { opacity: 0.8 }]}
              onPress={async () => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (Platform.OS === "web") {
                  await WebBrowser.openBrowserAsync(
                    "https://property-dashboard-nofabark.replit.app/realestate/contact",
                    { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, toolbarColor: "#0A1628", controlsColor: "#D4A843" }
                  );
                } else {
                  Alert.alert(
                    isAr ? "الدعم والمساعدة" : "Support & Help",
                    isAr ? "تواصل مع فريق الدعم" : "Contact our support team",
                    [
                      {
                        text: isAr ? "إرسال بريد إلكتروني" : "Send Email",
                        onPress: () => void Linking.openURL("mailto:support@rkz-solutions.com"),
                      },
                      {
                        text: isAr ? "زيارة صفحة المساعدة" : "Visit Help Page",
                        onPress: () => void WebBrowser.openBrowserAsync(
                          "https://property-dashboard-nofabark.replit.app/realestate/contact",
                          { toolbarColor: "#0A1628", controlsColor: "#D4A843" }
                        ),
                      },
                      { text: isAr ? "إلغاء" : "Cancel", style: "cancel" },
                    ]
                  );
                }
              }}
            >
              <View style={[S.iconBox, { backgroundColor: "#F0FDF4" }]}>
                <MaterialIcons name="support-agent" size={20} color="#16A34A" />
              </View>
              <Text style={S.rowLabel}>{t.settings.support}</Text>
              <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Company / About */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>{t.settings.companySection}</Text>
          <View style={S.card}>
            <Pressable
              style={({ pressed }) => [S.row, pressed && { opacity: 0.8 }]}
              onPress={async () => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await WebBrowser.openBrowserAsync(
                  "https://property-dashboard-nofabark.replit.app/realestate/",
                  { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, toolbarColor: "#0A1628", controlsColor: "#D4A843" }
                );
              }}
            >
              <View style={[S.iconBox, { backgroundColor: "#FEF9EC" }]}>
                <MaterialIcons name="language" size={20} color="#D4A843" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.rowLabel}>{t.settings.visitWebsite}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }}>
                  {t.settings.visitWebsiteDesc}
                </Text>
              </View>
              <MaterialIcons name="open-in-new" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Owner Hub — always visible */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>{isAr ? "لوحة المالك" : "Owner Hub"}</Text>
          <View style={S.card}>
            <Pressable
              style={({ pressed }) => [S.row, pressed && { opacity: 0.8 }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/investor-portal");
              }}
            >
              <View style={[S.iconBox, { backgroundColor: "#FEF3C7" }]}>
                <MaterialIcons name="home-work" size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.rowLabel}>{isAr ? "لوحة المالك" : "Owner Hub"}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }}>
                  {isAr ? "نظرة عامة على أملاكك وإيجاراتك" : "Overview of your properties & leases"}
                </Text>
              </View>
              <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Lease & Tenant Management — PIN-protected, always visible */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>{t.lease.title}</Text>
          <View style={S.card}>
            <Pressable
              style={({ pressed }) => [S.row, pressed && { opacity: 0.8 }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (isAdmin) { router.push("/leases"); }
                else { openPinModal("/leases"); }
              }}
            >
              <View style={[S.iconBox, { backgroundColor: "#E0F2FE" }]}>
                <MaterialIcons name="description" size={20} color="#0369A1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.rowLabel}>{t.lease.entryTitle}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }}>
                  {t.lease.entryDesc}
                </Text>
              </View>
              <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Version — tap 7× to open DynamicConfig admin */}
        <Pressable onPress={handleVersionTap}>
          <Text style={S.versionText}>{t.settings.version}</Text>
        </Pressable>
      </ScrollView>

      {/* ── Admin PIN Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <Pressable style={S.modalOverlay} onPress={() => setShowPinModal(false)}>
          <Pressable style={S.pinBox} onPress={(e) => e.stopPropagation()}>
            <View style={S.pinIconCircle}>
              <MaterialIcons name="admin-panel-settings" size={28} color={colors.gold} />
            </View>
            <Text style={S.pinTitle}>{isAr ? "وصول المشرف" : "Admin Access"}</Text>
            <Text style={S.pinSub}>
              {isAr ? "أدخل رمز المشرف للمتابعة" : "Enter admin PIN to continue"}
            </Text>
            <TextInput
              ref={pinInputRef}
              style={S.pinInput}
              value={pinValue}
              onChangeText={(v) => { setPinError(false); setPinValue(v.replace(/\D/g, "").slice(0, 4)); }}
              placeholder="••••"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              onSubmitEditing={handlePinSubmit}
              returnKeyType="go"
            />
            {pinError && (
              <Text style={S.pinError}>{isAr ? "رمز غير صحيح" : "Incorrect PIN"}</Text>
            )}
            <Pressable
              style={[S.pinSubmit, pinValue.length < 4 && { opacity: 0.5 }]}
              onPress={handlePinSubmit}
              disabled={pinValue.length < 4}
            >
              <Text style={S.pinSubmitText}>{isAr ? "دخول" : "Enter"}</Text>
            </Pressable>
            <Pressable style={S.pinCancel} onPress={() => setShowPinModal(false)}>
              <Text style={S.pinCancelText}>{isAr ? "إلغاء" : "Cancel"}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
