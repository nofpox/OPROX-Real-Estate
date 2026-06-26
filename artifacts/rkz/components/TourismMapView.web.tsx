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
  cityAr: string; cityEn: string; descAr: string; descEn: string;
  category: string; lat: number; lng: number; mapsUrl: string;
  featured?: boolean; rating?: number;
}

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
  // dev (Expo dev domain, no base prefix) and production (/rozoz-msrep/ prefix).
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
