import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
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
// Coordinates verified via OpenStreetMap Nominatim geocoding
const SPOTS: TouristSpot[] = [
  // ── مساجد
  { id:"t1",  type:"mosque",      nameAr:"المسجد الحرام",            city:"مكة المكرمة",    lat:21.4246, lng:39.8249, desc:"أقدس المساجد في الإسلام، يستقبل ملايين الحجاج سنوياً" },
  { id:"t2",  type:"mosque",      nameAr:"المسجد النبوي",            city:"المدينة المنورة", lat:24.4687, lng:39.6112, desc:"ثاني أقدس المساجد في الإسلام" },
  { id:"t3",  type:"mosque",      nameAr:"مسجد قباء",                city:"المدينة المنورة", lat:24.4394, lng:39.6175, desc:"أول مسجد بُني في الإسلام" },
  // ── تراث
  { id:"t4",  type:"heritage",    nameAr:"العُلا — مدائن صالح",     city:"العلا",           lat:26.8047, lng:37.9493, desc:"منحوتات صخرية عمرها أكثر من 2000 عام — تراث يونسكو" },
  { id:"t5",  type:"heritage",    nameAr:"الدرعية — حي الطريف",     city:"الرياض",          lat:24.7347, lng:46.5780, desc:"مهد الدولة السعودية — تراث عالمي يونسكو" },
  { id:"t6",  type:"heritage",    nameAr:"قلعة المصمك",              city:"الرياض",          lat:24.6312, lng:46.7133, desc:"رمز تاريخي لمعركة استرداد الرياض عام 1902" },
  // ── طبيعة
  { id:"t7",  type:"nature",      nameAr:"وادي دسم",                 city:"تبوك",            lat:27.6328, lng:36.5282, desc:"وادٍ بركاني مذهل بصخوره ونقوشه النبطية" },
  { id:"t8",  type:"nature",      nameAr:"عيون الجواء",               city:"الأحساء",         lat:25.3566, lng:49.5866, desc:"ينابيع طبيعية دافئة وسط النخيل" },
  { id:"t9",  type:"nature",      nameAr:"واحة الأحساء",              city:"الأحساء",         lat:25.3333, lng:49.6333, desc:"أكبر واحة نخيل في العالم — تراث يونسكو" },
  { id:"t10", type:"nature",      nameAr:"منتزه عسير الوطني",        city:"أبها",            lat:18.2164, lng:42.5044, desc:"جبال خضراء وضباب ومناظر خلابة" },
  { id:"t11", type:"nature",      nameAr:"جبال الطائف — الشفا",      city:"الطائف",          lat:21.0694, lng:40.3119, desc:"منتجع صيفي محاط بحقول الورد الطائفي" },
  // ── ترفيه
  { id:"t12", type:"entertainment", nameAr:"بوليفارد الرياض سيتي",   city:"الرياض",          lat:24.7684, lng:46.6045, desc:"أضخم وجهة ترفيهية في الرياض" },
  { id:"t14", type:"entertainment", nameAr:"إستاد الملك فهد الدولي", city:"الرياض",          lat:24.7886, lng:46.8391, desc:"أحد أكبر الملاعب في العالم ويستضيف كبرى الفعاليات" },
  { id:"t15", type:"entertainment", nameAr:"نيوم — ذا لاين",         city:"تبوك",            lat:28.0059, lng:35.2027, desc:"مدينة المستقبل على خليج العقبة" },
  // ── فنادق
  { id:"t16", type:"hotel",      nameAr:"كورنيش جدة",                city:"جدة",             lat:21.6335, lng:39.1042, desc:"كيلومترات من الواجهة البحرية والفنادق الراقية" },
  { id:"t17", type:"hotel",      nameAr:"البحر الأحمر — أملج",       city:"تبوك",            lat:25.2340, lng:37.4983, desc:"شعاب مرجانية خلابة وفنادق فاخرة" },
  { id:"t18", type:"hotel",      nameAr:"ريتز كارلتون — حي السفارات", city:"الرياض",         lat:24.6771, lng:46.6251, desc:"قصر فاخر في حي السفارات بتصميم سعودي أصيل" },
  // ── مطاعم
  { id:"r1",  type:"restaurant", nameAr:"قرية نجد",                  city:"الرياض",          lat:24.6912, lng:46.6726, desc:"مطعم سعودي أصيل بأجواء تراثية وطعام شعبي" },
  { id:"r2",  type:"restaurant", nameAr:"الرومانسية",                 city:"الرياض",          lat:24.6958, lng:46.7924, desc:"سلسلة مطاعم شهيرة تقدّم المأكولات الشرقية والغربية" },
  { id:"r3",  type:"restaurant", nameAr:"البيك",                      city:"جدة",             lat:21.4858, lng:39.2135, desc:"أشهر مطعم دجاج في المملكة — موروث جداوي أصيل" },
  { id:"r4",  type:"restaurant", nameAr:"كودو",                       city:"الرياض",          lat:24.5615, lng:46.7079, desc:"سلسلة وجبات سريعة سعودية بطابع محلي مميّز" },
  { id:"r5",  type:"restaurant", nameAr:"هرفي",                       city:"الرياض",          lat:24.7310, lng:46.7625, desc:"برغر وجبات سريعة سعودية منذ عقود" },
  // ── كافيهات
  { id:"c1",  type:"cafe",       nameAr:"ستاربكس — شارع الأمير محمد", city:"جدة",            lat:21.5498, lng:39.1475, desc:"أشهر كافيه عالمي على أكثر شوارع جدة حيوية" },
  { id:"c2",  type:"cafe",       nameAr:"باتيل — الدرعية",            city:"الرياض",          lat:24.7343, lng:46.5745, desc:"كافيه فاخر بجوار حي التراث — تمر وشوكولاتة وقهوة" },
  { id:"c3",  type:"cafe",       nameAr:"كافيهات شارع التحلية",       city:"الرياض",          lat:24.6941, lng:46.6921, desc:"تجمّع الكافيهات الأشهر في الرياض على طول الشارع" },
  // ── مولات
  { id:"m1",  type:"mall",       nameAr:"مول العرب",                  city:"جدة",             lat:21.6327, lng:39.1561, desc:"من أكبر مراكز التسوق في السعودية وبه حديقة مائية" },
  { id:"m2",  type:"mall",       nameAr:"برج المملكة",                city:"الرياض",          lat:24.7119, lng:46.6745, desc:"معلم الرياض الأشهر — ناطحة سحاب ومركز تسوق فاخر" },
  { id:"m3",  type:"mall",       nameAr:"الرياض جاليري",              city:"الرياض",          lat:24.7430, lng:46.6586, desc:"مركز تسوق راقٍ بتصميم عصري وعلامات عالمية" },
  { id:"m4",  type:"mall",       nameAr:"النخيل مول",                 city:"الرياض",          lat:24.7668, lng:46.7158, desc:"تسوق وترفيه وسينما في شمال الرياض" },
  { id:"m5",  type:"mall",       nameAr:"صحارى مول",                  city:"الرياض",          lat:24.7389, lng:46.6827, desc:"أحد أوائل مراكز التسوق الكبرى في الرياض" },
  { id:"m6",  type:"mall",       nameAr:"العثيم مول",                 city:"الرياض",          lat:24.6857, lng:46.7749, desc:"سلسلة مولات منتشرة بأسعار تنافسية ومتاجر متنوعة" },
  { id:"m7",  type:"mall",       nameAr:"مكة مول",                    city:"مكة المكرمة",     lat:21.3909, lng:39.8846, desc:"مركز تسوق كبير على مقربة من المسجد الحرام" },
  // ── شقق مفروشة
  { id:"a1",  type:"apartment",  nameAr:"موفنبيك ريزيدنس",            city:"الرياض",          lat:24.7640, lng:46.6531, desc:"شقق فندقية فاخرة في قلب الرياض بخدمات 5 نجوم" },
  { id:"a2",  type:"apartment",  nameAr:"شازا ريزيدنس",               city:"الرياض",          lat:24.7164, lng:46.6699, desc:"شقق مفروشة فاخرة بتصميم سعودي معاصر" },
  { id:"a3",  type:"apartment",  nameAr:"شقق الحمراء",                 city:"جدة",             lat:21.5450, lng:39.1660, desc:"إقامة مريحة في أرقى أحياء جدة قرب البحر الأحمر" },
];

type FilterType = "all" | TouristSpot["type"];

const FILTERS: { id: FilterType; labelAr: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; color: string }[] = [
  { id:"all",           labelAr:"الكل",       icon:"public",          color:"#94a3b8" },
  { id:"mosque",        labelAr:"مساجد",      icon:"mosque",          color:"#22c55e" },
  { id:"heritage",      labelAr:"تراث",       icon:"account-balance", color:"#f59e0b" },
  { id:"nature",        labelAr:"طبيعة",      icon:"nature",          color:"#06b6d4" },
  { id:"entertainment", labelAr:"ترفيه",      icon:"celebration",     color:"#8b5cf6" },
  { id:"hotel",         labelAr:"فنادق",      icon:"hotel",           color:"#3b82f6" },
  { id:"restaurant",    labelAr:"مطاعم",      icon:"restaurant",      color:"#f97316" },
  { id:"cafe",          labelAr:"كافيهات",    icon:"local-cafe",      color:"#ec4899" },
  { id:"mall",          labelAr:"مولات",      icon:"local-mall",      color:"#6366f1" },
  { id:"apartment",     labelAr:"شقق مفروشة", icon:"apartment",       color:"#14b8a6" },
];

const SPOT_TYPE_LABEL: Record<TouristSpot["type"], string> = {
  mosque:        "مسجد",
  heritage:      "تراث تاريخي",
  nature:        "طبيعة",
  entertainment: "ترفيه",
  hotel:         "فندق",
  restaurant:    "مطعم",
  cafe:          "كافيه",
  mall:          "مول",
  apartment:     "شقق مفروشة",
};

const SPOT_COLOR: Record<TouristSpot["type"], string> = {
  mosque:        "#22c55e",
  heritage:      "#f59e0b",
  nature:        "#06b6d4",
  entertainment: "#8b5cf6",
  hotel:         "#3b82f6",
  restaurant:    "#f97316",
  cafe:          "#ec4899",
  mall:          "#6366f1",
  apartment:     "#14b8a6",
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

  const handleNavigate = useCallback((spot: TouristSpot) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const label = encodeURIComponent(spot.nameAr);
    const url = Platform.select({
      ios:     `maps://maps.apple.com/?daddr=${spot.lat},${spot.lng}&dirflg=d`,
      android: `google.navigation:q=${spot.lat},${spot.lng}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&destination_place_name=${label}`,
    }) as string;
    Linking.canOpenURL(url).then((can) => {
      if (can) {
        void Linking.openURL(url);
      } else {
        const web = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&destination_place_name=${label}`;
        void Linking.openURL(web);
      }
    }).catch(() => {
      const web = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&destination_place_name=${label}`;
      void Linking.openURL(web);
    });
  }, []);

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

          <Pressable
            style={({ pressed }) => [s.navBtn, { backgroundColor: spotColor, opacity: pressed ? 0.82 : 1 }]}
            onPress={() => handleNavigate(selectedSpot)}
          >
            <MaterialIcons name="navigation" size={16} color="#fff" />
            <Text style={s.navBtnText}>افتح في الخريطة</Text>
          </Pressable>
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
    marginBottom: 12,
  },
  navBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               6,
    borderRadius:      12,
    paddingVertical:   11,
    paddingHorizontal: 16,
  },
  navBtnText: {
    color:      "#fff",
    fontSize:   14,
    fontFamily: "Inter_700Bold",
  },
});
