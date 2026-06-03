import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  PROPERTY_TYPE_LABELS,
  Platform as PlatformType,
  Property,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

function totalViews(p: Property) {
  return p.platforms.reduce((a, x) => a + (x.views ?? 0), 0);
}

function totalLeads(p: Property) {
  return p.platforms.reduce((a, x) => a + (x.leads ?? 0), 0);
}

function unreadLeads(p: Property) {
  return p.leads.filter((l) => !l.read).length;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { properties, unreadLeadsCount } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const publishedCount = properties.filter((p) =>
    p.platforms.some((x) => x.status === "published")
  ).length;
  const allViews = properties.reduce((a, p) => a + totalViews(p), 0);
  const allLeads = properties.reduce((a, p) => a + totalLeads(p), 0);
  const publishingCount = properties.filter((p) =>
    p.platforms.some((x) => x.status === "publishing")
  ).length;

  async function onRefresh() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPadding + 16,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    greeting: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular" },
    appName: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 1 },
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
    kpiLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
    kpiDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginBottom: 8,
    },
    scroll: { flex: 1 },
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
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
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    propType: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    propTypeBadge: {
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    propTypeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    propPrice: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    propCurrency: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    propTitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, marginBottom: 4 },
    propAddress: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 12 },
    statsRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
    statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    statText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
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
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      gap: 12,
    },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    emptyBtn: {
      backgroundColor: colors.navy,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 8,
    },
    emptyBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });

  function renderCard(p: Property) {
    const unread = unreadLeads(p);
    return (
      <Pressable
        key={p.id}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        onPress={() => router.push({ pathname: "/(tabs)/listings", params: { id: p.id } })}
      >
        <View style={styles.cardTop}>
          <View>
            <View style={styles.propTypeBadge}>
              <Text style={styles.propTypeText}>{PROPERTY_TYPE_LABELS[p.type]}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.propPrice}>
              {p.price.toLocaleString("ar-SA")}
            </Text>
            <Text style={styles.propCurrency}>ريال سعودي</Text>
          </View>
        </View>

        {p.title && <Text style={styles.propTitle}>{p.title}</Text>}
        <Text style={styles.propAddress} numberOfLines={1}>
          {p.location.district ? `${p.location.district}، ` : ""}{p.location.city}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="visibility" size={14} color={colors.mutedForeground} />
            <Text style={styles.statText}>{totalViews(p).toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="phone" size={14} color={colors.mutedForeground} />
            <Text style={styles.statText}>{totalLeads(p)} عميل</Text>
            {unread > 0 && (
              <View style={styles.unreadBubble}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            )}
          </View>
          {p.area && (
            <View style={styles.statItem}>
              <MaterialIcons name="square-foot" size={14} color={colors.mutedForeground} />
              <Text style={styles.statText}>{p.area} م²</Text>
            </View>
          )}
        </View>

        <View style={styles.platformRow}>
          {p.platforms.map((pl) => (
            <View
              key={pl.platform}
              style={[
                styles.platformPill,
                { backgroundColor: pl.status === "published" ? PLATFORM_COLORS[pl.platform] : colors.muted },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      pl.status === "published"
                        ? "#4ADE80"
                        : pl.status === "publishing"
                        ? "#FCD34D"
                        : "#F87171",
                  },
                ]}
              />
              <Text
                style={[
                  styles.platformText,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>مرحباً</Text>
            <Text style={styles.appName}>RKZ</Text>
          </View>
          <Pressable style={styles.notifBtn}>
            <MaterialIcons name="notifications-none" size={22} color="#FFFFFF" />
            {unreadLeadsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadLeadsCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <View style={[styles.kpiDot, { backgroundColor: "#4ADE80" }]} />
            <Text style={styles.kpiValue}>{publishedCount}</Text>
            <Text style={styles.kpiLabel}>منشور</Text>
          </View>
          <View style={styles.kpi}>
            <View style={[styles.kpiDot, { backgroundColor: colors.gold }]} />
            <Text style={styles.kpiValue}>{allViews.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>مشاهدة</Text>
          </View>
          <View style={styles.kpi}>
            <View style={[styles.kpiDot, { backgroundColor: "#60A5FA" }]} />
            <Text style={styles.kpiValue}>{allLeads}</Text>
            <Text style={styles.kpiLabel}>عميل</Text>
          </View>
          {publishingCount > 0 && (
            <View style={styles.kpi}>
              <View style={[styles.kpiDot, { backgroundColor: "#FCD34D" }]} />
              <Text style={styles.kpiValue}>{publishingCount}</Text>
              <Text style={styles.kpiLabel}>جارٍ النشر</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>عقاراتي</Text>
            <Pressable onPress={() => router.push("/(tabs)/listings")}>
              <Text style={styles.seeAll}>عرض الكل</Text>
            </Pressable>
          </View>

          {properties.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="home-work" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>لا توجد عقارات بعد</Text>
              <Text style={styles.emptySubtitle}>أضف عقارك الأول وانشره على جميع المنصات في ثوانٍ</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/add")}>
                <Text style={styles.emptyBtnText}>إضافة عقار</Text>
              </Pressable>
            </View>
          ) : (
            properties.map(renderCard)
          )}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.94 }] }]}
        onPress={() => router.push("/(tabs)/add")}
      >
        <MaterialIcons name="add" size={30} color={colors.navy} />
      </Pressable>
    </View>
  );
}
