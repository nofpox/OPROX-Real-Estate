/**
 * TourismMapView — NATIVE
 *
 * Fetches the full map HTML from /api/map-view (including embedded Leaflet),
 * then passes it to WebView as source={{ html }} — SAME approach as HeatmapMapView.
 *
 * Why: `source={{ uri }}` causes Android WebView to block Carto tile requests
 * (origin-based policy). `source={{ html }}` uses a null/file origin that
 * Android WebView treats more permissively → tiles load correctly.
 *
 * baseUrl is set so relative fetch() calls inside the HTML (/api/poi?…)
 * resolve against the correct API server origin.
 */
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

export interface TourismSpot {
  id: string; emoji: string; nameAr: string; nameEn: string;
  cityAr: string; cityEn: string; descAr: string; descEn: string;
  category: string; lat: number; lng: number; mapsUrl: string;
  featured?: boolean; rating?: number;
}

interface Props {
  spots?:    TourismSpot[];
  isAr?:     boolean;
  apiBase?:  string;
  userLat?:  number;
  userLng?:  number;
  hasTabs?:  boolean;
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
  const [html,    setHtml]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const mapUri = `${apiBase}/api/map-view?lat=${userLat.toFixed(5)}&lng=${userLng.toFixed(5)}&isAr=${isAr ? "1" : "0"}&tabs=${hasTabs ? "1" : "0"}`;

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setHtml(null);
    setLoading(true);
    setError(false);

    fetch(mapUri, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => {
        if (!ctrl.signal.aborted) {
          setHtml(text);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!ctrl.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => ctrl.abort();
  // Only re-fetch when the actual URL params change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapUri]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; url: string };
      if (msg.type === "openUrl" && msg.url) {
        void Linking.openURL(msg.url).catch(() => {});
      }
    } catch { /* ignore malformed */ }
  }

  if (loading || error || !html) {
    return (
      <View style={styles.center}>
        {loading && <ActivityIndicator size="large" color="#C9A84C" />}
      </View>
    );
  }

  return (
    <WebView
      key={mapUri}
      /* baseUrl lets /api/poi?… inside the HTML resolve to the API server */
      source={{ html, baseUrl: apiBase }}
      style={styles.webview}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      allowUniversalAccessFromFileURLs
      allowFileAccessFromFileURLs
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
  center:  { flex: 1, backgroundColor: "#0f2040", alignItems: "center", justifyContent: "center" },
});
