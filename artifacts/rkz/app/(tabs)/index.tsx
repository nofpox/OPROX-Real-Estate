import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { generateLocalReport } from "@/constants/localReport";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  Platform as PlatformType,
  Property,
  useApp,
} from "@/context/AppContext";
import { useConfig } from "@/context/DynamicConfig";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const { width: _width } = Dimensions.get("window");

function totalViews(p: Property) {
  return p.platforms.reduce((a, x) => a + (x.views ?? 0), 0);
}

function totalLeads(p: Property) {
  return p.platforms.reduce((a, x) => a + (x.leads ?? 0), 0);
}

interface AIReport {
  summary: string;
  insights: string[];
  actions: string[];
  score: number;
}

// ── Score color ──────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 75) return "#4ADE80";
  if (score >= 50) return "#FCD34D";
  return "#F87171";
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { properties, unreadLeadsCount } = useApp();
  const { t, isAr } = useLocale();
  const { config } = useConfig();
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const scoreAnim = useRef(new Animated.Value(0)).current;

  const publishedCount = properties.filter((p) =>
    p.platforms.some((x) => x.status === "published")
  ).length;
  const allViews = properties.reduce((a, p) => a + totalViews(p), 0);
  const allLeads = properties.reduce((a, p) => a + totalLeads(p), 0);
  const publishingCount = properties.filter((p) =>
    p.platforms.some((x) => x.status === "publishing")
  ).length;

  async function fetchReport() {
    if (properties.length === 0) return;
    setReportLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const portfolioData = properties.map((p) => ({
      type: p.type,
      city: p.location.city,
      district: p.location.district,
      price: p.price,
      area: p.area,
      bedrooms: p.bedrooms,
      status: p.platforms.some((x) => x.status === "published") ? "published" : "publishing",
      views: totalViews(p),
      leads: p.leads.length,
      publishedAt: p.publishedAt,
    }));
    const result = generateLocalReport(portfolioData, isAr);
    setReport(result);
    Animated.timing(scoreAnim, {
      toValue: result.score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
    setReportLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => { void fetchReport(); }, 800);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onRefresh() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPadding + 16,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    headerTop: {
      flexDirection: isAr ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    greeting: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: isAr ? "right" : "left",
    },
    appName: {
      color: "#FFFFFF",
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
      textAlign: isAr ? "right" : "left",
    },
    notifBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: colors.navy, fontSize: 10, fontFamily: "Inter_700Bold" },
    kpiRow: { flexDirection: "row", gap: 10 },
    kpi: {
      flex: 1,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 12,
      padding: 14,
    },
    kpiValue: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
    kpiLabel: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    kpiDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
    scroll: { flex: 1 },
    // ── AI Report Card ────────────────────────────────────────────────────────
    reportSection: { paddingHorizontal: 20, marginTop: 20 },
    reportCard: {
      backgroundColor: colors.goldLight,
      borderRadius: 16,
      padding: 16,
      overflow: "hidden",
    },
    reportHeaderRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    reportTitleRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
    },
    reportTitle: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: colors.navyLight,
    },
    scoreCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    scoreText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
    },
    refreshBtn: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.gold + "30",
    },
    refreshBtnText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.navyLight,
    },
    reportSummary: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.navyLight,
      lineHeight: 20,
      marginBottom: 12,
      textAlign: isAr ? "right" : "left",
    },
    insightRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 6,
    },
    insightDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.gold,
      marginTop: 7,
      flexShrink: 0,
    },
    insightText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.navyLight,
      lineHeight: 20,
      textAlign: isAr ? "right" : "left",
    },
    actionsLabel: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.navy,
      marginTop: 10,
      marginBottom: 6,
      textAlign: isAr ? "right" : "left",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    actionPill: {
      backgroundColor: colors.navy + "15",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 4,
    },
    actionText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.navy,
      textAlign: isAr ? "right" : "left",
    },
    reportLoadingBox: {
      alignItems: "center",
      paddingVertical: 20,
      gap: 8,
    },
    reportLoadingText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.navyLight,
    },
    openAssistantRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.gold + "40",
    },
    openAssistantText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.navy,
    },
    // ── Properties section ────────────────────────────────────────────────────
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: {
      flexDirection: isAr ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    seeAll: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.gold },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardTop: {
      flexDirection: isAr ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    propTypeBadge: {
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    propTypeText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    propPrice: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: isAr ? "right" : "left",
    },
    propCurrency: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: isAr ? "right" : "left",
    },
    propAddress: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 12,
      textAlign: isAr ? "right" : "left",
    },
    statsRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      gap: 16,
      marginBottom: 12,
    },
    statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    statText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    platformRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    platformPill: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    platformText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    unreadBubble: {
      backgroundColor: colors.destructive,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 4,
    },
    unreadText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold" },
    fab: {
      position: "absolute",
      bottom: insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84) + 16,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.gold,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    emptyBtn: {
      backgroundColor: colors.navy,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 8,
    },
    emptyBtnText: {
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
  });

  function renderCard(p: Property) {
    const unread = p.leads.filter((l) => !l.read).length;
    const priceLocale = isAr ? "ar-SA" : "en-US";
    return (
      <Pressable
        key={p.id}
        style={({ pressed }) => [S.card, pressed && { opacity: 0.92 }]}
        onPress={() => router.push({ pathname: "/(tabs)/listings", params: { id: p.id } })}
      >
        <View style={S.cardTop}>
          <View style={S.propTypeBadge}>
            <Text style={S.propTypeText}>{(t.propertyTypes as Record<string, string>)[p.type] ?? p.type}</Text>
          </View>
          <View style={{ alignItems: isAr ? "flex-start" : "flex-end" }}>
            <Text style={S.propPrice}>{p.price.toLocaleString(priceLocale)}</Text>
            <Text style={S.propCurrency}>{t.dashboard.sar}</Text>
          </View>
        </View>
        <Text style={S.propAddress} numberOfLines={1}>
          {p.location.district ? `${p.location.district}، ` : ""}{p.location.city}
        </Text>
        <View style={S.statsRow}>
          <View style={S.statItem}>
            <MaterialIcons name="visibility" size={14} color={colors.mutedForeground} />
            <Text style={S.statText}>{totalViews(p).toLocaleString()}</Text>
          </View>
          <View style={S.statItem}>
            <MaterialIcons name="phone" size={14} color={colors.mutedForeground} />
            <Text style={S.statText}>{t.dashboard.leadsCount(totalLeads(p))}</Text>
            {unread > 0 && (
              <View style={S.unreadBubble}>
                <Text style={S.unreadText}>{unread}</Text>
              </View>
            )}
          </View>
          {p.area && (
            <View style={S.statItem}>
              <MaterialIcons name="square-foot" size={14} color={colors.mutedForeground} />
              <Text style={S.statText}>{p.area} {isAr ? "م²" : "m²"}</Text>
            </View>
          )}
        </View>
        <View style={S.platformRow}>
          {p.platforms.map((pl) => (
            <View
              key={pl.platform}
              style={[
                S.platformPill,
                { backgroundColor: pl.status === "published" ? PLATFORM_COLORS[pl.platform] : colors.muted },
              ]}
            >
              <View
                style={[
                  S.statusDot,
                  {
                    backgroundColor:
                      pl.status === "published" ? "#4ADE80"
                      : pl.status === "publishing" ? "#FCD34D"
                      : "#F87171",
                  },
                ]}
              />
              <Text
                style={[
                  S.platformText,
                  { color: pl.status === "published" ? "#FFFFFF" : colors.mutedForeground },
                ]}
              >
                {PLATFORM_LABELS[pl.platform as PlatformType]}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={S.container}>
      {/* ── Navy header + KPIs ── */}
      <View style={S.header}>
        <View style={S.headerTop}>
          <View>
            <Text style={S.greeting}>{t.dashboard.greeting}</Text>
            {config.branding.logoUrl ? (
              <Image
                source={{ uri: config.branding.logoUrl }}
                style={{ width: 120, height: 40, resizeMode: "contain" }}
                fadeDuration={0}
              />
            ) : (
              <Image
                source={require("@/assets/images/rkaz-logo.jpg")}
                style={{ width: 120, height: 40, resizeMode: "contain" }}
                fadeDuration={0}
              />
            )}
          </View>
          <Pressable style={S.notifBtn}>
            <MaterialIcons name="notifications-none" size={22} color="#FFFFFF" />
            {unreadLeadsCount > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeText}>{unreadLeadsCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={S.kpiRow}>
          <View style={S.kpi}>
            <View style={[S.kpiDot, { backgroundColor: "#4ADE80" }]} />
            <Text style={S.kpiValue}>{publishedCount}</Text>
            <Text style={S.kpiLabel}>{t.dashboard.published}</Text>
          </View>
          <View style={S.kpi}>
            <View style={[S.kpiDot, { backgroundColor: colors.gold }]} />
            <Text style={S.kpiValue}>{allViews.toLocaleString()}</Text>
            <Text style={S.kpiLabel}>{t.dashboard.views}</Text>
          </View>
          <View style={S.kpi}>
            <View style={[S.kpiDot, { backgroundColor: "#60A5FA" }]} />
            <Text style={S.kpiValue}>{allLeads}</Text>
            <Text style={S.kpiLabel}>{t.dashboard.leads}</Text>
          </View>
          {publishingCount > 0 && (
            <View style={S.kpi}>
              <View style={[S.kpiDot, { backgroundColor: "#FCD34D" }]} />
              <Text style={S.kpiValue}>{publishingCount}</Text>
              <Text style={S.kpiLabel}>{t.dashboard.publishing}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* ── AI Intelligence Report Card ── */}
        {properties.length > 0 && (
          <View style={S.reportSection}>
            <View style={S.reportCard}>
              {reportLoading ? (
                <View style={S.reportLoadingBox}>
                  <ActivityIndicator color={colors.navyLight} />
                  <Text style={S.reportLoadingText}>{t.assistant.reportLoading}</Text>
                </View>
              ) : report ? (
                <>
                  <View style={S.reportHeaderRow}>
                    <View style={S.reportTitleRow}>
                      <Text style={{ fontSize: 18 }}>✨</Text>
                      <Text style={S.reportTitle}>{t.assistant.reportTitle}</Text>
                    </View>
                    <View style={{ flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={[
                          S.scoreCircle,
                          {
                            borderColor: scoreColor(report.score),
                          },
                        ]}
                      >
                        <Text style={[S.scoreText, { color: scoreColor(report.score) }]}>
                          {report.score}
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [S.refreshBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => { void fetchReport(); }}
                        disabled={reportLoading}
                      >
                        <MaterialIcons name="refresh" size={14} color={colors.navyLight} />
                        <Text style={S.refreshBtnText}>{t.assistant.refreshReport}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={S.reportSummary}>{report.summary}</Text>

                  {report.insights.slice(0, 3).map((insight, i) => (
                    <View key={i} style={S.insightRow}>
                      <View style={S.insightDot} />
                      <Text style={S.insightText}>{insight}</Text>
                    </View>
                  ))}

                  {report.actions.length > 0 && (
                    <>
                      <Text style={S.actionsLabel}>{t.assistant.actions}</Text>
                      {report.actions.slice(0, 2).map((action, i) => (
                        <View key={i} style={S.actionPill}>
                          <Text style={S.actionText}>→ {action}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  <Pressable
                    style={({ pressed }) => [S.openAssistantRow, pressed && { opacity: 0.75 }]}
                    onPress={() => router.push("/(tabs)/ai-concierge")}
                  >
                    <Text style={{ fontSize: 14 }}>✨</Text>
                    <Text style={S.openAssistantText}>{t.assistant.viewAssistant}</Text>
                    <MaterialIcons
                      name={isAr ? "chevron-left" : "chevron-right"}
                      size={16}
                      color={colors.navy}
                    />
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Properties section ── */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>{t.dashboard.myProperties}</Text>
            <Pressable onPress={() => router.push("/(tabs)/listings")}>
              <Text style={S.seeAll}>{t.dashboard.seeAll}</Text>
            </Pressable>
          </View>
          {properties.length === 0 ? (
            <View style={S.emptyState}>
              <MaterialIcons name="home-work" size={48} color={colors.mutedForeground} />
              <Text style={S.emptyTitle}>{t.dashboard.emptyTitle}</Text>
              <Text style={S.emptySubtitle}>{t.dashboard.emptySubtitle}</Text>
              <Pressable style={S.emptyBtn} onPress={() => router.push("/(tabs)/add")}>
                <Text style={S.emptyBtnText}>{t.dashboard.addProperty}</Text>
              </Pressable>
            </View>
          ) : (
            properties.map(renderCard)
          )}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [S.fab, pressed && { transform: [{ scale: 0.94 }] }]}
        onPress={() => router.push("/(tabs)/add")}
      >
        <MaterialIcons name="add" size={30} color={colors.navy} />
      </Pressable>
    </View>
  );
}
