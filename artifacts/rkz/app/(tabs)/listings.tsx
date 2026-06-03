import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiPost } from "@/constants/api";
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

interface QualifyResult {
  leadId: string;
  score: "serious" | "maybe" | "not_serious";
  summary: string;
}

interface QualifyState {
  loading: boolean;
  results: QualifyResult[];
}

const STATUS_COLORS = {
  published: "#4ADE80",
  publishing: "#FCD34D",
  failed: "#F87171",
  draft: "#94A3B8",
  expired: "#94A3B8",
};

const SCORE_CONFIG = {
  serious: { color: "#4ADE80", bg: "#DCFCE7" },
  maybe: { color: "#D97706", bg: "#FEF3C7" },
  not_serious: { color: "#E53E3E", bg: "#FEE2E2" },
};

export default function ListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { properties, deleteProperty, markLeadRead } = useApp();
  const { t, isAr } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qualifyMap, setQualifyMap] = useState<Record<string, QualifyState>>({});

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

  async function handleQualify(p: Property) {
    if (p.leads.length === 0) return;
    setQualifyMap((prev) => ({ ...prev, [p.id]: { loading: true, results: [] } }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { results } = await apiPost<{ results: QualifyResult[] }>(
        "/rkz/assistant/qualify",
        {
          leads: p.leads.map((l) => ({
            id: l.id,
            name: l.name,
            phone: l.phone,
            platform: l.platform,
          })),
          property: {
            type: p.type,
            city: p.location.city,
            price: p.price,
            area: p.area,
            bedrooms: p.bedrooms,
          },
        }
      );
      setQualifyMap((prev) => ({ ...prev, [p.id]: { loading: false, results } }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setQualifyMap((prev) => ({ ...prev, [p.id]: { loading: false, results: [] } }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    headerTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      marginBottom: 14,
      textAlign: isAr ? "right" : "left",
    },
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
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive, marginTop: 4 },
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

  function getScoreLabel(score: "serious" | "maybe" | "not_serious") {
    if (score === "serious") return t.assistant.serious;
    if (score === "maybe") return t.assistant.maybe;
    return t.assistant.notSerious;
  }

  function renderItem({ item: p }: { item: Property }) {
    const expanded = expandedId === p.id;
    const unreadLeadCount = p.leads.filter((l) => !l.read).length;
    const qs = qualifyMap[p.id];

    return (
      <View style={S.card}>
        <Pressable style={S.cardHeader} onPress={() => setExpandedId(expanded ? null : p.id)}>
          <View style={S.cardLeft}>
            <View style={S.propType}>
              <Text style={S.propTypeText}>{t.propertyTypes[p.type]}</Text>
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

        {/* Expanded: leads + AI qualification */}
        {expanded && p.leads.length > 0 && (
          <>
            <View style={S.divider} />
            <View style={S.qualifySection}>
              {/* AI Qualify button */}
              {!qs || (!qs.loading && qs.results.length === 0) ? (
                <Pressable
                  style={({ pressed }) => [S.qualifyBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => handleQualify(p)}
                  disabled={qs?.loading}
                >
                  {qs?.loading ? (
                    <ActivityIndicator size="small" color={colors.navy} />
                  ) : (
                    <Text style={{ fontSize: 14 }}>✨</Text>
                  )}
                  <Text style={S.qualifyBtnText}>
                    {qs?.loading ? t.assistant.qualifying : t.assistant.qualifyBtn}
                  </Text>
                </Pressable>
              ) : qs.results.length > 0 ? (
                <View style={S.qualifyTitleRow}>
                  <Text style={{ fontSize: 13 }}>✨</Text>
                  <Text style={S.qualifyTitle}>{t.assistant.qualifyTitle}</Text>
                  <Pressable
                    onPress={() => handleQualify(p)}
                    style={{ marginLeft: "auto" }}
                  >
                    <MaterialIcons name="refresh" size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Leads list */}
            <View style={S.leadsSection}>
              <Text style={S.leadsSectionTitle}>
                {t.listings.interestedLeads(p.leads.length, unreadLeadCount)}
              </Text>
              {p.leads.map((lead) => {
                const qr = qs?.results?.find((r) => r.leadId === lead.id);
                const cfg = qr ? SCORE_CONFIG[qr.score] : null;
                return (
                  <Pressable
                    key={lead.id}
                    style={S.leadCard}
                    onPress={() => markLeadRead(p.id, lead.id)}
                  >
                    <View style={S.leadAvatar}>
                      <Text style={S.leadAvatarText}>{lead.name.charAt(0)}</Text>
                    </View>
                    <View style={S.leadInfo}>
                      <Text style={S.leadName}>{lead.name}</Text>
                      <Text style={S.leadPlatform}>
                        {PLATFORM_LABELS[lead.platform as PlatformType]} • {lead.phone}
                      </Text>
                      {qr && cfg && (
                        <>
                          <View style={[S.scoreBadge, { backgroundColor: cfg.bg, marginTop: 4 }]}>
                            <Text style={[S.scoreBadgeText, { color: cfg.color }]}>
                              {getScoreLabel(qr.score)}
                            </Text>
                          </View>
                          {!!qr.summary && (
                            <Text style={S.leadAISummary}>{qr.summary}</Text>
                          )}
                        </>
                      )}
                    </View>
                    {!lead.read && <View style={S.unreadDot} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {expanded && (
          <>
            <View style={S.divider} />
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
        <Text style={S.headerTitle}>{t.listings.title(properties.length)}</Text>
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
