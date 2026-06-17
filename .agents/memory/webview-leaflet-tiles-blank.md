---
name: WebView Leaflet tiles blank on Android
description: overflow:hidden on a React Native View wrapping a WebView causes Leaflet map tiles to never render (dark blue blank) on Android — confirmed root cause.
---

## The Rule

Never put `overflow: "hidden"` (or `overflow: "scroll"`) on a React Native `View` that directly or indirectly contains a `WebView` on Android. This silently clips the GPU tile bitmap layers while leaving HTML text/vector content visible — so Leaflet initializes, its UI elements render, but all raster tiles stay invisible.

**Why:** Android renders WebView tile images as separate GPU compositor layers (bitmaps fetched from the network). React Native's `overflow: "hidden"` creates a clipping layer at the GPU level. These two mechanisms conflict: the clip applies to the WebView's tile bitmap layers but not to in-DOM HTML content (text, CSS backgrounds, SVG), so you see the map background color and overlays but zero tiles.

**How to apply:** Any screen embedding a WebView Leaflet map must follow the `StyleSheet.absoluteFill` pattern:

```tsx
{/* Map fills the screen — absoluteFill, NO overflow */}
<View style={StyleSheet.absoluteFill}>
  <MyMapView ... />
</View>

{/* Floating overlays — siblings with absoluteFill + pointerEvents */}
<View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>
  <FABButton ... />
  <SomePill ... />
</View>
```

Confirmed working reference: `artifacts/rkz/app/(tabs)/index.tsx` → `HeatmapMapView` uses exactly this pattern and tiles load correctly on Android.

Confirmed broken pattern: `artifacts/rkz/app/(tabs)/explore.tsx` (old) used `mapWrap: { flex:1, position:"relative", overflow:"hidden" }` as the WebView parent, causing tiles to stay blank while all HTML UI elements rendered correctly.
