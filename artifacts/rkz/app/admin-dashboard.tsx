import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { ADMIN_EVENTS_KEY, AdminEvent } from "@/hooks/useAIAssistant";
import { useColors } from "@/hooks/useColors";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLocale } from "@/hooks/useLocale";

const EVENT_TYPE_COLORS: Record<AdminEvent["type"], string> = {
  valuation_request: "#7C3AED",
  partner_contact:   "#2563EB",
  security_alert:    "#DC2626",
  pending_search:    "#D97706",
  property_section:  "#0369A1",
  tourism_section:   "#D4A843",
  map_open:          "#16A34A",
  map_close:         "#64748B",
};

const EVENT_TYPE_ICONS: Record<AdminEvent["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  valuation_request: "assessment",
  partner_contact:   "people",
  security_alert:    "security",
  pending_search:    "search",
  property_section:  "apartment",
  tourism_section:   "explore",
  map_open:          "map",
  map_close:         "close",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const { isAr } = useLocale();
  const { user, properties, leases, tenants } = useApp();
  const isAdmin  = useIsAdmin();

  const [events, setEvents] = useState<AdminEvent[]>([]);

  // No redirect — access is now gated by PIN in settings.tsx

  // Load recent admin events
  useEffect(() => {
    AsyncStorage.getItem(ADMIN_EVENTS_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as AdminEvent[];
          setEvents(parsed.slice(0, 5));
        } catch { /* ignore */ }
      }
    });
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16;

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.phone
    ? user.phone.slice(-2)
    : "RM";

  const S = makeStyles(colors, isAr);

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[S.header, { paddingTop: topPad + 14 }]}>
        <View style={S.headerRow}>
          <Pressable
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={S.backBtn}
            hitSlop={10}
          >
            <MaterialIcons name={isAr ? "chevron-right" : "chevron-left"} size={20} color="#FFFFFF" />
            <Text style={S.backBtnText}>{isAr ? "رجوع" : "Back"}</Text>
          </Pressable>

          <View style={S.headerCenter}>
            <MaterialIcons name="admin-panel-settings" size={18} color={colors.gold} style={{ marginBottom: 2 }} />
            <Text style={S.headerTitle}>{isAr ? "لوحة الإدارة" : "Admin Dashboard"}</Text>
          </View>

          <View style={S.adminBadge}>
            <MaterialIcons name="verified" size={12} color={colors.gold} />
            <Text style={S.adminBadgeText}>{isAr ? "مدير" : "Admin"}</Text>
          </View>
        </View>

        {/* Profile strip */}
        <View style={S.profileStrip}>
          <View style={S.avatar}>
            <Text style={S.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.profileName, isAr && { textAlign: "right" }]}>
              {user?.name ?? (isAr ? "مالك النظام" : "System Owner")}
            </Text>
            <Text style={[S.profilePhone, isAr && { textAlign: "right" }]}>
              {user?.phone ? `+966 ${user.phone}` : (isAr ? "وصول المشرف" : "Admin Access")}
            </Text>
          </View>
          <View style={S.rolePill}>
            <Text style={S.rolePillText}>{isAr ? "مدير النظام" : "System Admin"}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Quick Stats ─────────────────────────────────────────────────── */}
        <View style={S.statsRow}>
          <StatCard
            icon="apartment"
            iconBg="#EFF6FF"
            iconColor="#2563EB"
            value={properties.length}
            label={isAr ? "العقارات" : "Properties"}
            colors={colors}
          />
          <StatCard
            icon="description"
            iconBg="#F0FDF4"
            iconColor="#16A34A"
            value={leases?.length ?? 0}
            label={isAr ? "العقود" : "Leases"}
            colors={colors}
          />
          <StatCard
            icon="people"
            iconBg="#FEF9EC"
            iconColor="#D97706"
            value={tenants?.length ?? 0}
            label={isAr ? "المستأجرون" : "Tenants"}
            colors={colors}
          />
        </View>

        {/* ── Action Tiles ─────────────────────────────────────────────────── */}
        <Text style={[S.sectionLabel, isAr && { textAlign: "right" }]}>
          {isAr ? "الأدوات الإدارية" : "Admin Tools"}
        </Text>

        {/* Analytics Hub */}
        <Pressable
          style={({ pressed }) => [S.tile, pressed && { opacity: 0.88 }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/investor-portal");
          }}
        >
          <View style={[S.tileIconBox, { backgroundColor: "#FEF3C7" }]}>
            <MaterialIcons name="bar-chart" size={28} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.tileTitle, isAr && { textAlign: "right" }]}>
              {isAr ? "مركز التحليلات" : "Analytics Hub"}
            </Text>
            <Text style={[S.tileDesc, isAr && { textAlign: "right" }]}>
              {isAr
                ? "المحفظة العقارية · الأحداث · مزودو الخدمات"
                : "Property portfolio · Events · Service providers"}
            </Text>
            <View style={[S.tileTagRow, isAr && { flexDirection: "row-reverse" }]}>
              {(isAr
                ? ["محفظة", "مؤشرات", "تحليل"]
                : ["Portfolio", "KPIs", "Analytics"]
              ).map((tag) => (
                <View key={tag} style={S.tileTag}>
                  <Text style={S.tileTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
          <MaterialIcons
            name={isAr ? "chevron-left" : "chevron-right"}
            size={22}
            color={colors.mutedForeground}
          />
        </Pressable>

        {/* Control Room */}
        <Pressable
          style={({ pressed }) => [S.tile, pressed && { opacity: 0.88 }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/admin");
          }}
        >
          <View style={[S.tileIconBox, { backgroundColor: "rgba(212,168,67,0.15)" }]}>
            <MaterialIcons name="settings" size={28} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.tileTitle, isAr && { textAlign: "right" }]}>
              {isAr ? "غرفة التحكم" : "Control Room"}
            </Text>
            <Text style={[S.tileDesc, isAr && { textAlign: "right" }]}>
              {isAr
                ? "الهوية البصرية · المحتوى · الفهرسة · الإعدادات"
                : "Branding · Content · Indexing · Settings"}
            </Text>
            <View style={[S.tileTagRow, isAr && { flexDirection: "row-reverse" }]}>
              {(isAr
                ? ["الألوان", "المنصات", "العقارات"]
                : ["Colors", "Platforms", "Properties"]
              ).map((tag) => (
                <View key={tag} style={[S.tileTag, { backgroundColor: "rgba(212,168,67,0.12)" }]}>
                  <Text style={[S.tileTagText, { color: colors.gold }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
          <MaterialIcons
            name={isAr ? "chevron-left" : "chevron-right"}
            size={22}
            color={colors.mutedForeground}
          />
        </Pressable>

        {/* Lease Management */}
        <Pressable
          style={({ pressed }) => [S.tile, pressed && { opacity: 0.88 }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/leases");
          }}
        >
          <View style={[S.tileIconBox, { backgroundColor: "#E0F2FE" }]}>
            <MaterialIcons name="description" size={28} color="#0369A1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.tileTitle, isAr && { textAlign: "right" }]}>
              {isAr ? "إدارة العقود والمستأجرين" : "Lease & Tenant Management"}
            </Text>
            <Text style={[S.tileDesc, isAr && { textAlign: "right" }]}>
              {isAr
                ? "العقود · جدول الإيجار · الإشعارات"
                : "Contracts · Rent schedule · Notifications"}
            </Text>
            <View style={[S.tileTagRow, isAr && { flexDirection: "row-reverse" }]}>
              {(isAr
                ? ["عقود", "مدفوعات", "تنبيهات"]
                : ["Leases", "Payments", "Alerts"]
              ).map((tag) => (
                <View key={tag} style={[S.tileTag, { backgroundColor: "#E0F2FE" }]}>
                  <Text style={[S.tileTagText, { color: "#0369A1" }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
          <MaterialIcons
            name={isAr ? "chevron-left" : "chevron-right"}
            size={22}
            color={colors.mutedForeground}
          />
        </Pressable>

        {/* ── Recent Admin Events ──────────────────────────────────────────── */}
        <Text style={[S.sectionLabel, isAr && { textAlign: "right" }, { marginTop: 4 }]}>
          {isAr ? "آخر الأحداث" : "Recent Activity"}
        </Text>

        <View style={S.eventsCard}>
          {events.length === 0 ? (
            <View style={S.emptyEvents}>
              <MaterialIcons name="notifications-none" size={28} color={colors.mutedForeground} />
              <Text style={S.emptyEventsText}>
                {isAr ? "لا توجد أحداث مسجّلة" : "No events recorded yet"}
              </Text>
            </View>
          ) : (
            events.map((ev, i) => (
              <React.Fragment key={ev.id}>
                {i > 0 && <View style={S.eventDivider} />}
                <View style={[S.eventRow, isAr && { flexDirection: "row-reverse" }]}>
                  <View style={[S.eventIconBox, { backgroundColor: EVENT_TYPE_COLORS[ev.type] + "18" }]}>
                    <MaterialIcons
                      name={EVENT_TYPE_ICONS[ev.type]}
                      size={16}
                      color={EVENT_TYPE_COLORS[ev.type]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.eventDesc, isAr && { textAlign: "right" }]} numberOfLines={1}>
                      {ev.description}
                    </Text>
                    <Text style={[S.eventTs, isAr && { textAlign: "right" }]}>
                      {new Date(ev.timestamp).toLocaleDateString(isAr ? "ar-SA" : "en-GB", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={[S.eventTypePill, { backgroundColor: EVENT_TYPE_COLORS[ev.type] + "18" }]}>
                    <Text style={[S.eventTypeText, { color: EVENT_TYPE_COLORS[ev.type] }]}>
                      {ev.type.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon, iconBg, iconColor, value, label, colors,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconBg: string; iconColor: string; value: number; label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.iconBox, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card:    { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  value:   { fontSize: 22, fontFamily: "Inter_700Bold" },
  label:   { fontSize: 11, fontFamily: "Inter_500Medium" },
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
function makeStyles(colors: ReturnType<typeof useColors>, isAr: boolean) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: {
      backgroundColor: colors.navy,
      paddingHorizontal: 16,
      paddingBottom: 18,
    },
    headerRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      marginBottom: 14,
    },
    backBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: "rgba(255,255,255,0.10)",
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18,
    },
    backBtnText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: {
      color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold",
    },
    adminBadge: {
      flexDirection: "row", alignItems: "center", gap: 3,
      backgroundColor: "rgba(212,168,67,0.18)",
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    },
    adminBadgeText: {
      color: colors.gold, fontSize: 11, fontFamily: "Inter_600SemiBold",
    },
    profileStrip: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center", gap: 12,
    },
    avatar: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: "rgba(212,168,67,0.25)",
      borderWidth: 2, borderColor: colors.gold,
      alignItems: "center", justifyContent: "center",
    },
    avatarText: { color: colors.gold, fontSize: 16, fontFamily: "Inter_700Bold" },
    profileName: {
      color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold",
    },
    profilePhone: {
      color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1,
    },
    rolePill: {
      backgroundColor: "rgba(212,168,67,0.18)", borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 4,
    },
    rolePillText: {
      color: colors.gold, fontSize: 11, fontFamily: "Inter_600SemiBold",
    },
    statsRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      gap: 10, marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 12, fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground, textTransform: "uppercase",
      letterSpacing: 0.6, marginBottom: 10,
    },
    tile: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center", gap: 14,
      backgroundColor: colors.card,
      borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
      shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    tileIconBox: {
      width: 52, height: 52, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
    },
    tileTitle: {
      fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 3,
    },
    tileDesc: {
      fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 8,
    },
    tileTagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    tileTag: {
      backgroundColor: colors.border, borderRadius: 6,
      paddingHorizontal: 7, paddingVertical: 2,
    },
    tileTagText: { fontSize: 10, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    eventsCard: {
      backgroundColor: colors.card, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border,
      overflow: "hidden", marginBottom: 8,
    },
    emptyEvents: {
      alignItems: "center", paddingVertical: 28, gap: 8,
    },
    emptyEventsText: {
      fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground,
    },
    eventRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    },
    eventDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },
    eventIconBox: {
      width: 32, height: 32, borderRadius: 8,
      alignItems: "center", justifyContent: "center",
    },
    eventDesc: {
      fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground,
    },
    eventTs: {
      fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1,
    },
    eventTypePill: {
      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
    },
    eventTypeText: {
      fontSize: 9, fontFamily: "Inter_600SemiBold", textTransform: "uppercase",
    },
  });
}
