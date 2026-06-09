import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  Platform as PlatformType,
  Property,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

type Filter = "all" | "published" | "publishing" | "failed";

const STATUS_COLORS = {
  published: "#4ADE80",
  publishing: "#FCD34D",
  failed: "#F87171",
  draft: "#94A3B8",
  expired: "#94A3B8",
};

export default function ListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { properties, deleteProperty } = useApp();
  const { t, isAr } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16;

  const filtered = properties.filter((p) => {
    if (filter === "all") return true;
    if (filter === "published") return p.platforms.some((x) => x.status === "published");
    if (filter === "publishing") return p.platforms.some((x) => x.status === "publishing");
    if (filter === "failed") return p.platforms.some((x) => x.status === "failed");
    return true;
  });

  function handleDelete(id: string) {
    Alert.alert(t.listings.deleteConfirmTitle, t.listings.deleteConfirmMsg, [
      { text: t.listings.cancel, style: "cancel" },
      {
        text: t.listings.delete,
        style: "destructive",
        onPress: () => {
          deleteProperty(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  async function handleShare(propertyTitle: string, propertyId: string) {
    setSharingId(propertyId);
    try {
      const r = await fetch("/realestate-api/preview/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: propertyTitle, portal: "rkz" }),
      });
      if (!r.ok) throw new Error("server error");
      const data = (await r.json()) as { link: { token: string } };
      const token = data.link?.token;
      if (!token) throw new Error("no token");
      const origin =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location.origin
          : "";
      const url = `${origin}/realestate/preview/${token}`;
      await Share.share({
        message: isAr
          ? `شاهد هذا العقار على Razzor MSREP:\n${url}`
          : `View this property on Razzor MSREP:\n${url}`,
        url,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(
        isAr ? "خطأ" : "Error",
        isAr ? "تعذّر إنشاء الرابط. حاول مجدداً." : "Failed to generate link. Please try again."
      );
    } finally {
      setSharingId(null);
    }
  }

  const priceLocale = isAr ? "ar-SA" : "en-US";

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 16,
      paddingBottom: 16,
      paddingHorizontal: 20,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    headerTitle: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      textAlign: isAr ? "right" : "left",
    },
    leaseHeaderBtn: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    leaseHeaderBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
    filterRow: { flexDirection: "row", gap: 8 },
    filterPill: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    filterPillActive: { backgroundColor: colors.gold },
    filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
    filterTextActive: { color: colors.navy },
    list: { flex: 1 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginHorizontal: 16,
      marginTop: 12,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardHeader: {
      padding: 16,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    cardLeft: { flex: 1, gap: 4 },
    propType: {
      alignSelf: isAr ? "flex-end" : "flex-start",
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginBottom: 4,
    },
    propTypeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    propTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    propLocation: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: isAr ? "right" : "left",
    },
    propPrice: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: isAr ? "left" : "right",
    },
    propPriceSub: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: isAr ? "left" : "right",
    },
    platformSection: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
    platformRow: { flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 10 },
    platDot: { width: 8, height: 8, borderRadius: 4 },
    platLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, flex: 1 },
    platStat: { flexDirection: "row", gap: 12 },
    platStatItem: { flexDirection: "row", alignItems: "center", gap: 3 },
    platStatText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    platStatusText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
    },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16, marginBottom: 12 },
    // ── AI Qualify section ──────────────────────────────────────────────────
    qualifySection: { paddingHorizontal: 16, paddingBottom: 0 },
    qualifyBtn: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: colors.navy + "0D",
      borderWidth: 1,
      borderColor: colors.navy + "20",
      alignSelf: "stretch",
      justifyContent: "center",
      marginBottom: 12,
    },
    qualifyBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.navy,
    },
    qualifyTitleRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    qualifyTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    // ── Leads section ──────────────────────────────────────────────────────
    leadsSection: { paddingHorizontal: 16, paddingBottom: 16 },
    leadsSectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      marginBottom: 8,
      textAlign: isAr ? "right" : "left",
    },
    leadCard: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    leadAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    leadAvatarText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 },
    leadInfo: { flex: 1 },
    leadName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    leadPlatform: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: isAr ? "right" : "left",
    },
    leadAISummary: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 3,
      lineHeight: 17,
      textAlign: isAr ? "right" : "left",
    },
    scoreBadge: {
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      alignSelf: "flex-start",
      marginTop: 2,
    },
    scoreBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
    },
    badgeRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 4,
    },
    // ── Qualification Script Card ───────────────────────────────────────────
    scriptCard: {
      backgroundColor: colors.navy + "08",
      borderWidth: 1,
      borderColor: colors.navy + "18",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    scriptHeader: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    scriptTitle: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.navy,
    },
    scriptHint: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 8,
      textAlign: isAr ? "right" : "left",
    },
    scriptText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      lineHeight: 20,
      textAlign: isAr ? "right" : "left",
      marginBottom: 10,
    },
    scriptShareBtn: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 5,
      alignSelf: isAr ? "flex-end" : "flex-start",
      backgroundColor: colors.gold + "20",
      borderRadius: 7,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    scriptShareText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.gold,
    },
    // ── Proactive Alert Banner ──────────────────────────────────────────────
    alertBanner: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.navy,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.gold + "60",
    },
    alertIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.gold + "25",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    alertBody: { flex: 1 },
    alertTitle: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.gold,
      textAlign: isAr ? "right" : "left",
    },
    alertSub: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.65)",
      marginTop: 1,
      textAlign: isAr ? "right" : "left",
    },
    alertShareBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.gold,
    },
    alertShareText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: colors.navy,
    },
    // ── Team Notification Card ──────────────────────────────────────────────
    notifyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    notifyHeader: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    notifyTitle: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    notifyStats: {
      flexDirection: isAr ? "row-reverse" : "row",
      justifyContent: "space-around",
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    notifyStatItem: {
      alignItems: "center",
      gap: 3,
    },
    notifyStatNum: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
    },
    notifyStatLabel: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    notifyShareRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notifyShareText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.gold,
    },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive, marginTop: 4 },
    shareBtn: {
      marginHorizontal: 16,
      marginTop: 0,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.navy + "10",
      borderRadius: 10,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.navy + "20",
    },
    shareBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.navy },
    deleteBtn: {
      margin: 16,
      marginTop: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "#FEF2F2",
      borderRadius: 10,
      paddingVertical: 10,
    },
    deleteBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.destructive },
    expandBtn: {
      alignItems: "center",
      paddingVertical: 10,
      gap: 4,
      flexDirection: "row",
      justifyContent: "center",
    },
    expandText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.gold },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingBottom: 80,
    },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    addBtn: {
      backgroundColor: colors.navy,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    addBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });

  function getStatusLabel(status: string) {
    if (status === "published") return t.listings.statusActive;
    if (status === "publishing") return t.listings.statusPublishing;
    return t.listings.statusFailed;
  }

  function renderItem({ item: p }: { item: Property }) {
    const expanded = expandedId === p.id;

    return (
      <View style={S.card}>
        <Pressable style={S.cardHeader} onPress={() => setExpandedId(expanded ? null : p.id)}>
          <View style={S.cardLeft}>
            <View style={S.propType}>
              <Text style={S.propTypeText}>{(t.propertyTypes as Record<string, string>)[p.type] ?? p.type}</Text>
            </View>
            {p.title && <Text style={S.propTitle} numberOfLines={1}>{p.title}</Text>}
            <Text style={S.propLocation} numberOfLines={1}>
              {p.location.district ? `${p.location.district}، ` : ""}{p.location.city}
            </Text>
          </View>
          <View style={{ alignItems: isAr ? "flex-start" : "flex-end" }}>
            <Text style={S.propPrice}>{p.price.toLocaleString(priceLocale)}</Text>
            <Text style={S.propPriceSub}>{t.listings.sar}</Text>
          </View>
        </Pressable>

        {/* Platform rows */}
        <View style={S.platformSection}>
          {p.platforms.slice(0, expanded ? p.platforms.length : 2).map((pl) => (
            <View key={pl.platform} style={S.platformRow}>
              <View style={[S.platDot, { backgroundColor: PLATFORM_COLORS[pl.platform as PlatformType] }]} />
              <Text style={S.platLabel}>{PLATFORM_LABELS[pl.platform as PlatformType]}</Text>
              <View style={S.platStat}>
                {pl.status === "published" && (
                  <>
                    <View style={S.platStatItem}>
                      <MaterialIcons name="visibility" size={12} color={colors.mutedForeground} />
                      <Text style={S.platStatText}>{pl.views}</Text>
                    </View>
                    <View style={S.platStatItem}>
                      <MaterialIcons name="phone" size={12} color={colors.mutedForeground} />
                      <Text style={S.platStatText}>{pl.leads}</Text>
                    </View>
                  </>
                )}
                <Text
                  style={[
                    S.platStatusText,
                    {
                      color: STATUS_COLORS[pl.status] ?? "#94A3B8",
                      backgroundColor: (STATUS_COLORS[pl.status] ?? "#94A3B8") + "20",
                    },
                  ]}
                >
                  {getStatusLabel(pl.status)}
                </Text>
              </View>
            </View>
          ))}

          {!expanded && p.platforms.length > 2 && (
            <Pressable style={S.expandBtn} onPress={() => setExpandedId(p.id)}>
              <Text style={S.expandText}>{t.listings.showAllPlatforms(p.platforms.length)}</Text>
              <MaterialIcons name="expand-more" size={16} color={colors.gold} />
            </Pressable>
          )}
        </View>

        {/* Expanded: inquiry count */}
        {expanded && p.leads.length > 0 && (
          <>
            <View style={S.divider} />
            <View style={S.qualifySection}>
              <View style={[S.qualifyTitleRow]}>
                <MaterialIcons name="people" size={16} color={colors.gold} />
                <Text style={[S.qualifyTitle, { color: colors.foreground }]}>
                  {isAr ? `${p.leads.length} استفسار` : `${p.leads.length} Inquir${p.leads.length === 1 ? "y" : "ies"}`}
                </Text>
              </View>
            </View>

          </>
        )}

        {expanded && (
          <>
            <View style={S.divider} />
            <Pressable
              style={S.shareBtn}
              onPress={() => handleShare(p.title ?? p.type, p.id)}
              disabled={sharingId === p.id}
            >
              <MaterialIcons
                name={sharingId === p.id ? "hourglass-empty" : "share"}
                size={18}
                color={colors.navy}
              />
              <Text style={S.shareBtnText}>
                {sharingId === p.id
                  ? (isAr ? "جارٍ الإنشاء…" : "Generating…")
                  : (isAr ? "مشاركة رابط مؤقت" : "Share Temp Link")}
              </Text>
            </Pressable>
            <Pressable style={S.deleteBtn} onPress={() => handleDelete(p.id)}>
              <MaterialIcons name="delete-outline" size={18} color={colors.destructive} />
              <Text style={S.deleteBtnText}>{t.listings.deleteProperty}</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={S.container}>
      <View style={S.header}>
        <View style={[S.headerTopRow, isAr && { flexDirection: "row-reverse" }]}>
          <Text style={S.headerTitle}>{t.listings.title(properties.length)}</Text>
          <Pressable
            style={S.leaseHeaderBtn}
            hitSlop={8}
            onPress={() => router.push("/leases")}
          >
            <MaterialIcons name="description" size={18} color={colors.gold} />
            <Text style={S.leaseHeaderBtnText}>{t.lease.title}</Text>
          </Pressable>
        </View>
        <View style={S.filterRow}>
          {(["all", "published", "publishing"] as Filter[]).map((f) => (
            <Pressable
              key={f}
              style={[S.filterPill, filter === f && S.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[S.filterText, filter === f && S.filterTextActive]}>
                {f === "all"
                  ? t.listings.filterAll
                  : f === "published"
                  ? t.listings.filterActive
                  : t.listings.filterPublishing}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={S.emptyContainer}>
          <MaterialIcons name="home-work" size={52} color={colors.mutedForeground} />
          <Text style={S.emptyTitle}>{t.listings.emptyTitle}</Text>
          <Text style={S.emptySubtitle}>{t.listings.emptySubtitle}</Text>
          <Pressable style={S.addBtn} onPress={() => router.push("/(tabs)/add")}>
            <Text style={S.addBtnText}>{t.listings.addProperty}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(p) => p.id}
          style={S.list}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
