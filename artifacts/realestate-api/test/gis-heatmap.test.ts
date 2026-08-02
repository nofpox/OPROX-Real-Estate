import { describe, it } from "node:test";
import assert from "node:assert/strict";

function validateBounds(n: number, s: number, e: number, w: number): boolean {
  if (isNaN(n) || isNaN(s) || isNaN(e) || isNaN(w)) return false;
  if (s > n || w > e || n > 90 || s < -90 || e > 180 || w < -180) return false;
  return true;
}

function computeClusterGrid(lat: number, lng: number, zoomLevel: number): string {
  const gridStep = zoomLevel <= 8 ? 0.5 : zoomLevel <= 11 ? 0.1 : 0.03;
  const gridLat = (Math.floor(lat / gridStep) * gridStep).toFixed(3);
  const gridLng = (Math.floor(lng / gridStep) * gridStep).toFixed(3);
  return `${gridLat}_${gridLng}`;
}

function calculateHeatmapWeight(metric: string, price: number, areaSqm: number, listingType: string): number {
  const ppm = areaSqm > 0 ? price / areaSqm : 0;
  let weight = 0.5;
  if (metric === "price_sqm") weight = Math.min(1.0, Math.max(0.1, ppm / 10000));
  else if (metric === "price") weight = Math.min(1.0, Math.max(0.1, price / 10000000));
  else if (metric === "density") weight = 0.7;
  else if (metric === "sale_rent") weight = listingType === "sale" ? 0.9 : 0.4;
  return Math.round(weight * 100) / 100;
}

function applyPrivacyPrecision(lat: number, lng: number, precision: "EXACT" | "APPROXIMATE" | "DISTRICT_ONLY") {
  if (precision === "EXACT") {
    return { lat, lng };
  }
  if (precision === "APPROXIMATE") {
    // Offset by ~300 meters
    return {
      lat: Math.round((lat + 0.002) * 1000) / 1000,
      lng: Math.round((lng + 0.002) * 1000) / 1000,
    };
  }
  // DISTRICT_ONLY (truncate to 2 decimals)
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

describe("OPROX Phase 5 GIS, Bounding Box & Heatmap Engine Tests", () => {
  it("should validate bounding box coordinates correctly", () => {
    assert.ok(validateBounds(25.0, 24.0, 47.0, 46.0));
    assert.equal(validateBounds(24.0, 25.0, 47.0, 46.0), false); // south > north
    assert.equal(validateBounds(95.0, 24.0, 47.0, 46.0), false); // north > 90
    assert.equal(validateBounds(NaN, 24.0, 47.0, 46.0), false); // NaN
  });

  it("should calculate heatmap weight for price per sqm metric accurately", () => {
    const w1 = calculateHeatmapWeight("price_sqm", 3000000, 500, "sale"); // 6000 SAR/m² -> 0.6
    assert.equal(w1, 0.6);

    const w2 = calculateHeatmapWeight("price_sqm", 15000000, 500, "sale"); // 30000 SAR/m² -> capped at 1.0
    assert.equal(w2, 1.0);
  });

  it("should assign listings to spatial grid clusters based on zoom level", () => {
    const key1 = computeClusterGrid(24.774, 46.633, 10);
    const key2 = computeClusterGrid(24.781, 46.639, 10);
    assert.equal(key1, key2); // Same grid cell at zoom level 10
  });

  it("should obscure location coordinates under privacy precision policies", () => {
    const exact = applyPrivacyPrecision(24.815234, 46.654312, "EXACT");
    assert.equal(exact.lat, 24.815234);

    const approx = applyPrivacyPrecision(24.815234, 46.654312, "APPROXIMATE");
    assert.notEqual(approx.lat, 24.815234);

    const distOnly = applyPrivacyPrecision(24.815234, 46.654312, "DISTRICT_ONLY");
    assert.equal(distOnly.lat, 24.82);
    assert.equal(distOnly.lng, 46.65);
  });
});
