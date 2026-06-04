import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const PORTAL_TOKEN_KEY = "portal_auth_token";
const PORTAL_USER_KEY  = "portal_user";

const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}/api`;

interface PortalUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

interface PortalStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeBookings: number;
  totalProperties: number;
  occupancyRate: number;
}

interface RecentBooking {
  id: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number | null;
  roomName: string;
  propertyName: string;
}

type PortalView = "login" | "dashboard";

async function portalFetch(path: string, token: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Portal-Token": token,
      ...(opts?.headers ?? {}),
    },
  });
  return res;
}

const FEATURES = [
  { iconName: "bar-chart" as const, titleKey: "featFinancialTitle", descKey: "featFinancialDesc" },
  { iconName: "event-available" as const, titleKey: "featBookingTitle", descKey: "featBookingDesc" },
  { iconName: "security" as const, titleKey: "featOversightTitle", descKey: "featOversightDesc" },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed:   "#16A34A",
  checked_in:  "#2563EB",
  checked_out: "#64748B",
  cancelled:   "#DC2626",
  pending:     "#D97706",
};

function fmtSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-SA", {
      day: "2-digit", month: "short",
    });
  } catch {
    return dateStr.slice(0, 10);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InvestorPortalScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const tp = t.portal;

  const [view,       setView]       = useState<PortalView>("login");
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);

  const [token,    setToken]    = useState<string | null>(null);
  const [user,     setUser]     = useState<PortalUser | null>(null);
  const [stats,    setStats]    = useState<PortalStats | null>(null);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [fetchErr, setFetchErr] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // ── Restore persisted session on mount ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(PORTAL_TOKEN_KEY),
          AsyncStorage.getItem(PORTAL_USER_KEY),
        ]);
        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser) as PortalUser;
          setToken(savedToken);
          setUser(parsedUser);
          setView("dashboard");
          loadSummary(savedToken);
        }
      } finally {
        setLoading(false);
        fadeIn();
      }
    })();
  }, []);

  // ── Load summary data ───────────────────────────────────────────────────────
  const loadSummary = useCallback(async (tok: string) => {
    setFetchErr("");
    try {
      const res = await portalFetch("/rkz/portal/summary", tok);
      if (!res.ok) {
        if (res.status === 401) {
          await clearSession();
          return;
        }
        setFetchErr("Failed to load dashboard data.");
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setBookings(data.recentBookings ?? []);
      if (data.user) setUser(data.user);
    } catch {
      setFetchErr("Connection error. Please try again.");
    }
  }, []);

  // ── Clear session ───────────────────────────────────────────────────────────
  const clearSession = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(PORTAL_TOKEN_KEY),
      AsyncStorage.removeItem(PORTAL_USER_KEY),
    ]);
    setToken(null);
    setUser(null);
    setStats(null);
    setBookings([]);
    setView("login");
    fadeAnim.setValue(0);
    setTimeout(fadeIn, 50);
  }, [fadeAnim, fadeIn]);

  // ── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError(tp.invalidCredentials);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/rkz/portal/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tp.invalidCredentials);
        return;
      }
      const tok: string      = data.token;
      const usr: PortalUser  = data.user;
      await Promise.all([
        AsyncStorage.setItem(PORTAL_TOKEN_KEY, tok),
        AsyncStorage.setItem(PORTAL_USER_KEY, JSON.stringify(usr)),
      ]);
      setToken(tok);
      setUser(usr);
      setView("dashboard");
      fadeAnim.setValue(0);
      setTimeout(fadeIn, 50);
      loadSummary(tok);
    } catch {
      setError(tp.invalidCredentials);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(tp.logoutPortal, "", [
      { text: t.settings.cancel, style: "cancel" },
      {
        text: tp.logoutPortal,
        style: "destructive",
        onPress: async () => {
          if (token) {
            try {
              await portalFetch("/rkz/portal/auth/logout", token, { method: "POST" });
            } catch {}
          }
          await clearSession();
        },
      },
    ]);
  };

  const s = makeStyles(colors, isAr, insets);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  // ── Dashboard View ──────────────────────────────────────────────────────────
  if (view === "dashboard") {
    return (
      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={s.dashHeader}>
          <Pressable
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={12}
          >
            <MaterialIcons
              name={isAr ? "arrow-forward" : "arrow-back"}
              size={22}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.dashHeaderTitle}>{tp.dashboardTitle}</Text>
            {user && (
              <Text style={s.dashHeaderSub} numberOfLines={1}>
                {user.displayName} · {user.role}
              </Text>
            )}
          </View>
          <Pressable onPress={handleLogout} hitSlop={10} style={s.logoutBtn}>
            <MaterialIcons name="logout" size={18} color="rgba(255,255,255,0.75)" />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {fetchErr ? (
            <View style={s.errorBanner}>
              <MaterialIcons name="error-outline" size={16} color="#DC2626" />
              <Text style={s.errorBannerText}>{fetchErr}</Text>
              <Pressable onPress={() => token && loadSummary(token)}>
                <MaterialIcons name="refresh" size={18} color="#2563EB" />
              </Pressable>
            </View>
          ) : null}

          {/* KPI Grid */}
          {stats ? (
            <View style={s.kpiGrid}>
              <KpiCard
                label={tp.totalRevenue}
                value={`${tp.sar} ${fmtSAR(stats.totalRevenue)}`}
                icon="trending-up"
                color="#16A34A"
                s={s}
                isAr={isAr}
              />
              <KpiCard
                label={tp.totalExpenses}
                value={`${tp.sar} ${fmtSAR(stats.totalExpenses)}`}
                icon="trending-down"
                color="#DC2626"
                s={s}
                isAr={isAr}
              />
              <KpiCard
                label={tp.netProfit}
                value={`${tp.sar} ${fmtSAR(stats.netProfit)}`}
                icon="account-balance-wallet"
                color={stats.netProfit >= 0 ? "#2563EB" : "#DC2626"}
                s={s}
                isAr={isAr}
              />
              <KpiCard
                label={tp.activeBookings}
                value={String(stats.activeBookings)}
                icon="event-available"
                color="#D97706"
                s={s}
                isAr={isAr}
              />
              <KpiCard
                label={tp.properties}
                value={String(stats.totalProperties)}
                icon="home-work"
                color="#7C3AED"
                s={s}
                isAr={isAr}
              />
              <KpiCard
                label={tp.occupancy}
                value={`${stats.occupancyRate}%`}
                icon="donut-large"
                color="#0891B2"
                s={s}
                isAr={isAr}
              />
            </View>
          ) : (
            <View style={s.kpiGrid}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[s.kpiCard, { backgroundColor: colors.muted }]} />
              ))}
            </View>
          )}

          {/* Recent Bookings */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { textAlign: isAr ? "right" : "left" }]}>
              {tp.recentBookings}
            </Text>
            {bookings.length === 0 && !fetchErr ? (
              <View style={s.emptyRow}>
                <MaterialIcons name="calendar-today" size={32} color={colors.mutedForeground} />
                <Text style={s.emptyText}>{tp.noBookings}</Text>
              </View>
            ) : (
              bookings.map((bk) => (
                <BookingRow key={bk.id} booking={bk} tp={tp} s={s} isAr={isAr} />
              ))
            )}
          </View>
        </ScrollView>
      </Animated.View>
    );
  }

  // ── Login View ──────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero panel */}
          <View style={s.heroBg}>
            <Pressable
              onPress={() => router.back()}
              style={s.heroBack}
              hitSlop={12}
            >
              <MaterialIcons
                name={isAr ? "arrow-forward" : "arrow-back"}
                size={22}
                color="rgba(255,255,255,0.8)"
              />
            </Pressable>

            <View style={s.heroContent}>
              <View style={s.heroLockBadge}>
                <MaterialIcons name="lock" size={28} color="#D4A843" />
              </View>
              <Text style={[s.heroTitle, { textAlign: isAr ? "right" : "left" }]}>
                {isAr ? "بوابة المستثمرين" : "Investor Portal"}
              </Text>
              <Text style={[s.heroSub, { textAlign: isAr ? "right" : "left" }]}>
                {isAr
                  ? "وصول آمن لإدارة عقاراتك والاطلاع على تقاريرك المالية."
                  : "Secure access to manage your properties and view financial performance."}
              </Text>

              {/* Feature bullets */}
              <View style={{ marginTop: 20, gap: 14 }}>
                {FEATURES.map(({ iconName, titleKey, descKey }) => (
                  <View
                    key={titleKey}
                    style={[s.featRow, { flexDirection: isAr ? "row-reverse" : "row" }]}
                  >
                    <View style={s.featIconBox}>
                      <MaterialIcons name={iconName} size={18} color="#D4A843" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.featTitle, { textAlign: isAr ? "right" : "left" }]}>
                        {tp[titleKey as keyof typeof tp] as string}
                      </Text>
                      <Text style={[s.featDesc, { textAlign: isAr ? "right" : "left" }]}>
                        {tp[descKey as keyof typeof tp] as string}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Form card */}
          <View style={s.formCard}>
            {error ? (
              <View style={s.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={{ marginBottom: 14 }}>
              <Text style={[s.inputLabel, { textAlign: isAr ? "right" : "left" }]}>
                {tp.usernameLabel}
              </Text>
              <TextInput
                style={[s.input, { textAlign: isAr ? "right" : "left" }]}
                value={username}
                onChangeText={(v) => { setUsername(v); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                returnKeyType="next"
                placeholder={isAr ? "اسم المستخدم" : "username"}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[s.inputLabel, { textAlign: isAr ? "right" : "left" }]}>
                {tp.passwordLabel}
              </Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(""); }}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholder={isAr ? "كلمة المرور" : "password"}
                  placeholderTextColor={colors.mutedForeground}
                  textAlign={isAr ? "right" : "left"}
                />
                <Pressable
                  onPress={() => setShowPass((p) => !p)}
                  style={s.eyeBtn}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name={showPass ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [s.loginBtn, pressed && { opacity: 0.88 }]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="lock" size={18} color="#FFFFFF" />
                  <Text style={s.loginBtnText}>{tp.loginBtn}</Text>
                </>
              )}
            </Pressable>

            {/* Secured connection badge */}
            <View style={s.secureRow}>
              <MaterialIcons name="security" size={14} color="#16A34A" />
              <Text style={s.secureText}>{tp.securedConnection}</Text>
            </View>

            {/* Restricted notice — exact wording from the web portal */}
            <View style={s.restrictedBox}>
              <Text style={[s.restrictedText, { textAlign: isAr ? "right" : "left" }]}>
                {tp.restrictedNotice}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color, s, isAr,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  color: string;
  s: ReturnType<typeof makeStyles>;
  isAr: boolean;
}) {
  return (
    <View style={s.kpiCard}>
      <View style={[s.kpiIconBox, { backgroundColor: color + "18" }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[s.kpiValue, { textAlign: isAr ? "right" : "left" }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[s.kpiLabel, { textAlign: isAr ? "right" : "left" }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function BookingRow({
  booking, tp, s, isAr,
}: {
  booking: RecentBooking;
  tp: ReturnType<typeof useLocale>["t"]["portal"];
  s: ReturnType<typeof makeStyles>;
  isAr: boolean;
}) {
  const statusColor = STATUS_COLORS[booking.status] ?? "#64748B";
  const statusLabel: Record<string, string> = {
    confirmed:   tp.statusConfirmed,
    checked_in:  tp.statusCheckedIn,
    checked_out: tp.statusCheckedOut,
    cancelled:   tp.statusCancelled,
    pending:     tp.statusPending,
  };

  return (
    <View style={[s.bookingRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[s.bookingGuest, { textAlign: isAr ? "right" : "left" }]} numberOfLines={1}>
          {booking.guestName}
        </Text>
        <Text style={[s.bookingProp, { textAlign: isAr ? "right" : "left" }]} numberOfLines={1}>
          {booking.propertyName} · {booking.roomName}
        </Text>
        <Text style={[s.bookingDates, { textAlign: isAr ? "right" : "left" }]}>
          {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
        </Text>
      </View>
      <View style={{ alignItems: isAr ? "flex-start" : "flex-end", gap: 4 }}>
        <View style={[s.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <Text style={[s.statusText, { color: statusColor }]}>
            {statusLabel[booking.status] ?? booking.status}
          </Text>
        </View>
        {booking.totalAmount != null && (
          <Text style={s.bookingAmount}>
            {fmtSAR(booking.totalAmount)} SAR
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(
  colors: ReturnType<typeof useColors>,
  isAr: boolean,
  insets: { top: number; bottom: number },
) {
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ── Dashboard header ──────────────────────────────────────────────────
    dashHeader: {
      backgroundColor: "#0A1628",
      paddingTop: topPad + 12,
      paddingBottom: 16,
      paddingHorizontal: 16,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    logoutBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    dashHeaderTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      textAlign: isAr ? "right" : "left",
    },
    dashHeaderSub: {
      color: "rgba(255,255,255,0.5)",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
      textAlign: isAr ? "right" : "left",
    },

    // ── Hero (login panel) ────────────────────────────────────────────────
    heroBg: {
      backgroundColor: "#0A1628",
      paddingTop: topPad + 12,
      paddingBottom: 32,
      paddingHorizontal: 20,
    },
    heroBack: {
      marginBottom: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroContent: { gap: 6 },
    heroLockBadge: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "rgba(212,168,67,0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 26,
      fontFamily: "Inter_700Bold",
    },
    heroSub: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      lineHeight: 21,
    },
    featRow: { gap: 12, alignItems: "flex-start" },
    featIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: "rgba(212,168,67,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
      flexShrink: 0,
    },
    featTitle: {
      color: "#FFFFFF",
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    featDesc: {
      color: "rgba(255,255,255,0.5)",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
      marginTop: 1,
    },

    // ── Form card ─────────────────────────────────────────────────────────
    formCard: {
      backgroundColor: colors.card,
      margin: 16,
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    inputLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 6,
    },
    input: {
      height: 46,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
      marginBottom: 14,
    },
    passwordRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    eyeBtn: {
      paddingHorizontal: 14,
      height: 46,
      justifyContent: "center",
    },
    loginBtn: {
      backgroundColor: "#0A1628",
      borderRadius: 14,
      height: 50,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    loginBtnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    secureRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      marginTop: 14,
    },
    secureText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: "#16A34A",
    },
    restrictedBox: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    restrictedText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    errorBox: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FEF2F2",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "#DC2626",
      textAlign: isAr ? "right" : "left",
    },

    // ── Dashboard KPI grid ─────────────────────────────────────────────────
    kpiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      paddingTop: 16,
      gap: 10,
    },
    kpiCard: {
      flex: 1,
      minWidth: "44%",
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
      minHeight: 96,
    },
    kpiIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    kpiValue: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    kpiLabel: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },

    // ── Dashboard recent bookings ──────────────────────────────────────────
    section: {
      paddingHorizontal: 16,
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    bookingRow: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
      gap: 12,
      alignItems: "center",
    },
    bookingGuest: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    bookingProp: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    bookingDates: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    bookingAmount: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: "#0A1628",
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },

    emptyRow: {
      alignItems: "center",
      paddingVertical: 32,
      gap: 10,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },

    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: "#FEF2F2",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    errorBannerText: {
      flex: 1,
      fontSize: 13,
      color: "#DC2626",
      fontFamily: "Inter_400Regular",
    },
  });
}
