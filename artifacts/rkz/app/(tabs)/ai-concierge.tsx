import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ADMIN_EVENTS_KEY } from "@/hooks/useAIAssistant";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const NEGOTIATION_KEY = "rkz_negotiation_requests";

interface NegotiationRequest {
  id: string;
  type: string;
  city: string;
  price?: number;
  ts: string;
  status: "pending" | "in_progress" | "closed";
}

interface ServiceProvider {
  id: number;
  name: string;
  specialty: string;
  phone: string;
}

const STATIC_PROVIDERS: ServiceProvider[] = [
  { id: 1, name: "شركة الفارس للإنشاءات",    specialty: "إنشاء وتجديد وتشطيبات",   phone: "+966500011001" },
  { id: 2, name: "شركة المدينة للسباكة",      specialty: "سباكة وصرف صحي",          phone: "+966500022002" },
  { id: 3, name: "مؤسسة نور الكهرباء",       specialty: "كهرباء وأنظمة ذكية",       phone: "+966500033003" },
  { id: 4, name: "جرين سكيب للتشجير",       specialty: "تشجير وتجميل المباني",     phone: "+966500044004" },
  { id: 5, name: "مؤسسة النظافة المتكاملة",  specialty: "تنظيف عام وصيانة دورية",  phone: "+966500055005" },
  { id: 6, name: "شركة الديار للصيانة",      specialty: "صيانة عامة ومتكاملة",     phone: "+966500066006" },
];

const TYPE_LABELS: Record<string, string> = {
  villa: "فيلا", apartment: "شقة", land: "أرض", commercial: "تجاري",
  compound: "مجمع", floor: "دور", warehouse: "مستودع", farm: "مزرعة",
  rest_house: "استراحة", palace: "قصر",
};

type TabKey = "requests" | "services";

export default function MyRequestsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { isAr } = useLocale();

  const [activeTab,  setActiveTab]  = useState<TabKey>("requests");
  const [requests,   setRequests]   = useState<NegotiationRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const topPad    = insets.top    + (Platform.OS === "web" ? 67  : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34  : 100);

  const loadRequests = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NEGOTIATION_KEY);
      setRequests(raw ? (JSON.parse(raw) as NegotiationRequest[]) : []);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [loadRequests]);

  const requestService = useCallback(async (provider: ServiceProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const raw    = await AsyncStorage.getItem(ADMIN_EVENTS_KEY);
      const events = raw ? JSON.parse(raw) : [];
      events.push({
        id:          Date.now().toString(),
        type:        "partner_contact",
        description: `طلب خدمة من: ${provider.name} — ${provider.specialty}`,
        timestamp:   new Date().toISOString(),
      });
      await AsyncStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(events));
    } catch {}
    Alert.alert(
      isAr ? "تم إرسال الطلب" : "Request Sent",
      isAr
        ? "تم استلام طلبك، سيتم التواصل معك قريباً."
        : "Your request has been received. We will contact you shortly.",
    );
  }, [isAr]);

  const s = styles(colors, isAr, topPad, bottomPad);

  return (
    <View style={s.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{isAr ? "طلباتي" : "My Requests"}</Text>
        <Text style={s.headerSub}>
          {isAr ? "تابع طلباتك ودليل الخدمات" : "Track your requests & services"}
        </Text>
      </View>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {(["requests", "services"] as TabKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setActiveTab(key)}
            style={[s.tabItem, activeTab === key && s.tabItemActive]}
          >
            <MaterialIcons
              name={key === "requests" ? "assignment" : "build"}
              size={16}
              color={activeTab === key ? colors.gold : "#94A3B8"}
            />
            <Text style={[s.tabLabel, activeTab === key && s.tabLabelActive]}>
              {key === "requests"
                ? (isAr ? "طلبات التفاوض" : "Negotiations")
                : (isAr ? "دليل الخدمات" : "Services")}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Requests Tab ───────────────────────────────────────────────────── */}
      {activeTab === "requests" ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
          }
        >
          {requests.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconBox}>
                <MaterialIcons name="assignment" size={40} color={colors.gold} />
              </View>
              <Text style={s.emptyTitle}>
                {isAr ? "لا توجد طلبات بعد" : "No requests yet"}
              </Text>
              <Text style={s.emptySubtitle}>
                {isAr
                  ? "تصفح العقارات واضغط على «طلب تفاوض»"
                  : "Browse properties and tap «Request Negotiation»"}
              </Text>
            </View>
          ) : (
            <>
              <View style={s.confirmBanner}>
                <MaterialIcons name="check-circle" size={18} color="#10B981" />
                <Text style={[s.confirmText, isAr && { textAlign: "right" }]}>
                  {isAr
                    ? "تم استلام طلبك، سيتم التواصل معك قريباً."
                    : "Your requests have been received. We will contact you shortly."}
                </Text>
              </View>

              {[...requests].reverse().map((req) => (
                <View key={req.id} style={[s.requestCard, isAr && { flexDirection: "row-reverse" }]}>
                  <View style={s.reqIconBox}>
                    <MaterialIcons name="home-work" size={20} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={[s.reqType, isAr && { textAlign: "right" }]}>
                      {TYPE_LABELS[req.type] ?? req.type}
                      {req.city ? ` · ${req.city}` : ""}
                    </Text>
                    {req.price ? (
                      <Text style={[s.reqPrice, isAr && { textAlign: "right" }]}>
                        {req.price.toLocaleString()} {isAr ? "ريال" : "SAR"}
                      </Text>
                    ) : null}
                    <Text style={[s.reqDate, isAr && { textAlign: "right" }]}>
                      {new Date(req.ts).toLocaleDateString(isAr ? "ar-SA" : "en-GB")}
                    </Text>
                  </View>
                  <View style={s.statusChip}>
                    <Text style={s.statusText}>{isAr ? "قيد المراجعة" : "Pending"}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        /* ── Services Tab ──────────────────────────────────────────────────── */
        <FlatList
          data={STATIC_PROVIDERS}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.divider} />}
          renderItem={({ item }) => (
            <View style={[s.providerCard, isAr && { flexDirection: "row-reverse" }]}>
              <View style={s.provIconBox}>
                <MaterialIcons name="build" size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[s.provName, isAr && { textAlign: "right" }]}>{item.name}</Text>
                <Text style={[s.provSpec, isAr && { textAlign: "right" }]}>{item.specialty}</Text>
              </View>
              <Pressable
                onPress={() => void requestService(item)}
                style={({ pressed }) => [s.reqBtn, pressed && { opacity: 0.75 }]}
              >
                <MaterialIcons name="send" size={15} color="#0A1628" />
                <Text style={s.reqBtnText}>{isAr ? "طلب" : "Request"}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function styles(
  colors: ReturnType<typeof useColors>,
  isAr: boolean,
  topPad: number,
  bottomPad: number,
) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: colors.background },

    header: {
      backgroundColor: colors.navy,
      paddingTop:      topPad + 16,
      paddingBottom:   20,
      paddingHorizontal: 20,
    },
    headerTitle: {
      color:      "#FFFFFF",
      fontSize:   24,
      fontFamily: "Inter_700Bold",
      textAlign:  isAr ? "right" : "left",
    },
    headerSub: {
      color:      "rgba(255,255,255,0.5)",
      fontSize:   13,
      fontFamily: "Inter_400Regular",
      marginTop:  4,
      textAlign:  isAr ? "right" : "left",
    },

    tabBar: {
      flexDirection:     isAr ? "row-reverse" : "row",
      backgroundColor:   colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabItem: {
      flex:           1,
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "center",
      gap:            6,
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabItemActive: { borderBottomColor: colors.gold },
    tabLabel:      { fontSize: 13, fontFamily: "Inter_500Medium", color: "#94A3B8" },
    tabLabelActive:{ color: colors.gold, fontFamily: "Inter_700Bold" },

    scrollContent: { padding: 16, paddingBottom: bottomPad },

    emptyState: {
      alignItems:  "center",
      paddingTop:  60,
      paddingBottom: 40,
      gap:         12,
    },
    emptyIconBox: {
      width:  80,
      height: 80,
      borderRadius: 20,
      backgroundColor: colors.gold + "18",
      alignItems:     "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize:   18,
      fontFamily: "Inter_700Bold",
      color:      colors.foreground,
      textAlign:  "center",
    },
    emptySubtitle: {
      fontSize:   14,
      fontFamily: "Inter_400Regular",
      color:      "#64748B",
      textAlign:  "center",
      paddingHorizontal: 32,
      lineHeight: 20,
    },

    confirmBanner: {
      flexDirection:  isAr ? "row-reverse" : "row",
      alignItems:     "center",
      gap:            10,
      backgroundColor: "#ECFDF5",
      borderRadius:   12,
      padding:        14,
      marginBottom:   16,
    },
    confirmText: {
      flex:       1,
      fontSize:   14,
      fontFamily: "Inter_500Medium",
      color:      "#065F46",
      lineHeight: 20,
    },

    requestCard: {
      flexDirection:   "row",
      alignItems:      "center",
      backgroundColor: colors.card,
      borderRadius:    14,
      padding:         14,
      marginBottom:    10,
      shadowColor:     "#000",
      shadowOpacity:   0.04,
      shadowRadius:    6,
      elevation:       1,
    },
    reqIconBox: {
      width:  40,
      height: 40,
      borderRadius:    10,
      backgroundColor: colors.gold + "18",
      alignItems:      "center",
      justifyContent:  "center",
    },
    reqType:  { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    reqPrice: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.gold, marginTop: 2 },
    reqDate:  { fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 2 },

    statusChip: {
      backgroundColor: "#FEF3C7",
      paddingHorizontal: 10,
      paddingVertical:   4,
      borderRadius:      20,
    },
    statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#92400E" },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

    providerCard: {
      flexDirection:   "row",
      alignItems:      "center",
      backgroundColor: colors.card,
      borderRadius:    14,
      padding:         14,
      marginBottom:    10,
      shadowColor:     "#000",
      shadowOpacity:   0.04,
      shadowRadius:    6,
      elevation:       1,
    },
    provIconBox: {
      width:  42,
      height: 42,
      borderRadius:    11,
      backgroundColor: colors.gold + "18",
      alignItems:      "center",
      justifyContent:  "center",
    },
    provName: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    provSpec: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 3 },

    reqBtn: {
      flexDirection:   "row",
      alignItems:      "center",
      gap:             5,
      backgroundColor: colors.gold,
      paddingHorizontal: 12,
      paddingVertical:   8,
      borderRadius:    10,
    },
    reqBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A1628" },
  });
}
