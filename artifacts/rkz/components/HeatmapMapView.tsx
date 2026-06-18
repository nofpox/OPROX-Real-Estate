/**
 * HeatmapMapView — Native map using react-native-maps.
 * Tap a marker → property card appears at bottom.
 * Tap "عرض في القائمة" → onOpenCards().
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
} from "react-native";
import MapView, {
  Marker,
  UrlTile,
  PROVIDER_DEFAULT,
  type UserLocationChangeEvent,
} from "react-native-maps";

import { useColors } from "@/hooks/useColors";

// ── District coordinate lookup ─────────────────────────────────────────────
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "الرياض__النرجس":          [24.774, 46.633],
  "الرياض__الملقا":          [24.761, 46.637],
  "الرياض__العليا":          [24.694, 46.682],
  "الرياض__الياسمين":        [24.802, 46.650],
  "الرياض__الصناعية":        [24.619, 46.722],
  "الرياض__الحمراء":         [24.678, 46.705],
  "جدة__الروضة":             [21.553, 39.172],
  "جدة__التعمير":            [21.527, 39.183],
  "الدمام__الشاطئ":          [26.452, 50.046],
  "الدمام__الراكة":          [26.427, 50.082],
  "مكة المكرمة__العزيزية":   [21.362, 39.848],
  "الخبر__الكورنيش":         [26.300, 50.192],
  "الخبر__الأمواج":          [26.272, 50.212],
  "المدينة المنورة__الورود":  [24.523, 39.574],
  "الطائف__الهضيبة":         [21.280, 40.420],
  "الطائف__الشفا":           [21.218, 40.348],
};

const CITY_COORDS: Record<string, [number, number]> = {
  "الرياض":           [24.7136, 46.6753],
  "جدة":              [21.4858, 39.1925],
  "الدمام":           [26.4207, 50.0888],
  "مكة المكرمة":      [21.3891, 39.8579],
  "الخبر":            [26.2172, 50.1971],
  "المدينة المنورة":  [24.5247, 39.5692],
  "الطائف":           [21.2827, 40.4146],
};

const TYPE_LABELS: Record<string, string> = {
  villa:       "فيلا",
  apartment:   "شقة",
  land:        "أرض",
  commercial:  "تجاري",
  compound:    "مجمع",
  floor:       "دور",
  warehouse:   "مستودع",
  farm:        "مزرعة",
  rest_house:  "استراحة",
  palace:      "قصر",
};

// ── Types ──────────────────────────────────────────────────────────────────
export interface MapProperty {
  id: string;
  city: string;
  district: string;
  type: string;
  price: number;
  area: number;
  bedrooms?: number;
  badge?: string;
}

export interface HeatCell {
  key: string;
  city: string;
  district: string;
  occupancy: number;
  transactions: number;
}
export type HeatMetric = "occupancy" | "transactions";

interface Feature extends MapProperty {
  lat: number;
  lng: number;
}

interface Props {
  properties:   MapProperty[];
  isAr?:        boolean;
  isDark?:      boolean;
  onOpenCards?: () => void;
  bottomPad?:   number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " مليون";
  if (n >= 1_000)     return Math.round(n / 1_000) + " ألف";
  return n.toString();
}

function resolveCoords(properties: MapProperty[]): Feature[] {
  const districtIdx: Record<string, number> = {};
  return properties.map((p) => {
    const key = p.city + "__" + p.district;
    const idx = districtIdx[key] ?? 0;
    districtIdx[key] = idx + 1;
    const base = DISTRICT_COORDS[key] ?? CITY_COORDS[p.city] ?? [24.7136, 46.6753];
    const angle = idx * 2.399;
    const r = idx === 0 ? 0 : 0.014 + Math.floor(idx / 5) * 0.009;
    return { ...p, lat: base[0] + Math.cos(angle) * r, lng: base[1] + Math.sin(angle) * r };
  });
}

// ── Price pill (marker view) ───────────────────────────────────────────────
// Wrapped in a transparent buffer view — prevents Android Marker from
// clipping the pill's border/shadow at the edges.
function PricePill({ price, badge, selected }: { price: number; badge?: string; selected: boolean }) {
  const isGold = price >= 5_000_000 || !!badge;
  return (
    <View style={s.pillBuffer}>
      <View style={[s.pill, isGold ? s.pillGold : s.pillGreen, selected && s.pillSelected]}>
        <Text style={[s.pillText, isGold ? s.pillTextDark : s.pillTextWhite]}>
          {fmtPrice(price)}
        </Text>
      </View>
    </View>
  );
}

// ── Property detail card (bottom overlay) ────────────────────────────────
function PropertyCard({
  feature,
  onClose,
  onOpenCards,
}: {
  feature: Feature;
  onClose: () => void;
  onOpenCards?: () => void;
}) {
  const typeLabel = TYPE_LABELS[feature.type] ?? feature.type;
  return (
    <View style={s.card}>
      {/* Close button */}
      <Pressable style={s.closeBtn} onPress={onClose} hitSlop={12}>
        <Text style={s.closeTxt}>✕</Text>
      </Pressable>

      {/* Type + badge row */}
      <View style={s.cardHeader}>
        <Text style={s.cardType}>{typeLabel}</Text>
        {feature.badge ? <Text style={s.cardBadge}>{feature.badge}</Text> : null}
      </View>

      {/* Title */}
      <Text style={s.cardTitle}>{typeLabel} {feature.district}</Text>
      <Text style={s.cardCity}>{feature.city} — {feature.district}</Text>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statVal}>{fmtPrice(feature.price)}</Text>
          <Text style={s.statLbl}>السعر</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statVal}>{(feature.area ?? 0).toLocaleString()}</Text>
          <Text style={s.statLbl}>م²</Text>
        </View>
        {feature.bedrooms ? (
          <>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{feature.bedrooms}</Text>
              <Text style={s.statLbl}>غرف</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* CTA */}
      <Pressable
        style={s.ctaBtn}
        onPress={() => { onOpenCards?.(); }}
      >
        <Text style={s.ctaTxt}>عرض في القائمة ←</Text>
      </Pressable>
    </View>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function HeatmapMapView({ properties, onOpenCards, bottomPad = 20 }: Props) {
  const colors   = useColors();
  const mapRef   = useRef<MapView>(null);
  const [selected, setSelected]   = useState<Feature | null>(null);
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const features = resolveCoords(properties);

  function handleLocate() {
    if (!userCoord) return;
    mapRef.current?.animateToRegion(
      { latitude: userCoord.latitude, longitude: userCoord.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 },
      700,
    );
  }

  function onUserLocationChange(e: UserLocationChangeEvent) {
    const c = e.nativeEvent.coordinate;
    if (c) setUserCoord({ latitude: c.latitude, longitude: c.longitude });
  }

  if (properties.length === 0) {
    return (
      <View style={[s.empty, { backgroundColor: colors.background }]}>
        <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>
          لا توجد عقارات للعرض
        </Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude:      23.8,
          longitude:     44.8,
          latitudeDelta:  12,
          longitudeDelta: 12,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapType="none"
        onPress={() => setSelected(null)}
        onUserLocationChange={onUserLocationChange}
      >
        {/* CARTO Voyager tiles — same style as TourismMapView */}
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

        {features.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={(e) => {
              e.stopPropagation?.();
              setSelected(p);
            }}
          >
            <PricePill price={p.price} badge={p.badge} selected={selected?.id === p.id} />
          </Marker>
        ))}
      </MapView>

      {/* ── My Location button — bottom-left ── */}
      <Pressable
        style={[s.locateBtn, { bottom: bottomPad + 82, left: 18 }]}
        onPress={handleLocate}
        android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 24, borderless: true }}
      >
        <MaterialIcons
          name={userCoord ? "my-location" : "location-searching"}
          size={22}
          color={userCoord ? "#C9A84C" : "rgba(255,255,255,0.5)"}
        />
      </Pressable>

      {/* Property detail card — appears when a marker is tapped */}
      {selected && (
        <View style={s.cardWrap} pointerEvents="box-none">
          <PropertyCard
            feature={selected}
            onClose={() => setSelected(null)}
            onOpenCards={onOpenCards}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const GOLD  = "#D4A843";
const NAVY  = "#0f2040";
const WHITE = "#ffffff";

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTxt: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  // ── My Location button ─────────────────────────────────────────────────
  locateBtn: {
    position:        "absolute",
    zIndex:          15,
    width:           46,
    height:          46,
    borderRadius:    23,
    backgroundColor: "rgba(8,16,34,0.85)",
    borderWidth:     1.5,
    borderColor:     "rgba(201,168,76,0.45)",
    alignItems:      "center",
    justifyContent:  "center",
    ...Platform.select({
      android: { elevation: 6 },
      ios:     { shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    }),
  },

  // ── Price pill marker ──────────────────────────────────────────────────
  pillBuffer: {
    padding: 14,
    backgroundColor: "transparent",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical:    5,
    borderRadius:      20,
    /* No elevation/shadow — Android clips Marker bitmaps at view bounds */
    borderWidth: 2,
  },
  pillGreen:    { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  pillGold:     { backgroundColor: GOLD,      borderColor: "#b8902e" },
  pillSelected: { borderColor: WHITE, borderWidth: 3 },
  pillText:     { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  pillTextWhite: { color: WHITE },
  pillTextDark:  { color: NAVY },

  // ── Bottom card ────────────────────────────────────────────────────────
  cardWrap: {
    position: "absolute",
    bottom:   90,
    left:     16,
    right:    16,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius:    18,
    padding:         18,
    borderWidth:     1.5,
    borderColor:     GOLD,
    ...Platform.select({
      android: { elevation: 12 },
      ios:     { shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    }),
  },
  closeBtn: {
    position:  "absolute",
    top:       12,
    left:      14,
    zIndex:    10,
    width:     28,
    height:    28,
    alignItems:     "center",
    justifyContent: "center",
  },
  closeTxt: { color: "#94a3b8", fontSize: 16, fontWeight: "700" },

  cardHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 6 },
  cardType: {
    fontSize: 11, color: GOLD,
    backgroundColor: "rgba(212,168,67,0.18)",
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  cardBadge: {
    fontSize: 10, color: NAVY, backgroundColor: GOLD, fontWeight: "700",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: WHITE, textAlign: "right", marginBottom: 2 },
  cardCity:  { fontSize: 11, color: "#94a3b8", textAlign: "right", marginBottom: 12 },

  statsRow:   { flexDirection: "row-reverse", alignItems: "center", marginBottom: 14 },
  statItem:   { flex: 1, alignItems: "center" },
  statDivider:{ width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.12)" },
  statVal:    { fontSize: 17, fontWeight: "700", color: GOLD },
  statLbl:    { fontSize: 10, color: "#94a3b8", marginTop: 2 },

  ctaBtn: {
    backgroundColor: GOLD,
    borderRadius:    10,
    paddingVertical: 10,
    alignItems:      "center",
  },
  ctaTxt: { color: NAVY, fontWeight: "700", fontSize: 13, fontFamily: "Inter_700Bold" },
});
