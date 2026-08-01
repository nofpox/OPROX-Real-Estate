/**
 * TourismMapView — WEB
 * Uses an iframe pointing to lmap.html (same-origin static file in public/).
 * Same-origin iframes can load Leaflet from CDN without null-origin restrictions.
 * Config sent via postMessage on iframe onLoad event.
 */
import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

export interface TourismSpot {
  id: string; emoji: string; nameAr: string; nameEn: string;
  cityAr: string; cityEn: string; descAr?: string; descEn?: string;
  category: string; lat: number; lng: number; mapsUrl: string;
  featured?: boolean; rating?: number;
}

export interface TourismMapHandle {
  injectJavaScript: (js: string) => void;
}

export const SPOTS: TourismSpot[] = [
  { id:"diriyah",         emoji:"🏯", nameAr:"الدرعية التاريخية",    nameEn:"Diriyah",               cityAr:"الرياض",          cityEn:"Riyadh",  category:"cultural",      lat:24.734, lng:46.571, mapsUrl:"https://maps.google.com/?q=Diriyah,Riyadh" },
  { id:"masmak",          emoji:"🏰", nameAr:"قصر المصمك",            nameEn:"Al Masmak Palace",      cityAr:"الرياض",          cityEn:"Riyadh",  category:"cultural",      lat:24.686, lng:46.713, mapsUrl:"https://maps.google.com/?q=Al+Masmak+Palace,Riyadh" },
  { id:"national-museum", emoji:"🏛", nameAr:"المتحف الوطني السعودي", nameEn:"Saudi National Museum", cityAr:"الرياض",          cityEn:"Riyadh",  category:"cultural",      lat:24.699, lng:46.713, mapsUrl:"https://maps.google.com/?q=Saudi+National+Museum,Riyadh" },
  { id:"alula",           emoji:"🌄", nameAr:"العُلا",                nameEn:"AlUla",                 cityAr:"العُلا",          cityEn:"AlUla",   category:"nature",        lat:26.624, lng:37.921, mapsUrl:"https://maps.google.com/?q=AlUla,Saudi+Arabia" },
  { id:"abha",            emoji:"🌿", nameAr:"أبها",                  nameEn:"Abha",                  cityAr:"أبها",            cityEn:"Abha",    category:"nature",        lat:18.216, lng:42.505, mapsUrl:"https://maps.google.com/?q=Abha,Saudi+Arabia" },
  { id:"kingdom-centre",  emoji:"🏙", nameAr:"برج المملكة",           nameEn:"Kingdom Centre Tower",  cityAr:"الرياض",          cityEn:"Riyadh",  category:"entertainment", lat:24.691, lng:46.683, mapsUrl:"https://maps.google.com/?q=Kingdom+Centre+Tower,Riyadh" },
  { id:"boulevard",       emoji:"🎡", nameAr:"بولفارد الرياض",        nameEn:"Boulevard City Riyadh", cityAr:"الرياض",          cityEn:"Riyadh",  category:"entertainment", lat:24.803, lng:46.637, mapsUrl:"https://maps.google.com/?q=Boulevard+City+Riyadh" },
  { id:"jeddah-historic", emoji:"🕌", nameAr:"جدة التاريخية",         nameEn:"Historic Jeddah",       cityAr:"جدة",             cityEn:"Jeddah",  category:"cultural",      lat:21.487, lng:39.188, mapsUrl:"https://maps.google.com/?q=Al-Balad,Jeddah" },
  { id:"mecca",           emoji:"🕋", nameAr:"مكة المكرمة",           nameEn:"Mecca",                 cityAr:"مكة المكرمة",     cityEn:"Mecca",   category:"religious",     lat:21.389, lng:39.857, mapsUrl:"https://maps.google.com/?q=Grand+Mosque,Mecca" },
  { id:"medina",          emoji:"🌙", nameAr:"المدينة المنورة",        nameEn:"Medina",                cityAr:"المدينة المنورة", cityEn:"Medina",  category:"religious",     lat:24.524, lng:39.570, mapsUrl:"https://maps.google.com/?q=Al-Masjid+an-Nabawi,Medina" },
  { id:"tabuk",           emoji:"🏜", nameAr:"تبوك",                  nameEn:"Tabuk",                 cityAr:"تبوك",            cityEn:"Tabuk",   category:"nature",        lat:28.383, lng:36.566, mapsUrl:"https://maps.google.com/?q=Tabuk,Saudi+Arabia" },
  { id:"riyadh-season",   emoji:"🎪", nameAr:"موسم الرياض",           nameEn:"Riyadh Season",         cityAr:"الرياض",          cityEn:"Riyadh",  category:"entertainment", lat:24.787, lng:46.650, mapsUrl:"https://maps.google.com/?q=Riyadh+Season+Boulevard" },
];

interface Props {
  spots?:   TourismSpot[];
  isAr?:    boolean;
  apiBase?: string;
  userLat?: number;
  userLng?: number;
}

const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

function getMapSrc(): string {
  if (typeof window === "undefined") return "";
  // Replace last path segment with the filename so the URL works in both
  // dev (Expo dev domain, no base prefix) and production (/oprox-properties/ prefix).
  const loc = window.location;
  const parts = loc.pathname.split("/");
  parts[parts.length - 1] = "lmap.html";
  return loc.origin + parts.join("/");
}

export default function TourismMapView({
  spots   = [],
  isAr    = false,
  apiBase = "",
  userLat = DEFAULT_LAT,
  userLng = DEFAULT_LNG,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const mapSrc    = useRef(getMapSrc());

  const sendInit = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    const cfg = { type: "init", spots, isAr, userLat, userLng, apiBase };
    try { frame.contentWindow.postMessage(JSON.stringify(cfg), "*"); } catch { /* ok */ }
  }, [spots, isAr, userLat, userLng, apiBase]);

  // Re-send config when props change (map already loaded)
  useEffect(() => { sendInit(); }, [sendInit]);

  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <iframe
        ref={iframeRef as any}
        src={mapSrc.current}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        title="tourism-explore-map"
        allow="geolocation"
        onLoad={sendInit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative", backgroundColor: "#0f2040" },
});
