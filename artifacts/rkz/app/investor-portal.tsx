import { MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DUE_WINDOW_DAYS, daysUntil, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const ROZOZ_WHATSAPP = "https://wa.me/966500000000";

export default function OwnerHubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAr } = useLocale();
  const { leases, tenants } = useApp();

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  const stats = useMemo(() => {
    const total   = leases.filter(l => l.status === "active").length;
    const dueSoon = leases.filter(l => {
      const d = daysUntil(l.nextDueDate);
      return d >= 0 && d <= DUE_WINDOW_DAYS;
    }).length;
    const overdue  = leases.filter(l => daysUntil(l.nextDueDate) < 0).length;
    const upcoming = leases.filter(l => daysUntil(l.nextDueDate) > DUE_WINDOW_DAYS).length;
    return { total, dueSoon, overdue, upcoming };
  }, [leases]);

  const upcomingLeases = useMemo(() =>
    [...leases]
      .sort((a, b) => daysUntil(a.nextDueDate) - daysUntil(b.nextDueDate))
      .slice(0, 5),
    [leases],
  );

  const getTenant = (tenantId: string) => tenants.find(t => t.id === tenantId);

  const s = styles(colors, isAr, topPad, bottomPad);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{isAr ? "لوحة المالك" : "Owner Hub"}</Text>
          <Text style={s.headerSub}>{isAr ? "نظرة عامة على أملاكك وإيجاراتك" : "Overview of your properties & leases"}</Text>
        </View>
      </View>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <View style={s.kpiRow}>
        <View style={[s.kpiCard, { backgroundColor: colors.card }]}>
          <MaterialIcons name="home-work" size={22} color={colors.gold} />
          <Text style={s.kpiValue}>{stats.total}</Text>
          <Text style={s.kpiLabel}>{isAr ? "عقود إيجار" : "Active Leases"}</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#FFFBEB" }]}>
          <MaterialIcons name="schedule" size={22} color="#F59E0B" />
          <Text style={[s.kpiValue, { color: "#D97706" }]}>{stats.dueSoon}</Text>
          <Text style={s.kpiLabel}>{isAr ? "يستحق قريباً" : "Due Soon"}</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: stats.overdue > 0 ? "#FFF1F2" : colors.card }]}>
          <MaterialIcons name="warning" size={22} color={stats.overdue > 0 ? "#E11D48" : "#94A3B8"} />
          <Text style={[s.kpiValue, { color: stats.overdue > 0 ? "#E11D48" : colors.foreground }]}>{stats.overdue}</Text>
          <Text style={s.kpiLabel}>{isAr ? "متأخر" : "Overdue"}</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#F0FDF4" }]}>
          <MaterialIcons name="check-circle" size={22} color="#16A34A" />
          <Text style={[s.kpiValue, { color: "#16A34A" }]}>{stats.upcoming}</Text>
          <Text style={s.kpiLabel}>{isAr ? "منتظم" : "On Track"}</Text>
        </View>
      </View>

      {/* ── Upcoming Payments ──────────────────────────────────────────────── */}
      {leases.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isAr ? "أقرب مواعيد الإيجار" : "Upcoming Rent Dates"}</Text>
          {upcomingLeases.map(lease => {
            const tenant   = getTenant(lease.tenantId);
            const days     = daysUntil(lease.nextDueDate);
            const isOverdue = days < 0;
            const isPaid    = days > DUE_WINDOW_DAYS;
            return (
              <View key={lease.id} style={[s.leaseRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[s.leaseIcon, {
                  backgroundColor: isPaid ? "#F0FDF4" : isOverdue ? "#FFF1F2" : colors.gold + "18",
                }]}>
                  <MaterialIcons
                    name={isPaid ? "check" : isOverdue ? "warning" : "schedule"}
                    size={18}
                    color={isPaid ? "#16A34A" : isOverdue ? "#E11D48" : colors.gold}
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[s.leaseTenant, isAr && { textAlign: "right" }]}>
                    {tenant?.name ?? (isAr ? "مستأجر" : "Tenant")}
                  </Text>
                  <Text style={[s.leaseUnit, isAr && { textAlign: "right" }]}>
                    {lease.unitLabel ?? (isAr ? "وحدة" : "Unit")}
                    {" · "}
                    {lease.rentAmount.toLocaleString()} {isAr ? "ر.س" : "SAR"}
                  </Text>
                </View>
                <View style={[s.statusPill, {
                  backgroundColor: isPaid ? "#DCFCE7" : isOverdue ? "#FFE4E6" : "#FEF3C7",
                }]}>
                  <Text style={[s.statusText, {
                    color: isPaid ? "#16A34A" : isOverdue ? "#E11D48" : "#92400E",
                  }]}>
                    {isOverdue
                      ? (isAr ? `متأخر ${Math.abs(days)}ي` : `${Math.abs(days)}d late`)
                      : isPaid
                      ? (isAr ? "منتظم" : "On Track")
                      : (isAr ? `بعد ${days}ي` : `in ${days}d`)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Empty State ────────────────────────────────────────────────────── */}
      {leases.length === 0 && (
        <View style={s.empty}>
          <View style={[s.emptyIcon, { backgroundColor: colors.gold + "18" }]}>
            <MaterialIcons name="home-work" size={40} color={colors.gold} />
          </View>
          <Text style={s.emptyTitle}>{isAr ? "لا توجد عقود إيجار بعد" : "No leases yet"}</Text>
          <Text style={s.emptySub}>
            {isAr ? "أضف وحداتك ومستأجريك من دفتر المالك" : "Add your units and tenants from the landlord notebook"}
          </Text>
        </View>
      )}

      {/* ── CTAs ───────────────────────────────────────────────────────────── */}
      <View style={s.ctaSection}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/leases"); }}
          style={({ pressed }) => [s.primaryCta, { backgroundColor: colors.gold }, pressed && { opacity: 0.88 }]}
        >
          <MaterialIcons name="menu-book" size={20} color="#0F2040" />
          <Text style={s.primaryCtaText}>{isAr ? "دفتر المالك — إدارة الوحدات والعقود" : "Landlord Notebook — Manage Units & Leases"}</Text>
          <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={20} color="#0F2040" />
        </Pressable>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(ROZOZ_WHATSAPP); }}
          style={({ pressed }) => [s.secondaryCta, { borderColor: "#25D366" }, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons name="chat" size={20} color="#25D366" />
          <Text style={[s.secondaryCtaText, { color: "#25D366" }]}>
            {isAr ? "تواصل مع Rozoz عبر واتساب" : "Contact Rozoz via WhatsApp"}
          </Text>
        </Pressable>

        <View style={s.infoBox}>
          <MaterialIcons name="info-outline" size={16} color="#64748B" />
          <Text style={[s.infoText, isAr && { textAlign: "right" }]}>
            {isAr
              ? "إذا أردت تفويض Rozoz لإدارة أملاكك كاملاً، تواصل معنا لتوقيع عقد الإدارة."
              : "To authorize Rozoz to fully manage your properties, contact us to sign a management agreement."}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function styles(
  colors: ReturnType<typeof useColors>,
  isAr: boolean,
  topPad: number,
  bottomPad: number,
) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: bottomPad },

    header: {
      backgroundColor:   colors.navy,
      paddingTop:        topPad + 16,
      paddingBottom:     24,
      paddingHorizontal: 20,
      flexDirection:     isAr ? "row-reverse" : "row",
      alignItems:        "center",
      gap:               12,
    },
    backBtn:     { padding: 4 },
    headerTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
    headerSub:   { color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3 },

    kpiRow: {
      flexDirection:     isAr ? "row-reverse" : "row",
      paddingHorizontal: 16,
      paddingVertical:   16,
      gap:               10,
    },
    kpiCard: {
      flex: 1, alignItems: "center", gap: 4,
      borderRadius: 14, padding: 12,
      shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    kpiValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    kpiLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#64748B", textAlign: "center" },

    section:      { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: {
      fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground,
      marginBottom: 10, textAlign: isAr ? "right" : "left",
    },

    leaseRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8,
    },
    leaseIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    leaseTenant: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    leaseUnit:   { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 },
    statusPill:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },

    empty:     { alignItems: "center", paddingTop: 60, paddingBottom: 32, paddingHorizontal: 32, gap: 12 },
    emptyIcon: { width: 90, height: 90, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    emptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", lineHeight: 20 },

    ctaSection: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
    primaryCta: {
      flexDirection: isAr ? "row-reverse" : "row", alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 16, padding: 18,
    },
    primaryCtaText: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F2040", marginHorizontal: 10 },
    secondaryCta: {
      flexDirection: isAr ? "row-reverse" : "row", alignItems: "center",
      justifyContent: "center", gap: 10,
      borderWidth: 1.5, borderRadius: 14, padding: 16,
    },
    secondaryCtaText: { fontSize: 15, fontFamily: "Inter_700Bold" },
    infoBox: {
      flexDirection: isAr ? "row-reverse" : "row", alignItems: "flex-start",
      gap: 8, backgroundColor: colors.card,
      borderRadius: 12, padding: 14,
    },
    infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748B", lineHeight: 20 },
  });
}
