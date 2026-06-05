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
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ADMIN_EVENTS_KEY, AdminEvent } from "@/hooks/useAIAssistant";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const PORTAL_USER_KEY = "portal_user";

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

const LOCAL_CREDENTIALS: Record<string, { password: string; user: PortalUser }> = {
  admin: {
    password: "admin123",
    user: { id: 1, username: "admin", displayName: "Admin", role: "owner" },
  },
};

const EVENT_TYPE_COLORS: Record<AdminEvent["type"], string> = {
  valuation_request: "#7C3AED",
  partner_contact:   "#2563EB",
  security_alert:    "#DC2626",
  pending_search:    "#D97706",
};

const EVENT_TYPE_ICONS: Record<AdminEvent["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  valuation_request: "assessment",
  partner_contact:   "people",
  security_alert:    "security",
  pending_search:    "search",
};

const MOCK_STATS: PortalStats = {
  totalRevenue: 1_240_000,
  totalExpenses: 318_500,
  netProfit: 921_500,
  activeBookings: 14,
  totalProperties: 3,
  occupancyRate: 78,
};

const MOCK_BOOKINGS: RecentBooking[] = [
  { id: 1, guestName: "أحمد الشمري", checkIn: "2026-06-01", checkOut: "2026-06-07", status: "checked_in",  totalAmount: 18_500, roomName: "غرفة ديلوكس", propertyName: "فندق جراند داون تاون" },
  { id: 2, guestName: "Khalid Al-Ghamdi", checkIn: "2026-06-03", checkOut: "2026-06-10", status: "confirmed", totalAmount: 24_000, roomName: "Suite 201", propertyName: "Sunset Apartments" },
  { id: 3, guestName: "سارة المطيري",    checkIn: "2026-05-28", checkOut: "2026-06-04", status: "checked_out", totalAmount: 12_600, roomName: "شقة 105",  propertyName: "مجمع أوكوود" },
  { id: 4, guestName: "Omar Hassan",      checkIn: "2026-06-05", checkOut: "2026-06-08", status: "confirmed",  totalAmount:  9_000, roomName: "Room 312",  propertyName: "Grand Downtown Hotel" },
  { id: 5, guestName: "فهد العتيبي",      checkIn: "2026-06-08", checkOut: "2026-06-15", status: "pending",    totalAmount: 21_000, roomName: "فيلا A",    propertyName: "مجمع أوكوود" },
];

const FEATURES = [
  { iconName: "bar-chart" as const,       titleKey: "featFinancialTitle", descKey: "featFinancialDesc" },
  { iconName: "event-available" as const, titleKey: "featBookingTitle",   descKey: "featBookingDesc" },
  { iconName: "security" as const,        titleKey: "featOversightTitle", descKey: "featOversightDesc" },
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
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-SA", { day: "2-digit", month: "short" });
  } catch {
    return dateStr.slice(0, 10);
  }
}

export default function InvestorPortalScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const tp = t.portal;

  const [view,        setView]        = useState<PortalView>("login");
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [user,        setUser]        = useState<PortalUser | null>(null);
  const [stats]     = useState<PortalStats>(MOCK_STATS);
  const [bookings]  = useState<RecentBooking[]>(MOCK_BOOKINGS);
  const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const loadAdminEvents = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ADMIN_EVENTS_KEY);
      if (raw) setAdminEvents(JSON.parse(raw) as AdminEvent[]);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedUser = await AsyncStorage.getItem(PORTAL_USER_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser) as PortalUser);
          setView("dashboard");
        }
        await loadAdminEvents();
      } finally {
        setLoading(false);
        fadeIn();
      }
    })();
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const header = "Type,Description,Timestamp\n";
      const rows = adminEvents.map((e) =>
        `"${e.type}","${e.description.replace(/"/g, '""')}","${new Date(e.timestamp).toISOString()}"`
      ).join("\n");
      const totalRevRow = `\n"KPI","Total Revenue","${stats.totalRevenue} SAR"`;
      const occupancyRow = `\n"KPI","Occupancy Rate","${stats.occupancyRate}%"`;
      const csv = header + rows + totalRevRow + occupancyRow;
      await Share.share({ title: "Analytics Hub Export", message: csv });
    } catch {}
  }, [adminEvents, stats]);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError(tp.invalidCredentials);
      return;
    }
    setError("");
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    const match = LOCAL_CREDENTIALS[username.trim().toLowerCase()];
    if (match && match.password === password) {
      await AsyncStorage.setItem(PORTAL_USER_KEY, JSON.stringify(match.user));
      setUser(match.user);
      setView("dashboard");
      fadeAnim.setValue(0);
      setTimeout(fadeIn, 50);
    } else {
      setError(tp.invalidCredentials);
    }
    setSubmitting(false);
  };

  const handleLogout = () => {
    Alert.alert(tp.logoutPortal, "", [
      { text: t.settings.cancel, style: "cancel" },
      {
        text: tp.logoutPortal,
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(PORTAL_USER_KEY);
          setUser(null);
          setView("login");
          fadeAnim.setValue(0);
          setTimeout(fadeIn, 50);
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

  if (view === "dashboard") {
    return (
      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        <View style={s.dashHeader}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#FFFFFF" />
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
          <View style={s.kpiGrid}>
            <KpiCard label={tp.totalRevenue}   value={`${tp.sar} ${fmtSAR(stats.totalRevenue)}`}   icon="trending-up"              color="#16A34A" s={s} isAr={isAr} />
            <KpiCard label={tp.totalExpenses}  value={`${tp.sar} ${fmtSAR(stats.totalExpenses)}`}  icon="trending-down"            color="#DC2626" s={s} isAr={isAr} />
            <KpiCard label={tp.netProfit}      value={`${tp.sar} ${fmtSAR(stats.netProfit)}`}      icon="account-balance-wallet"   color="#2563EB" s={s} isAr={isAr} />
            <KpiCard label={tp.activeBookings} value={String(stats.activeBookings)}                icon="event-available"          color="#D97706" s={s} isAr={isAr} />
            <KpiCard label={tp.properties}     value={String(stats.totalProperties)}               icon="home-work"                color="#7C3AED" s={s} isAr={isAr} />
            <KpiCard label={tp.occupancy}      value={`${stats.occupancyRate}%`}                   icon="donut-large"              color="#0891B2" s={s} isAr={isAr} />
          </View>

          <View style={s.section}>
            <Text style={[s.sectionTitle, { textAlign: isAr ? "right" : "left" }]}>
              {tp.recentBookings}
            </Text>
            {bookings.map((bk) => (
              <BookingRow key={bk.id} booking={bk} tp={tp} s={s} isAr={isAr} />
            ))}
          </View>

          {/* ── Admin Events Log ── */}
          <View style={s.section}>
            <View style={[s.sectionRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
              <Text style={[s.sectionTitle, { textAlign: isAr ? "right" : "left", flex: 1 }]}>
                {isAr ? "سجل الأحداث" : "Admin Events Log"}
              </Text>
              <Pressable
                onPress={loadAdminEvents}
                hitSlop={8}
                style={({ pressed }) => [s.refreshBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="refresh" size={18} color="#0A1628" />
              </Pressable>
              <Pressable
                onPress={handleExport}
                hitSlop={8}
                style={({ pressed }) => [s.exportBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="share" size={16} color="#FFFFFF" />
                <Text style={s.exportBtnText}>{isAr ? "تصدير" : "Export"}</Text>
              </Pressable>
            </View>
            {adminEvents.length === 0 ? (
              <View style={s.emptyRow}>
                <MaterialIcons name="inbox" size={28} color="#CBD5E1" />
                <Text style={s.emptyText}>{isAr ? "لا توجد أحداث مسجلة بعد" : "No events logged yet"}</Text>
              </View>
            ) : (
              adminEvents.slice(0, 20).map((ev) => (
                <AdminEventRow key={ev.id} event={ev} s={s} isAr={isAr} />
              ))
            )}
          </View>
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.heroBg}>
            <Pressable onPress={() => router.back()} style={s.heroBack} hitSlop={12}>
              <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="rgba(255,255,255,0.8)" />
            </Pressable>
            <View style={s.heroContent}>
              <View style={s.heroLockBadge}>
                <MaterialIcons name="lock" size={28} color="#D4A843" />
              </View>
              <Text style={[s.heroTitle, { textAlign: isAr ? "right" : "left" }]}>
                {isAr ? "مركز التحليلات" : "Analytics Hub"}
              </Text>
              <View style={{ flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <MaterialIcons name="admin-panel-settings" size={14} color="#D4A843" />
                <Text style={{ fontSize: 12, color: "#D4A843", fontFamily: "Inter_600SemiBold" }}>
                  {isAr ? "للمديرين فقط" : "Admin Only"}
                </Text>
              </View>
              <Text style={[s.heroSub, { textAlign: isAr ? "right" : "left" }]}>
                {isAr
                  ? "وصول آمن لإدارة عقاراتك والاطلاع على تقاريرك المالية."
                  : "Secure access to manage your properties and view financial performance."}
              </Text>
              <View style={{ marginTop: 20, gap: 14 }}>
                {FEATURES.map(({ iconName, titleKey, descKey }) => (
                  <View key={titleKey} style={[s.featRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
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

          <View style={s.formCard}>
            {error ? (
              <View style={s.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={{ marginBottom: 14 }}>
              <Text style={[s.inputLabel, { textAlign: isAr ? "right" : "left" }]}>{tp.usernameLabel}</Text>
              <TextInput
                style={[s.input, { textAlign: isAr ? "right" : "left" }]}
                value={username}
                onChangeText={(v) => { setUsername(v); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                placeholder={isAr ? "اسم المستخدم" : "username"}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[s.inputLabel, { textAlign: isAr ? "right" : "left" }]}>{tp.passwordLabel}</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(""); }}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholder={isAr ? "كلمة المرور" : "password"}
                  placeholderTextColor={colors.mutedForeground}
                  textAlign={isAr ? "right" : "left"}
                />
                <Pressable onPress={() => setShowPass((p) => !p)} style={s.eyeBtn} hitSlop={8}>
                  <MaterialIcons name={showPass ? "visibility" : "visibility-off"} size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <Pressable style={({ pressed }) => [s.loginBtn, pressed && { opacity: 0.88 }]} onPress={handleLogin} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="lock" size={18} color="#FFFFFF" />
                  <Text style={s.loginBtnText}>{tp.loginBtn}</Text>
                </>
              )}
            </Pressable>

            <View style={s.secureRow}>
              <MaterialIcons name="security" size={14} color="#16A34A" />
              <Text style={s.secureText}>{tp.securedConnection}</Text>
            </View>

            <View style={s.restrictedBox}>
              <Text style={[s.restrictedText, { textAlign: isAr ? "right" : "left" }]}>
                {tp.restrictedNotice}
              </Text>
            </View>

            <View style={[s.hintBox]}>
              <Text style={[s.hintText, { textAlign: isAr ? "right" : "left" }]}>
                {isAr ? "بيانات الدخول: admin / admin123" : "Login: admin / admin123"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function AdminEventRow({ event, s, isAr }: {
  event: AdminEvent;
  s: ReturnType<typeof makeStyles>;
  isAr: boolean;
}) {
  const color = EVENT_TYPE_COLORS[event.type] ?? "#64748B";
  const iconName = EVENT_TYPE_ICONS[event.type] ?? "info";
  const timeStr = new Date(event.timestamp).toLocaleString(isAr ? "ar-SA" : "en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  return (
    <View style={[s.eventRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
      <View style={[s.eventIconBox, { backgroundColor: color + "18" }]}>
        <MaterialIcons name={iconName} size={16} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
          <View style={[s.eventTypeBadge, { backgroundColor: color + "18" }]}>
            <Text style={[s.eventTypeText, { color }]}>{event.type.replace(/_/g, " ")}</Text>
          </View>
        </View>
        <Text style={[s.eventDesc, { textAlign: isAr ? "right" : "left" }]} numberOfLines={2}>
          {event.description}
        </Text>
        <Text style={[s.eventTime, { textAlign: isAr ? "right" : "left" }]}>{timeStr}</Text>
      </View>
    </View>
  );
}

function KpiCard({ label, value, icon, color, s, isAr }: {
  label: string; value: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  color: string; s: ReturnType<typeof makeStyles>; isAr: boolean;
}) {
  return (
    <View style={s.kpiCard}>
      <View style={[s.kpiIconBox, { backgroundColor: color + "18" }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[s.kpiValue, { textAlign: isAr ? "right" : "left" }]} numberOfLines={1}>{value}</Text>
      <Text style={[s.kpiLabel, { textAlign: isAr ? "right" : "left" }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function BookingRow({ booking, tp, s, isAr }: {
  booking: RecentBooking;
  tp: ReturnType<typeof useLocale>["t"]["portal"];
  s: ReturnType<typeof makeStyles>; isAr: boolean;
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
        <Text style={[s.bookingGuest, { textAlign: isAr ? "right" : "left" }]} numberOfLines={1}>{booking.guestName}</Text>
        <Text style={[s.bookingProp,  { textAlign: isAr ? "right" : "left" }]} numberOfLines={1}>{booking.propertyName} · {booking.roomName}</Text>
        <Text style={[s.bookingDates, { textAlign: isAr ? "right" : "left" }]}>{fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</Text>
      </View>
      <View style={{ alignItems: isAr ? "flex-start" : "flex-end", gap: 4 }}>
        <View style={[s.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{statusLabel[booking.status] ?? booking.status}</Text>
        </View>
        {booking.totalAmount != null && (
          <Text style={s.bookingAmount}>{fmtSAR(booking.totalAmount)} SAR</Text>
        )}
      </View>
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  isAr: boolean,
  insets: { top: number; bottom: number },
) {
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    dashHeader: {
      backgroundColor: "#0A1628",
      paddingTop: topPad + 12,
      paddingBottom: 16,
      paddingHorizontal: 16,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 12,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
    logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
    dashHeaderTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
    dashHeaderSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    kpiGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
    kpiCard: { width: "47%", backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
    kpiIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    kpiValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    kpiLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 3 },
    section: { paddingHorizontal: 16, paddingTop: 8 },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 12 },
    emptyRow: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyText: { color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
    bookingRow: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    bookingGuest: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    bookingProp: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    bookingDates: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    bookingAmount: { fontSize: 13, fontFamily: "Inter_700Bold", color: colors.foreground },
    heroBg: { backgroundColor: "#0A1628", paddingTop: topPad + 16, paddingBottom: 32 },
    heroBack: { paddingHorizontal: 16, paddingBottom: 12 },
    heroContent: { paddingHorizontal: 24 },
    heroLockBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(212,168,67,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    heroTitle: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8 },
    heroSub: { color: "rgba(255,255,255,0.65)", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
    featRow: { gap: 12, alignItems: "flex-start" },
    featIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(212,168,67,0.15)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    featTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 2 },
    featDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", lineHeight: 18 },
    formCard: { backgroundColor: colors.card, margin: 16, borderRadius: 20, padding: 24, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 16 },
    errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#DC2626" },
    inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, marginBottom: 4 },
    passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    eyeBtn: { padding: 10 },
    loginBtn: { backgroundColor: "#0A1628", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
    loginBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
    secureRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 16 },
    secureText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#16A34A" },
    restrictedBox: { backgroundColor: colors.muted, borderRadius: 10, padding: 12, marginTop: 12 },
    restrictedText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
    hintBox: { backgroundColor: "#EFF6FF", borderRadius: 10, padding: 10, marginTop: 10 },
    hintText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#2563EB" },
    errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
    errorBannerText: { flex: 1, fontSize: 13, color: "#DC2626", fontFamily: "Inter_400Regular" },
    sectionRow: { alignItems: "center", gap: 8, marginBottom: 12 },
    refreshBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(10,22,40,0.07)", alignItems: "center", justifyContent: "center" },
    exportBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#0A1628", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    exportBtnText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
    eventRow: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10, alignItems: "flex-start", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
    eventIconBox: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
    eventTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    eventTypeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
    eventDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 18 },
    eventTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });
}
