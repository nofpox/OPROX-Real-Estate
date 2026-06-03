import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
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
  const { properties, deleteProperty, markLeadRead } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    Alert.alert("حذف العقار", "هل تريد حذف هذا العقار من جميع المنصات؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          deleteProperty(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 16,
      paddingBottom: 16,
      paddingHorizontal: 20,
    },
    headerTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 14 },
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
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    cardLeft: { flex: 1, gap: 4 },
    propType: {
      alignSelf: "flex-start",
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginBottom: 4,
    },
    propTypeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    propTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    propLocation: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    propPrice: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    propPriceSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    moreBtn: { padding: 4 },
    platformSection: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
    platformRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    platDot: { width: 8, height: 8, borderRadius: 4 },
    platLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, flex: 1 },
    platStat: {
      flexDirection: "row",
      gap: 12,
    },
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
    leadsSection: { paddingHorizontal: 16, paddingBottom: 16 },
    leadsSectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 8 },
    leadCard: {
      flexDirection: "row",
      alignItems: "center",
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
    },
    leadAvatarText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 },
    leadName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 },
    leadPlatform: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive },
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
    expandBtn: { alignItems: "center", paddingVertical: 10, gap: 4, flexDirection: "row", justifyContent: "center" },
    expandText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.gold },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingBottom: 80,
    },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    addBtn: {
      backgroundColor: colors.navy,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    addBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  });

  function renderItem({ item: p }: { item: Property }) {
    const expanded = expandedId === p.id;
    const unreadLeads = p.leads.filter((l) => !l.read).length;

    return (
      <View style={styles.card}>
        <Pressable
          style={styles.cardHeader}
          onPress={() => setExpandedId(expanded ? null : p.id)}
        >
          <View style={styles.cardLeft}>
            <View style={styles.propType}>
              <Text style={styles.propTypeText}>{PROPERTY_TYPE_LABELS[p.type]}</Text>
            </View>
            {p.title && <Text style={styles.propTitle} numberOfLines={1}>{p.title}</Text>}
            <Text style={styles.propLocation} numberOfLines={1}>
              {p.location.district ? `${p.location.district}، ` : ""}{p.location.city}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.propPrice}>{p.price.toLocaleString("ar-SA")}</Text>
            <Text style={styles.propPriceSub}>ريال سعودي</Text>
          </View>
        </Pressable>

        {/* Platform summary (always visible) */}
        <View style={styles.platformSection}>
          {p.platforms.slice(0, expanded ? p.platforms.length : 2).map((pl) => (
            <View key={pl.platform} style={styles.platformRow}>
              <View style={[styles.platDot, { backgroundColor: PLATFORM_COLORS[pl.platform as PlatformType] }]} />
              <Text style={styles.platLabel}>{PLATFORM_LABELS[pl.platform as PlatformType]}</Text>
              <View style={styles.platStat}>
                {pl.status === "published" && (
                  <>
                    <View style={styles.platStatItem}>
                      <MaterialIcons name="visibility" size={12} color={colors.mutedForeground} />
                      <Text style={styles.platStatText}>{pl.views}</Text>
                    </View>
                    <View style={styles.platStatItem}>
                      <MaterialIcons name="phone" size={12} color={colors.mutedForeground} />
                      <Text style={styles.platStatText}>{pl.leads}</Text>
                    </View>
                  </>
                )}
                <Text
                  style={[
                    styles.platStatusText,
                    {
                      color: STATUS_COLORS[pl.status] ?? "#94A3B8",
                      backgroundColor: (STATUS_COLORS[pl.status] ?? "#94A3B8") + "20",
                    },
                  ]}
                >
                  {pl.status === "published" ? "نشط" : pl.status === "publishing" ? "جارٍ" : "فشل"}
                </Text>
              </View>
            </View>
          ))}

          {!expanded && p.platforms.length > 2 && (
            <Pressable style={styles.expandBtn} onPress={() => setExpandedId(p.id)}>
              <Text style={styles.expandText}>عرض جميع المنصات ({p.platforms.length})</Text>
              <MaterialIcons name="expand-more" size={16} color={colors.gold} />
            </Pressable>
          )}
        </View>

        {/* Leads section (expanded) */}
        {expanded && p.leads.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.leadsSection}>
              <Text style={styles.leadsSectionTitle}>
                العملاء المهتمون ({p.leads.length})
                {unreadLeads > 0 && ` • ${unreadLeads} جديد`}
              </Text>
              {p.leads.map((lead) => (
                <Pressable
                  key={lead.id}
                  style={styles.leadCard}
                  onPress={() => markLeadRead(p.id, lead.id)}
                >
                  <View style={styles.leadAvatar}>
                    <Text style={styles.leadAvatarText}>{lead.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadName}>{lead.name}</Text>
                    <Text style={styles.leadPlatform}>
                      {PLATFORM_LABELS[lead.platform as PlatformType]} • {lead.phone}
                    </Text>
                  </View>
                  {!lead.read && <View style={styles.unreadDot} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {expanded && (
          <>
            <View style={styles.divider} />
            <Pressable style={styles.deleteBtn} onPress={() => handleDelete(p.id)}>
              <MaterialIcons name="delete-outline" size={18} color={colors.destructive} />
              <Text style={styles.deleteBtnText}>حذف العقار</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>عقاراتي ({properties.length})</Text>
        <View style={styles.filterRow}>
          {(["all", "published", "publishing"] as Filter[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "all" ? "الكل" : f === "published" ? "نشط" : "جارٍ"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="home-work" size={52} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>لا توجد عقارات</Text>
          <Text style={styles.emptySubtitle}>أضف عقارك الأول وانشره على جميع المنصات</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push("/(tabs)/add")}>
            <Text style={styles.addBtnText}>إضافة عقار</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(p) => p.id}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filtered.length > 0}
        />
      )}
    </View>
  );
}
