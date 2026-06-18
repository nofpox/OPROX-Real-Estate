import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import TourismMapWebView, { type TouristSpot } from "@/components/TourismMapWebView";

// ── Saudi tourist spots ──────────────────────────────────────────────────────
const SPOTS: TouristSpot[] = [
  { id:"t1",  type:"mosque",        nameAr:"المسجد الحرام",          city:"مكة المكرمة",   lat:21.4225, lng:39.8262, desc:"أقدس المساجد في الإسلام، يستقبل ملايين الحجاج سنوياً" },
  { id:"t2",  type:"mosque",        nameAr:"المسجد النبوي",          city:"المدينة المنورة",lat:24.4672, lng:39.6111, desc:"ثاني أقدس المساجد في الإسلام" },
  { id:"t3",  type:"mosque",        nameAr:"مسجد قباء",              city:"المدينة المنورة",lat:24.4399, lng:39.6170, desc:"أول مسجد بُني في الإسلام" },
  { id:"t4",  type:"heritage",      nameAr:"العُلا — مدائن صالح",   city:"العلا",          lat:26.7744, lng:37.9563, desc:"منحوتات صخرية عمرها أكثر من 2000 عام" },
  { id:"t5",  type:"heritage",      nameAr:"الدرعية — حي الطريف",   city:"الرياض",         lat:24.7386, lng:46.5736, desc:"مهد الدولة السعودية — تراث عالمي يونسكو" },
  { id:"t6",  type:"heritage",      nameAr:"حصن مسمك",               city:"الرياض",         lat:24.6877, lng:46.7136, desc:"رمز تاريخي لمعركة استرداد الرياض" },
  { id:"t7",  type:"nature",        nameAr:"وادي دسم",               city:"تبوك",           lat:28.2005, lng:36.9246, desc:"وادٍ بركاني مذهل بصخوره البازلتية السوداء" },
  { id:"t8",  type:"nature",        nameAr:"عيون الجواء",             city:"الأحساء",        lat:25.3566, lng:49.5866, desc:"ينابيع طبيعية دافئة وسط النخيل" },
  { id:"t9",  type:"nature",        nameAr:"شعيب الأحساء",           city:"الأحساء",        lat:25.2833, lng:49.6166, desc:"المنطقة الزراعية الأكبر في المملكة" },
  { id:"t10", type:"nature",        nameAr:"منتزه عسير الوطني",      city:"أبها",           lat:18.2166, lng:42.5250, desc:"جبال خضراء وضباب ومناظر خلابة" },
  { id:"t11", type:"nature",        nameAr:"جبال الطائف — الشفا",    city:"الطائف",         lat:21.2193, lng:40.3492, desc:"منتجع صيفي محاط بحقول الورد الطائفي" },
  { id:"t12", type:"entertainment", nameAr:"بوليفارد الرياض سيتي",   city:"الرياض",         lat:24.7721, lng:46.7385, desc:"أضخم وجهة ترفيهية في الرياض" },
  { id:"t13", type:"entertainment", nameAr:"كيان — جدة",             city:"جدة",            lat:21.5322, lng:39.1756, desc:"مول ترفيهي عملاق على البحر الأحمر" },
  { id:"t14", type:"entertainment", nameAr:"قرية موسم الرياض",       city:"الرياض",         lat:24.7742, lng:46.7402, desc:"فعاليات وعروض وثقافة طوال العام" },
  { id:"t15", type:"entertainment", nameAr:"نيوم — ذا لاين",         city:"تبوك",           lat:27.8350, lng:35.5500, desc:"مدينة المستقبل على خليج العقبة" },
  { id:"t16", type:"hotel",         nameAr:"كورنيش جدة",             city:"جدة",            lat:21.5169, lng:39.1287, desc:"كيلومترات من الواجهة البحرية والفنادق الراقية" },
  { id:"t17", type:"hotel",         nameAr:"البحر الأحمر — أملج",    city:"تبوك",           lat:25.1017, lng:37.2584, desc:"شعاب مرجانية خلابة وفنادق فاخرة" },
  { id:"t18", type:"hotel",         nameAr:"فندق ريتز كارلتون الرياض",city:"الرياض",         lat:24.6906, lng:46.6847, desc:"قصر فاخر بتصميم سعودي أصيل" },
];

type FilterType = "all" | TouristSpot["type"];

const FILTERS: { id: FilterType; labelAr: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; color: string }[] = [
  { id:"all",           labelAr:"الكل",    icon:"public",          color:"#94a3b8" },
  { id:"mosque",        labelAr:"مساجد",   icon:"mosque",          color:"#22c55e" },
  { id:"heritage",      labelAr:"تراث",    icon:"account-balance", color:"#f59e0b" },
  { id:"nature",        labelAr:"طبيعة",   icon:"nature",          color:"#06b6d4" },
  { id:"entertainment", labelAr:"ترفيه",   icon:"celebration",     color:"#8b5cf6" },
  { id:"hotel",         labelAr:"فنادق",   icon:"hotel",           color:"#3b82f6" },
];

const SPOT_TYPE_LABEL: Record<TouristSpot["type"], string> = {
  mosque:        "مسجد",
  heritage:      "تراث تاريخي",
  nature:        "طبيعة",
  entertainment: "ترفيه",
  hotel:         "فندق وسياحة",
};

const SPOT_COLOR: Record<TouristSpot["type"], string> = {
  mosque:        "#22c55e",
  heritage:      "#f59e0b",
  nature:        "#06b6d4",
  entertainment: "#8b5cf6",
  hotel:         "#3b82f6",
};

const BG   = "#0A0E1A";
const GOLD = "#C9A84C";

export default function TourismMapScreen() {
  const insets            = useSafeAreaInsets();
  const { clearAppMode }  = useApp();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [userCoords,   setUserCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading,   setLocLoading]   = useState(false);

  const filtered = useMemo(
    () => activeFilter === "all" ? SPOTS : SPOTS.filter((s) => s.type === activeFilter),
    [activeFilter],
  );

  const selectedSpot = useMemo(
    () => selectedId ? SPOTS.find((s) => s.id === selectedId) ?? null : null,
    [selectedId],
  );

  const handleBack = useCallback(() => {
    clearAppMode();
    router.replace("/mode-select" as never);
  }, [clearAppMode]);

  const handleFilter = useCallback((f: FilterType) => {
    void Haptics.selectionAsync();
    setActiveFilter(f);
    setSelectedId(null);
  }, []);

  const handleLocate = useCallback(async () => {
    if (locLoading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("الإذن مرفوض", "يرجى السماح بالوصول للموقع من الإعدادات.", [{ text: "حسناً" }]);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert("تعذّر تحديد الموقع", "");
    } finally {
      setLocLoading(false);
    }
  }, [locLoading]);

  const spotColor = selectedSpot ? SPOT_COLOR[selectedSpot.type] : GOLD;

  return (
    <View style={[s.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Leaflet map fills whole screen */}
      <TourismMapWebView
        spots={filtered}
        activeFilter={activeFilter}
        onSelect={(id) => { setSelectedId(id); void Haptics.selectionAsync(); }}
        onDeselect={() => setSelectedId(null)}
        centerCoords={userCoords ?? undefined}
      />

      {/* ── Top header overlay ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.headerBg} />
        <View style={s.headerRow}>
          <Pressable style={s.backBtn} onPress={handleBack} hitSlop={10}>
            <MaterialIcons name="chevron-right" size={22} color={GOLD} />
            <Text style={s.backText}>رجوع</Text>
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>السياحة في السعودية</Text>
            <Text style={s.headerSub}>اكتشف المعالم والوجهات</Text>
          </View>
          <Pressable
            style={s.loginBtn}
            onPress={() => { clearAppMode(); router.replace("/login" as never); }}
          >
            <Text style={s.loginText}>دخول</Text>
            <MaterialIcons name="person" size={14} color={BG} />
          </Pressable>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.filterScroll, { flexDirection: "row-reverse" }]}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            return (
              <Pressable
                key={f.id}
                style={[s.pill, active && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => handleFilter(f.id)}
              >
                <MaterialIcons
                  name={f.icon}
                  size={13}
                  color={active ? "#fff" : f.color}
                />
                <Text style={[s.pillText, active && { color: "#fff" }]}>{f.labelAr}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Locate me button ── */}
      <Pressable
        style={[s.locBtn, { bottom: insets.bottom + 16 }]}
        onPress={() => { void handleLocate(); }}
        hitSlop={8}
      >
        {locLoading
          ? <MaterialIcons name="sync"        size={20} color="#3b82f6" />
          : <MaterialIcons name="my-location" size={20} color={userCoords ? "#3b82f6" : "rgba(255,255,255,0.80)"} />}
      </Pressable>

      {/* ── Spot detail card ── */}
      {selectedSpot && (
        <View style={[s.card, { bottom: insets.bottom + 16, borderColor: spotColor }]}>
          <Pressable style={s.closeBtn} onPress={() => setSelectedId(null)} hitSlop={12}>
            <MaterialIcons name="close" size={17} color="#94a3b8" />
          </Pressable>

          <View style={[s.cardHeader, { flexDirection: "row-reverse" }]}>
            <View style={[s.typeChip, { backgroundColor: spotColor + "22" }]}>
              <Text style={[s.typeChipText, { color: spotColor }]}>
                {SPOT_TYPE_LABEL[selectedSpot.type]}
              </Text>
            </View>
            <Text style={s.cityText}>{selectedSpot.city}</Text>
          </View>

          <Text style={[s.spotName, { color: spotColor }]}>{selectedSpot.nameAr}</Text>
          <Text style={s.spotDesc}>{selectedSpot.desc}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    position: "absolute",
    top:      0,
    left:     0,
    right:    0,
    zIndex:   20,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,14,30,0.78)",
  },
  headerRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:            10,
    marginBottom:   10,
  },
  backBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               2,
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderRadius:      10,
    paddingHorizontal: 8,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.12)",
  },
  backText: {
    color:      GOLD,
    fontSize:   13,
    fontFamily: "Inter_600SemiBold",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    color:      "#fff",
    fontSize:   15,
    fontFamily: "Inter_700Bold",
    textAlign:  "center",
  },
  headerSub: {
    color:      "rgba(255,255,255,0.55)",
    fontSize:   11,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    marginTop:  2,
  },
  loginBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   GOLD,
    borderRadius:      10,
    paddingHorizontal: 10,
    paddingVertical:   6,
  },
  loginText: {
    color:      BG,
    fontSize:   12,
    fontFamily: "Inter_700Bold",
  },

  // ── Filter ───────────────────────────────────────────────────────────────────
  filterScroll: {
    gap:              6,
    paddingVertical:  2,
  },
  pill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   "rgba(8,14,30,0.80)",
    borderWidth:       1.5,
    borderColor:       "rgba(255,255,255,0.15)",
    borderRadius:      20,
    paddingHorizontal: 11,
    paddingVertical:   6,
  },
  pillText: {
    color:      "rgba(255,255,255,0.72)",
    fontSize:   12,
    fontFamily: "Inter_600SemiBold",
  },

  // ── Locate button ───────────────────────────────────────────────────────────
  locBtn: {
    position:        "absolute",
    left:            16,
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: "rgba(8,14,30,0.82)",
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.18)",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          15,
    ...Platform.select({
      android: { elevation: 6 },
      ios:     { shadowColor: "#000", shadowOpacity: 0.30, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      default: {},
    }),
  },

  // ── Detail card ──────────────────────────────────────────────────────────────
  card: {
    position:        "absolute",
    left:            14,
    right:           14,
    backgroundColor: "#0F2040",
    borderRadius:    18,
    padding:         18,
    borderWidth:     1.5,
    zIndex:          20,
    ...Platform.select({
      android: { elevation: 12 },
      ios:     { shadowColor: "#000", shadowOpacity: 0.50, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
      default: {},
    }),
  },
  closeBtn: {
    position:        "absolute",
    top:             12,
    left:            14,
    zIndex:          25,
    width:           28,
    height:          28,
    alignItems:      "center",
    justifyContent:  "center",
  },
  cardHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            8,
    marginBottom:   8,
  },
  typeChip: {
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  typeChipText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  cityText:     { fontSize: 11, fontFamily: "Inter_400Regular", color: "#94a3b8" },
  spotName: {
    fontSize:     17,
    fontFamily:   "Inter_700Bold",
    textAlign:    "right",
    marginBottom: 6,
  },
  spotDesc: {
    fontSize:   13,
    fontFamily: "Inter_400Regular",
    color:      "rgba(255,255,255,0.65)",
    textAlign:  "right",
    lineHeight: 20,
  },
});
