import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";

// ── Screen & canvas ───────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const MAP_W = SW;
const MAP_H = SH;

// ── Geographic bounds (Riyadh) ───────────────────────────────────────────────
const CENTER = { lat: 24.748, lng: 46.672 };
const SPAN   = { lat: 0.230, lng: 0.290 };

function toXY(lat: number, lng: number) {
  return {
    x: ((lng - CENTER.lng) / SPAN.lng + 0.5) * MAP_W,
    y: ((CENTER.lat - lat) / SPAN.lat + 0.5) * MAP_H,
  };
}

// ── Zoom config ───────────────────────────────────────────────────────────────
const MIN_ZOOM      = 0.8;
const MAX_ZOOM      = 4.0;
const DETAIL_THRESH = 1.55;
const ZOOM_STEP     = 1.55;

// ── Types ─────────────────────────────────────────────────────────────────────
type PaymentFilter = "all" | "mortgage" | "cash";

interface MapProp {
  id: string;
  titleAr: string;
  districtAr: string;
  lat: number;
  lng: number;
  price: number;
  type: "villa" | "apartment" | "land" | "commercial";
  paymentPref: "mortgage" | "cash" | "both";
  area: number;
  isOwned: boolean;
}

// ── Riyadh market properties ──────────────────────────────────────────────────
const MOCK_MARKET: MapProp[] = [
  { id:"m1",  titleAr:"فيلا النرجس",           districtAr:"النرجس",       lat:24.836, lng:46.641, price:1_950_000, type:"villa",      paymentPref:"mortgage", area:420, isOwned:false },
  { id:"m2",  titleAr:"شقة الملقا",             districtAr:"الملقا",       lat:24.778, lng:46.659, price:780_000,   type:"apartment",  paymentPref:"cash",     area:180, isOwned:false },
  { id:"m3",  titleAr:"فيلا العليا",            districtAr:"العليا",       lat:24.694, lng:46.682, price:2_200_000, type:"villa",      paymentPref:"mortgage", area:560, isOwned:false },
  { id:"m4",  titleAr:"أرض حطين",              districtAr:"حطين",         lat:24.817, lng:46.616, price:1_100_000, type:"land",       paymentPref:"cash",     area:900, isOwned:false },
  { id:"m5",  titleAr:"شقة الوروود",            districtAr:"الوروود",      lat:24.754, lng:46.649, price:650_000,   type:"apartment",  paymentPref:"both",     area:160, isOwned:false },
  { id:"m6",  titleAr:"فيلا الحمراء",           districtAr:"الحمراء",      lat:24.743, lng:46.616, price:1_450_000, type:"villa",      paymentPref:"mortgage", area:380, isOwned:false },
  { id:"m7",  titleAr:"تجاري العليا",           districtAr:"العليا",       lat:24.701, lng:46.697, price:3_500_000, type:"commercial", paymentPref:"cash",     area:800, isOwned:false },
  { id:"m8",  titleAr:"شقة السليمانية",         districtAr:"السليمانية",   lat:24.710, lng:46.710, price:920_000,   type:"apartment",  paymentPref:"mortgage", area:210, isOwned:false },
  { id:"m9",  titleAr:"فيلا الربوة",            districtAr:"الربوة",       lat:24.762, lng:46.638, price:1_750_000, type:"villa",      paymentPref:"both",     area:480, isOwned:false },
  { id:"m10", titleAr:"أرض الصحافة",            districtAr:"الصحافة",      lat:24.792, lng:46.686, price:880_000,   type:"land",       paymentPref:"cash",     area:700, isOwned:false },
  { id:"m11", titleAr:"شقة اليرموك",            districtAr:"اليرموك",      lat:24.672, lng:46.713, price:520_000,   type:"apartment",  paymentPref:"mortgage", area:140, isOwned:false },
  { id:"m12", titleAr:"فيلا الدبلوماسي",        districtAr:"الدبلوماسي",   lat:24.657, lng:46.641, price:2_650_000, type:"villa",      paymentPref:"both",     area:650, isOwned:false },
  { id:"m13", titleAr:"شقة الروضة",             districtAr:"الروضة",       lat:24.726, lng:46.725, price:710_000,   type:"apartment",  paymentPref:"cash",     area:190, isOwned:false },
  { id:"m14", titleAr:"أرض القادسية",           districtAr:"القادسية",     lat:24.740, lng:46.748, price:1_200_000, type:"land",       paymentPref:"mortgage", area:1200,isOwned:false },
  { id:"m15", titleAr:"فيلا النخيل",            districtAr:"النخيل",       lat:24.809, lng:46.699, price:2_100_000, type:"villa",      paymentPref:"both",     area:500, isOwned:false },
  { id:"m16", titleAr:"شقة الياسمين",           districtAr:"الياسمين",     lat:24.856, lng:46.657, price:590_000,   type:"apartment",  paymentPref:"cash",     area:155, isOwned:false },
  { id:"m17", titleAr:"تجاري طريق الملك فهد",   districtAr:"العليا",       lat:24.709, lng:46.673, price:4_200_000, type:"commercial", paymentPref:"cash",     area:1100,isOwned:false },
  { id:"m18", titleAr:"فيلا المربع",            districtAr:"المربع",       lat:24.681, lng:46.698, price:1_800_000, type:"villa",      paymentPref:"mortgage", area:440, isOwned:false },
  { id:"m19", titleAr:"شقة الفلاح",             districtAr:"الفلاح",       lat:24.773, lng:46.706, price:430_000,   type:"apartment",  paymentPref:"mortgage", area:120, isOwned:false },
  { id:"m20", titleAr:"أرض الشفا",              districtAr:"الشفا",        lat:24.653, lng:46.693, price:960_000,   type:"land",       paymentPref:"both",     area:800, isOwned:false },
];

// ── Heatmap demand zones ──────────────────────────────────────────────────────
const DEMAND_ZONES = [
  { lat:24.836, lng:46.645, intensity:0.85, rLng:0.040, labelAr:"النرجس"      },
  { lat:24.782, lng:46.665, intensity:0.70, rLng:0.032, labelAr:"الملقا"      },
  { lat:24.697, lng:46.688, intensity:1.00, rLng:0.048, labelAr:"العليا"      },
  { lat:24.755, lng:46.638, intensity:0.60, rLng:0.036, labelAr:"حطين"        },
  { lat:24.715, lng:46.720, intensity:0.55, rLng:0.028, labelAr:"السليمانية"  },
  { lat:24.812, lng:46.698, intensity:0.75, rLng:0.036, labelAr:"النخيل"      },
  { lat:24.657, lng:46.641, intensity:0.45, rLng:0.032, labelAr:"الدبلوماسي"  },
];

// ── Road network ──────────────────────────────────────────────────────────────
const ROADS = [
  { lat1:24.87, lng1:46.672, lat2:24.63, lng2:46.672, w:3.5, c:"#1E3A6A" },
  { lat1:24.87, lng1:46.638, lat2:24.63, lng2:46.638, w:2.0, c:"#172E58" },
  { lat1:24.740, lng1:46.54, lat2:24.740, lng2:46.82, w:3.0, c:"#1E3A6A" },
  { lat1:24.812, lng1:46.55, lat2:24.812, lng2:46.78, w:2.0, c:"#172E58" },
  { lat1:24.680, lng1:46.54, lat2:24.680, lng2:46.82, w:2.5, c:"#172E58" },
  { lat1:24.87,  lng1:46.748, lat2:24.63, lng2:46.748, w:1.5, c:"#112244" },
  { lat1:24.856, lng1:46.58, lat2:24.856, lng2:46.76, w:1.5, c:"#112244" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function typeIcon(t: MapProp["type"]): React.ComponentProps<typeof MaterialIcons>["name"] {
  return t === "villa" ? "home" : t === "apartment" ? "apartment" : t === "land" ? "landscape" : "store";
}

function paymentLabel(pref: MapProp["paymentPref"], isAr: boolean): string {
  if (pref === "mortgage") return isAr ? "تمويل" : "Finance";
  if (pref === "cash")     return isAr ? "كاش"   : "Cash";
  return isAr ? "كاش/تمويل" : "Both";
}

// ══════════════════════════════════════════════════════════════════════════════
// SVG Background — roads + grid + heatmap
// ══════════════════════════════════════════════════════════════════════════════
function MapBackground({ showHeat }: { showHeat: boolean }) {
  const G_COLS = 14;
  const G_ROWS = 18;
  return (
    <Svg
      width={MAP_W}
      height={MAP_H}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        {DEMAND_ZONES.map((z, i) => {
          const { x, y } = toXY(z.lat, z.lng);
          const r = (z.rLng / SPAN.lng) * MAP_W;
          return (
            <RadialGradient key={i} id={`h${i}`} cx={x} cy={y} r={r} gradientUnits="userSpaceOnUse">
              <Stop offset="0"   stopColor="#C9A84C" stopOpacity={z.intensity * 0.58} />
              <Stop offset="0.45" stopColor="#E55B1A" stopOpacity={z.intensity * 0.30} />
              <Stop offset="1"   stopColor="#0A0E1A" stopOpacity={0} />
            </RadialGradient>
          );
        })}
      </Defs>

      {/* Background */}
      <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#090D18" />

      {/* Grid */}
      {Array.from({ length: G_COLS + 1 }).map((_, i) => (
        <Line key={`vc${i}`} x1={i * MAP_W / G_COLS} y1={0} x2={i * MAP_W / G_COLS} y2={MAP_H}
          stroke="#101828" strokeWidth={0.7} />
      ))}
      {Array.from({ length: G_ROWS + 1 }).map((_, i) => (
        <Line key={`hr${i}`} x1={0} y1={i * MAP_H / G_ROWS} x2={MAP_W} y2={i * MAP_H / G_ROWS}
          stroke="#101828" strokeWidth={0.7} />
      ))}

      {/* Roads */}
      {ROADS.map((r, i) => {
        const p1 = toXY(r.lat1, r.lng1);
        const p2 = toXY(r.lat2, r.lng2);
        return <Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={r.c} strokeWidth={r.w} strokeLinecap="round" />;
      })}

      {/* Heatmap blobs */}
      {showHeat && DEMAND_ZONES.map((z, i) => {
        const { x, y } = toXY(z.lat, z.lng);
        const r = (z.rLng / SPAN.lng) * MAP_W;
        return (
          <Circle key={i} cx={x} cy={y} r={r * 1.3} fill={`url(#h${i})`} />
        );
      })}

      {/* District labels (overview only) */}
      {showHeat && DEMAND_ZONES.map((z, i) => {
        const { x, y } = toXY(z.lat, z.lng);
        const alpha = (0.55 + z.intensity * 0.45).toFixed(2);
        return (
          <SvgText key={i} x={x} y={y + 4}
            fontSize={11} fill={`rgba(201,168,76,${alpha})`}
            textAnchor="middle" fontWeight="bold"
          >
            {z.labelAr}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Property Marker (detail zoom)
// ══════════════════════════════════════════════════════════════════════════════
const TW = 68, TH = 26;
function PropertyMarker({ prop, isSelected, onPress }: {
  prop: MapProp; isSelected: boolean; onPress: () => void;
}) {
  const { x, y } = toXY(prop.lat, prop.lng);
  const isOwned = prop.isOwned;
  const bg     = isSelected ? "#C9A84C" : isOwned ? "#0D1A2E" : "#0C1829";
  const border = isOwned ? "#C9A84C" : "#1E3A6A";
  const txt    = isSelected ? "#0A0E1A" : isOwned ? "#C9A84C" : "#A8C4E0";
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tile,
        {
          left: x - TW / 2, top: y - TH / 2,
          width: TW, height: TH,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: isOwned || isSelected ? 1.5 : 1,
          shadowColor: isSelected ? "#C9A84C" : isOwned ? "#C9A84C" : "#000",
          shadowOpacity: isSelected ? 0.7 : isOwned ? 0.4 : 0.2,
          shadowRadius: isSelected ? 10 : 5,
          elevation: isSelected ? 10 : 3,
          transform: [{ scale: isSelected ? 1.15 : 1 }],
        },
      ]}
    >
      <Text style={[styles.tileText, { color: txt }]} numberOfLines={1}>
        {fmtPrice(prop.price)}
      </Text>
      {isOwned && <View style={styles.ownedDot} />}
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Cluster dot (overview zoom)
// ══════════════════════════════════════════════════════════════════════════════
function ClusterDot({ prop, isSelected, onPress }: {
  prop: MapProp; isSelected: boolean; onPress: () => void;
}) {
  const { x, y } = toXY(prop.lat, prop.lng);
  const size = prop.isOwned ? 13 : 10;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dot,
        {
          left: x - size / 2, top: y - size / 2,
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: prop.isOwned ? "#C9A84C" : "#1E4A82",
          borderColor: prop.isOwned ? "#FFE08A" : "#3A6AB0",
          borderWidth: prop.isOwned ? 1.5 : 1,
          shadowColor: prop.isOwned ? "#C9A84C" : "transparent",
          shadowOpacity: 0.7, shadowRadius: 5, elevation: prop.isOwned ? 5 : 1,
          transform: [{ scale: isSelected ? 1.6 : 1 }],
        },
      ]}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Preview Pane
// ══════════════════════════════════════════════════════════════════════════════
function PreviewPane({ prop, isAr, onClose }: {
  prop: MapProp; isAr: boolean; onClose: () => void;
}) {
  const slide = useRef(new Animated.Value(260)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }).start();
  }, [prop.id]);

  const pay = prop.paymentPref === "mortgage"
    ? { bg: "#18382A", txt: "#4ADE80" }
    : prop.paymentPref === "cash"
    ? { bg: "#38181A", txt: "#F87171" }
    : { bg: "#2A2E18", txt: "#FCD34D" };

  return (
    <Animated.View style={[styles.preview, { transform: [{ translateY: slide }] }]}>
      <View style={styles.previewHandle} />
      <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
        <MaterialIcons name="close" size={17} color="rgba(255,255,255,0.45)" />
      </Pressable>

      {/* Title */}
      <View style={[styles.previewRow, { flexDirection: isAr ? "row-reverse" : "row", marginBottom: 14 }]}>
        <View style={styles.previewIcon}>
          <MaterialIcons name={typeIcon(prop.type)} size={22} color="#C9A84C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.previewTitle, { textAlign: isAr ? "right" : "left" }]} numberOfLines={2}>
            {prop.titleAr}
          </Text>
          <Text style={[styles.previewDistrict, { textAlign: isAr ? "right" : "left" }]}>
            {prop.districtAr}، الرياض
          </Text>
        </View>
        {prop.isOwned && (
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeText}>{isAr ? "ملكي" : "Owned"}</Text>
          </View>
        )}
      </View>

      {/* KPI strip */}
      <View style={[styles.kpiStrip, { flexDirection: isAr ? "row-reverse" : "row" }]}>
        <View style={[styles.kpi, { alignItems: isAr ? "flex-end" : "flex-start" }]}>
          <Text style={styles.kpiLabel}>{isAr ? "السعر" : "Price"}</Text>
          <Text style={styles.kpiValue}>{fmtPrice(prop.price)}</Text>
          <Text style={styles.kpiSub}>SAR</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={[styles.kpi, { alignItems: "center" }]}>
          <Text style={styles.kpiLabel}>{isAr ? "المساحة" : "Area"}</Text>
          <Text style={styles.kpiValue}>{prop.area}</Text>
          <Text style={styles.kpiSub}>{isAr ? "م²" : "m²"}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={[styles.kpi, { alignItems: isAr ? "flex-start" : "flex-end" }]}>
          <Text style={styles.kpiLabel}>{isAr ? "الدفع" : "Payment"}</Text>
          <View style={[styles.payBadge, { backgroundColor: pay.bg }]}>
            <MaterialIcons
              name={prop.paymentPref === "mortgage" ? "account-balance" : prop.paymentPref === "cash" ? "payments" : "swap-horiz"}
              size={10} color={pay.txt}
            />
            <Text style={[styles.payBadgeText, { color: pay.txt }]}>
              {paymentLabel(prop.paymentPref, isAr)}
            </Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.82 }]}
        onPress={() => { onClose(); router.push("/(tabs)/ai-concierge"); }}
      >
        <MaterialIcons name="query-stats" size={15} color="#0A0E1A" />
        <Text style={styles.ctaText}>
          {isAr ? "تحليل الأهلية التمويلية" : "Analyse Financing Eligibility"}
        </Text>
        <MaterialIcons name={isAr ? "chevron-left" : "chevron-right"} size={15} color="#0A0E1A" />
      </Pressable>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ══════════════════════════════════════════════════════════════════════════════
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "النرجس": { lat: 24.833, lng: 46.644 },
  "الملقا":  { lat: 24.778, lng: 46.660 },
  "العليا":  { lat: 24.696, lng: 46.681 },
};

export default function MapDiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const { properties } = useApp();
  const { isAr } = useLocale();

  // ── Animated pan/zoom values ───────────────────────────────────────────────
  const scale  = useRef(new Animated.Value(1)).current;
  const transX = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;
  const curS   = useRef(1);
  const curOff = useRef({ x: 0, y: 0 });

  // ── State ──────────────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState<"overview" | "detail">("overview");
  const [filter, setFilter]       = useState<PaymentFilter>("all");
  const [selected, setSelected]   = useState<MapProp | null>(null);

  // ── Merge owned properties ─────────────────────────────────────────────────
  const ownedPins: MapProp[] = useMemo(() =>
    properties
      .filter((p) => p.location?.district && DISTRICT_COORDS[p.location.district])
      .map((p, i) => {
        const c = DISTRICT_COORDS[p.location.district!]!;
        return {
          id: p.id,
          titleAr: p.title ?? p.location?.district ?? "عقار",
          districtAr: p.location.district!,
          lat: c.lat + (i % 3) * 0.0025,
          lng: c.lng + Math.floor(i / 3) * 0.003,
          price: p.price,
          type: (p.type ?? "villa") as MapProp["type"],
          paymentPref: "both" as const,
          area: p.area ?? 0,
          isOwned: true,
        };
      }), [properties]);

  const allPins = useMemo(() =>
    [...ownedPins, ...MOCK_MARKET.filter((m) => !ownedPins.some((o) => o.id === m.id))],
    [ownedPins]);

  const filteredPins = useMemo(() =>
    allPins.filter((p) => {
      if (filter === "all") return true;
      if (filter === "mortgage") return p.paymentPref === "mortgage" || p.paymentPref === "both";
      return p.paymentPref === "cash" || p.paymentPref === "both";
    }), [allPins, filter]);

  // ── PanResponder ───────────────────────────────────────────────────────────
  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        transX.setOffset(curOff.current.x);
        transY.setOffset(curOff.current.y);
        transX.setValue(0);
        transY.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: transX, dy: transY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, g) => {
        transX.flattenOffset();
        transY.flattenOffset();
        curOff.current = { x: curOff.current.x + g.dx, y: curOff.current.y + g.dy };
      },
    })
  ).current;

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const applyZoom = useCallback((factor: number) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, curS.current * factor));
    curS.current = next;
    Animated.spring(scale, { toValue: next, tension: 80, friction: 9, useNativeDriver: true }).start();
    setZoomLevel(next >= DETAIL_THRESH ? "detail" : "overview");
    void Haptics.selectionAsync();
  }, [scale]);

  const zoomIn  = () => applyZoom(ZOOM_STEP);
  const zoomOut = () => applyZoom(1 / ZOOM_STEP);

  // ── Marker press ───────────────────────────────────────────────────────────
  const onMarker = useCallback((p: MapProp) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => prev?.id === p.id ? null : p);
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 64 : 0);

  const filterLabels: Record<PaymentFilter, string> = isAr
    ? { all: "الكل", mortgage: "تمويل عقاري", cash: "كاش" }
    : { all: "All",  mortgage: "Mortgage",      cash: "Cash" };
  const filterIcons: Record<PaymentFilter, React.ComponentProps<typeof MaterialIcons>["name"]> = {
    all: "tune", mortgage: "account-balance", cash: "payments",
  };

  return (
    <View style={styles.root}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View style={[styles.headerRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={18} color="#FFF" />
            <Text style={styles.backBtnText}>{isAr ? "رجوع" : "Back"}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { textAlign: isAr ? "right" : "left" }]}>
              {isAr ? "خريطة الاكتشاف" : "Property Map"}
            </Text>
            <Text style={[styles.headerSub, { textAlign: isAr ? "right" : "left" }]}>
              {filteredPins.length} {isAr ? "عقار · الرياض" : "properties · Riyadh"}
            </Text>
          </View>
          <View style={styles.modeBadge}>
            <MaterialIcons
              name={zoomLevel === "detail" ? "zoom-in-map" : "public"}
              size={13} color="#C9A84C"
            />
            <Text style={styles.modeBadgeText}>
              {zoomLevel === "detail" ? (isAr ? "تفصيلي" : "Detail") : (isAr ? "عام" : "Overview")}
            </Text>
          </View>
        </View>

        {/* Filter pills */}
        <View style={[styles.filterRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
          {(["all", "mortgage", "cash"] as PaymentFilter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => { setFilter(f); void Haptics.selectionAsync(); }}
              >
                <MaterialIcons name={filterIcons[f]} size={11} color={active ? "#0A0E1A" : "#C9A84C"} />
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{filterLabels[f]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <View style={styles.viewport} {...pr.panHandlers}>
        <Animated.View
          style={[
            styles.canvas,
            { transform: [{ translateX: transX }, { translateY: transY }, { scale }] },
          ]}
        >
          {/* SVG map base */}
          <MapBackground showHeat={zoomLevel === "overview"} />

          {/* Markers */}
          {filteredPins.map((p) =>
            zoomLevel === "detail" ? (
              <PropertyMarker key={p.id} prop={p} isSelected={selected?.id === p.id} onPress={() => onMarker(p)} />
            ) : (
              <ClusterDot key={p.id} prop={p} isSelected={selected?.id === p.id} onPress={() => onMarker(p)} />
            )
          )}
        </Animated.View>
      </View>

      {/* ── Zoom controls ─────────────────────────────────────────────────── */}
      <View style={[
        styles.zoomBox,
        {
          bottom: selected ? 228 : 96,
          right: isAr ? undefined : 20,
          left: isAr ? 20 : undefined,
        },
      ]}>
        <Pressable style={styles.zoomBtn} onPress={zoomIn}>
          <MaterialIcons name="add" size={22} color="#C9A84C" />
        </Pressable>
        <View style={styles.zoomLine} />
        <Pressable style={styles.zoomBtn} onPress={zoomOut}>
          <MaterialIcons name="remove" size={22} color="#C9A84C" />
        </Pressable>
      </View>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      {!selected && (
        <View style={[
          styles.legend,
          {
            bottom: insets.bottom + 20,
            left: isAr ? undefined : 20,
            right: isAr ? 20 : undefined,
          },
        ]}>
          {[
            { color: "#C9A84C", label: isAr ? "عقاراتي" : "My property" },
            { color: "#1E4A82", label: isAr ? "السوق"   : "Market" },
          ].map((item) => (
            <View key={item.label} style={[styles.legendRow, { flexDirection: isAr ? "row-reverse" : "row", marginBottom: 4 }]}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
          {zoomLevel === "overview" && (
            <View style={[styles.legendRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
              <MaterialIcons name="touch-app" size={11} color="rgba(201,168,76,0.55)" />
              <Text style={[styles.legendLabel, { marginLeft: isAr ? 0 : 4, marginRight: isAr ? 4 : 0 }]}>
                {isAr ? "+ للتكبير وعرض الأسعار" : "+ to zoom for prices"}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Preview pane ──────────────────────────────────────────────────── */}
      {selected && (
        <PreviewPane prop={selected} isAr={isAr} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const NAVY = "#0A0E1A";
const GOLD = "#C9A84C";

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: NAVY },

  header: {
    backgroundColor: "#0C1220",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#192540", zIndex: 10,
  },
  headerRow:    { alignItems: "center", gap: 10, marginBottom: 10 },
  backBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18 },
  backBtnText:  { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  headerTitle:  { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub:    { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  modeBadge:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.25)" },
  modeBadgeText:{ color: GOLD, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  filterRow:    { gap: 7, flexWrap: "wrap" },
  pill:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.06)" },
  pillActive:   { backgroundColor: GOLD, borderColor: GOLD },
  pillText:     { color: GOLD, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pillTextActive: { color: NAVY },

  viewport:     { flex: 1, overflow: "hidden", backgroundColor: "#090D18" },
  canvas:       { width: MAP_W, height: MAP_H, position: "relative" },

  // Property tile (detail)
  tile: {
    position: "absolute", borderRadius: 6,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5, gap: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  tileText:  { fontSize: 10, fontFamily: "Inter_700Bold" },
  ownedDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD },

  // Cluster dot (overview)
  dot: { position: "absolute" },

  // Zoom controls
  zoomBox:   { position: "absolute", backgroundColor: "#0D1320", borderRadius: 13, overflow: "hidden", borderWidth: 1, borderColor: "#1A2845" },
  zoomBtn:   { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  zoomLine:  { height: 1, backgroundColor: "#1A2845" },

  // Legend
  legend:    { position: "absolute", backgroundColor: "rgba(12,18,32,0.92)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#192540" },
  legendRow: { alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel:{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_400Regular" },

  // Preview pane
  preview: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#0D1320", borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, paddingBottom: 30,
    borderTopWidth: 1, borderColor: "#192540",
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, elevation: 16,
  },
  previewHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 16 },
  closeBtn:       { position: "absolute", top: 18, right: 18 },
  previewRow:     { alignItems: "center", gap: 12 },
  previewIcon:    { width: 44, height: 44, borderRadius: 11, backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  previewTitle:   { color: "#FFF", fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20 },
  previewDistrict:{ color: "rgba(255,255,255,0.42)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  ownedBadge:     { backgroundColor: "rgba(201,168,76,0.14)", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(201,168,76,0.35)" },
  ownedBadgeText: { color: GOLD, fontSize: 11, fontFamily: "Inter_700Bold" },

  kpiStrip:  { gap: 0, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 13, padding: 12 },
  kpi:       { flex: 1, gap: 1 },
  kpiDivider:{ width: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 4 },
  kpiLabel:  { color: "rgba(255,255,255,0.38)", fontSize: 10, fontFamily: "Inter_400Regular" },
  kpiValue:  { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  kpiSub:    { color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "Inter_400Regular" },
  payBadge:  { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, marginTop: 3 },
  payBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: GOLD, borderRadius: 13, height: 46, gap: 7,
    shadowColor: GOLD, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  ctaText: { color: NAVY, fontSize: 13, fontFamily: "Inter_700Bold" },
});
