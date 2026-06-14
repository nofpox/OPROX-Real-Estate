/**
 * TourismMapView — NATIVE (WebView loads from API URL)
 *
 * Loads the map page from /api/map-view?lat=&lng=&isAr=
 * so Leaflet can load from CDN (real HTTPS origin, no Android WebView restrictions).
 * Apartment popups postMessage ride-link URLs; onMessage opens them via Linking.
 */
import React from "react";
import { Linking, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

export interface TourismSpot {
  id: string; emoji: string; nameAr: string; nameEn: string;
  cityAr: string; cityEn: string; descAr: string; descEn: string;
  category: string; lat: number; lng: number; mapsUrl: string;
  featured?: boolean; rating?: number;
}

interface Props {
  spots?:    TourismSpot[];   /* kept for web shim compatibility */
  isAr?:     boolean;
  apiBase?:  string;
  userLat?:  number;
  userLng?:  number;
  hasTabs?:  boolean;         /* true when bottom tab bar is visible (non-tourist mode) */
}

const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

export default function TourismMapView({
  isAr    = false,
  apiBase = "",
  userLat = DEFAULT_LAT,
  userLng = DEFAULT_LNG,
  hasTabs = false,
}: Props) {
  const mapUri = `${apiBase}/api/map-view?lat=${userLat.toFixed(5)}&lng=${userLng.toFixed(5)}&isAr=${isAr ? "1" : "0"}&tabs=${hasTabs ? "1" : "0"}`;

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; url: string };
      if (msg.type === "openUrl" && msg.url) {
        void Linking.openURL(msg.url).catch(() => {});
      }
    } catch { /* ignore malformed messages */ }
  }

  return (
    <WebView
      key={mapUri}
      source={{ uri: mapUri }}
      style={styles.webview}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      bounces={false}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#0f2040" },
});
