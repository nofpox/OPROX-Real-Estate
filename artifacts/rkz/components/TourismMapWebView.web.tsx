/**
 * TourismMapWebView — WEB
 * Uses an iframe pointing to lwmap.html (same-origin static file in public/).
 * Same-origin iframes can load Leaflet from CDN without null-origin restrictions.
 * Spots sent on iframe onLoad; filter/locate sent after iframe signals 'ready'.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

export interface TouristSpot {
  id:     string;
  type:   "mosque" | "heritage" | "nature" | "entertainment" | "hotel" | "restaurant" | "cafe" | "mall" | "apartment" | "serviced";
  nameAr: string;
  city:   string;
  lat:    number;
  lng:    number;
  desc:   string;
}

export interface SelectedSpotData {
  id:      string;
  type:    TouristSpot["type"];
  nameAr:  string;
  city:    string;
  desc:    string;
  lat:     number;
  lng:     number;
}

const CATEGORY_COLOR: Record<TouristSpot["type"], string> = {
  mosque:        "#22c55e",
  heritage:      "#f59e0b",
  nature:        "#06b6d4",
  entertainment: "#8b5cf6",
  hotel:         "#3b82f6",
  restaurant:    "#f97316",
  cafe:          "#ec4899",
  mall:          "#6366f1",
  apartment:     "#14b8a6",
  serviced:      "#f43f5e",
};

function getMapSrc(): string {
  if (typeof window === "undefined") return "";
  // Replace last path segment so the URL works in both dev and production.
  const loc = window.location;
  const parts = loc.pathname.split("/");
  parts[parts.length - 1] = "lwmap.html";
  return loc.origin + parts.join("/");
}

interface Props {
  spots:          TouristSpot[];
  activeFilter:   string;
  onSelect:       (spot: SelectedSpotData) => void;
  onDeselect:     () => void;
  onLoadingChange?: (loading: boolean) => void;
  centerCoords?:  { lat: number; lng: number };
}

export default function TourismMapWebView({
  spots,
  activeFilter,
  onSelect,
  onDeselect,
  onLoadingChange,
  centerCoords,
}: Props) {
  const iframeRef     = useRef<HTMLIFrameElement | null>(null);
  const prevFilter    = useRef("all");
  const isReady       = useRef(false);
  const pendingLocate = useRef<{ lat: number; lng: number } | null>(null);
  const spotsRef      = useRef(spots);
  const mapSrc        = useRef(getMapSrc());

  spotsRef.current = spots;

  function pm(msg: object) {
    try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), "*"); } catch { /* ok */ }
  }
  function sendLocate(lat: number, lng: number) { pm({ type: "locate", lat, lng }); }

  // Send spots on iframe load
  function handleLoad() {
    isReady.current = false;
    pm({ type: "init", spots: spotsRef.current, colors: CATEGORY_COLOR });
  }

  useEffect(() => {
    if (prevFilter.current === activeFilter) return;
    prevFilter.current = activeFilter;
    if (isReady.current) pm({ type: "filter", value: activeFilter });
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!centerCoords) return;
    if (isReady.current) sendLocate(centerCoords.lat, centerCoords.lng);
    else pendingLocate.current = centerCoords;
  }, [centerCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      try {
        const raw = JSON.parse(e.data as string) as Record<string, unknown>;

        if (raw.type === "ready") {
          isReady.current = true;
          if (pendingLocate.current) {
            sendLocate(pendingLocate.current.lat, pendingLocate.current.lng);
            pendingLocate.current = null;
          }
          if (prevFilter.current !== "all") pm({ type: "filter", value: prevFilter.current });
        }
        if (raw.type === "select") onSelect({
          id:     raw.id      as string,
          type:   raw.spotType as TouristSpot["type"],
          nameAr: raw.nameAr  as string,
          city:   raw.city    as string,
          desc:   raw.desc    as string,
          lat:    raw.lat     as number,
          lng:    raw.lng     as number,
        });
        if (raw.type === "deselect") onDeselect();
        if (raw.type === "loading") onLoadingChange?.(raw.value as boolean);
      } catch { /* ok */ }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onSelect, onDeselect, onLoadingChange]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <iframe
        ref={iframeRef as any}
        src={mapSrc.current}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="tourism-spots-map"
        allow="geolocation"
        onLoad={handleLoad}
      />
    </View>
  );
}
