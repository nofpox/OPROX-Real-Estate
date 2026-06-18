/**
 * HeatmapMapView — Native map using react-native-maps (available in Expo Go).
 * Replaced the Leaflet/WebView approach which had blank-tile issues on Android.
 */
import React, { useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
} from "react-native";
import MapView, { Marker, Callout, UrlTile, PROVIDER_DEFAULT } from "react-native-maps";

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

// Legacy exports kept for any stale imports.
export interface HeatCell {
  key: string;
  city: string;
  district: string;
  occupancy: number;
  transactions: number;
}
export type HeatMetric = "occupancy" | "transactions";

interface Props {
  properties:  MapProperty[];
  isAr?:       boolean;
  isDark?:     boolean;
  onOpenCards?: () => void;
}

// ── Price formatter ────────────────────────────────────────────────────────
function fmtPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " مليون";
  if (n >= 1_000)     return Math.round(n / 1_000) + " ألف";
  return n.toString();
}

// ── Coordinate resolver with spiral offset ─────────────────────────────────
function resolveCoords(properties: MapProperty[]): Array<MapProperty & { lat: number; lng: number }> {
  const districtIdx: Record<string, number> = {};
  return properties.map((p) => {
    const key = p.city + "__" + p.district;
    const idx = districtIdx[key] ?? 0;
    districtIdx[key] = idx + 1;
    const base = DISTRICT_COORDS[key] ?? CITY_COORDS[p.city] ?? [24.7136, 46.6753];
    const angle = idx * 2.399;
    const r = idx === 0 ? 0 : 0.014 + Math.floor(idx / 5) * 0.009;
    return {
      ...p,
      lat: base[0] + Math.cos(angle) * r,
      lng: base[1] + Math.sin(angle) * r,
    };
  });
}

// ── Price pill marker ──────────────────────────────────────────────────────
function PricePill({ price, badge }: { price: number; badge?: string }) {
  const isGold = price >= 5_000_000 || !!badge;
  return (
    <View style={[s.pill, isGold ? s.pillGold : s.pillGreen]}>
      <Text style={[s.pillText, isGold ? s.pillTextDark : s.pillTextWhite]}>
        {fmtPrice(price)}
      </Text>
    </View>
  );
}

// ── Callout popup ──────────────────────────────────────────────────────────
function PropertyCallout({
  property,
  onOpenCards,
}: {
  property: MapProperty;
  onOpenCards?: () => void;
}) {
  const typeLabel = TYPE_LABELS[property.type] ?? property.type;
  return (
    <Callout tooltip onPress={onOpenCards}>
      <View style={s.callout}>
        <View style={s.calloutHeader}>
          <Text style={s.calloutType}>{typeLabel}</Text>
          {property.badge && (
            <Text style={s.calloutBadge}>{property.badge}</Text>
          )}
        </View>
        <Text style={s.calloutTitle}>
          {typeLabel} {property.district}
        </Text>
        <Text style={s.calloutCity}>
          {property.city} — {property.district}
        </Text>
        <View style={s.calloutRow}>
          <View style={s.calloutItem}>
            <Text style={s.calloutVal}>{fmtPrice(property.price)}</Text>
            <Text style={s.calloutLbl}>السعر</Text>
          </View>
          <View style={s.calloutItem}>
            <Text style={s.calloutVal}>{(property.area ?? 0).toLocaleString()}</Text>
            <Text style={s.calloutLbl}>م²</Text>
          </View>
          {!!property.bedrooms && (
            <View style={s.calloutItem}>
              <Text style={s.calloutVal}>{property.bedrooms}</Text>
              <Text style={s.calloutLbl}>غرف</Text>
            </View>
          )}
        </View>
        <Pressable style={s.calloutBtn} onPress={onOpenCards}>
          <Text style={s.calloutBtnText}>عرض في القائمة ←</Text>
        </Pressable>
      </View>
    </Callout>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function HeatmapMapView({ properties, isAr: _isAr, isDark: _isDark = true, onOpenCards }: Props) {
  const colors  = useColors();
  const mapRef  = useRef<MapView>(null);
  const features = resolveCoords(properties);

  if (properties.length === 0) {
    return (
      <View style={[s.empty, { backgroundColor: colors.background }]}>
        <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
          لا توجد عقارات للعرض
        </Text>
      </View>
    );
  }

  return (
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
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      mapType="none"
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
        >
          <PricePill price={p.price} badge={p.badge} />
          <PropertyCallout property={p} onOpenCards={onOpenCards} />
        </Marker>
      ))}
    </MapView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems:      "center",
    justifyContent:  "center",
    padding:         32,
  },
  emptyText: {
    fontSize:   14,
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
  },

  // Price pill marker
  pill: {
    paddingHorizontal: 12,
    paddingVertical:    5,
    borderRadius:      20,
    shadowColor:       "#000",
    shadowOpacity:     0.35,
    shadowRadius:      6,
    shadowOffset:      { width: 0, height: 3 },
    elevation:         6,
  },
  pillGreen:     { backgroundColor: "#22c55e", borderWidth: 1.5, borderColor: "#16a34a" },
  pillGold:      { backgroundColor: "#D4A843", borderWidth: 1.5, borderColor: "#b8902e" },
  pillText:      { fontSize: 13, fontWeight: "700" },
  pillTextWhite: { color: "#fff" },
  pillTextDark:  { color: "#0F2040" },

  // Callout popup
  callout: {
    backgroundColor: "#0f2040",
    borderRadius:    14,
    padding:         14,
    minWidth:        200,
    maxWidth:        260,
    borderWidth:     1.5,
    borderColor:     "#D4A843",
    ...Platform.select({
      android: { elevation: 8 },
      ios:     { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    }),
  },
  calloutHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:             6,
    marginBottom:    8,
  },
  calloutType: {
    fontSize:        11,
    color:           "#D4A843",
    backgroundColor: "rgba(212,168,67,0.2)",
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:    10,
  },
  calloutBadge: {
    fontSize:        10,
    color:           "#0F2040",
    backgroundColor: "#D4A843",
    fontWeight:      "700",
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:    10,
  },
  calloutTitle: {
    fontSize:   14,
    fontWeight: "700",
    color:      "#fff",
    marginBottom: 2,
    textAlign:  "right",
  },
  calloutCity: {
    fontSize:    11,
    color:       "#94a3b8",
    marginBottom: 10,
    textAlign:   "right",
  },
  calloutRow: {
    flexDirection:   "row-reverse",
    gap:              8,
    justifyContent:  "flex-end",
    marginBottom:    12,
  },
  calloutItem: { alignItems: "center", minWidth: 52 },
  calloutVal:  { fontSize: 16, fontWeight: "700", color: "#D4A843" },
  calloutLbl:  { fontSize: 10, color: "#94a3b8", marginTop: 2 },
  calloutBtn: {
    backgroundColor: "#D4A843",
    borderRadius:     9,
    paddingVertical:  8,
    paddingHorizontal: 12,
    alignItems:       "center",
  },
  calloutBtnText: {
    color:      "#0F2040",
    fontWeight: "700",
    fontSize:   12,
  },
});
