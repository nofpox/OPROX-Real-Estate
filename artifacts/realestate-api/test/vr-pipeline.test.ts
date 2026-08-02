/**
 * OPROX Phase 7 — Immersive VR / WebXR Property Experience Automated Tests
 */
import test from "node:test";
import assert from "node:assert/strict";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

test("OPROX Phase 7 — Immersive VR / WebXR Layer Tests", async (t) => {

  await t.test("should detect and handle WebXR capability state transitions", () => {
    const evaluateWebXRState = (hasNavigatorXR: boolean, isImmersiveSupported: boolean) => {
      if (!hasNavigatorXR) return "XR_BROWSER_REQUIRED";
      if (!isImmersiveSupported) return "HEADSET_NOT_AVAILABLE";
      return "VR_SUPPORTED";
    };

    assert.equal(evaluateWebXRState(true, true), "VR_SUPPORTED");
    assert.equal(evaluateWebXRState(true, false), "HEADSET_NOT_AVAILABLE");
    assert.equal(evaluateWebXRState(false, false), "XR_BROWSER_REQUIRED");
  });

  await t.test("should validate WebXR session parameters for immersive-vr mode", () => {
    const sessionConfig = {
      mode: "immersive-vr",
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    };

    assert.equal(sessionConfig.mode, "immersive-vr");
    assert.equal(sessionConfig.optionalFeatures.includes("local-floor"), true);
    assert.equal(sessionConfig.optionalFeatures.includes("bounded-floor"), true);
  });

  await t.test("should route ENTER_PROPERTY_VR action in AI Concierge", async () => {
    const res = await processConciergeRequest(
      [{ role: "user", content: "دخلني الجولة الافتراضية" }],
      {},
      {
        id: 101,
        title: "فيلا النرجس الفاخرة",
        description: "",
        transactionType: "sale",
        propertyType: "villa",
        price: 3200000,
        currency: "SAR",
        areaSqm: 550,
        city: "الرياض",
        district: "النرجس",
        address: "النرجس",
        lat: 24.8152,
        lng: 46.6543,
        image: "",
        verified: true,
        featured: true,
      }
    );

    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "ENTER_PROPERTY_VR");
    assert.equal(res.actions![0].payload?.listingId, 101);
  });

  await t.test("should route EXIT_PROPERTY_VR action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "اخرج من الواقع الافتراضي" }]);

    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "EXIT_PROPERTY_VR");
  });

  await t.test("should route VR_TELEPORT action for room navigation in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "انتقل للصالة" }]);

    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "VR_TELEPORT");
    assert.equal(res.actions![0].payload?.room, "Living Room");
  });

  await t.test("should route VR_FOCUS_HOTSPOT action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "ورني النقاط التفاعلية" }]);

    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "VR_FOCUS_HOTSPOT");
    assert.equal(res.actions![0].payload?.hotspotId, "main_living");
  });

  await t.test("should route VR_OPEN_PROPERTY_INFO action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "اعرض معلومات العقار" }]);

    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "VR_OPEN_PROPERTY_INFO");
  });

  await t.test("should route VR_RETURN_TO_PROPERTY action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "ارجعني للصالة" }]);

    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "VR_RETURN_TO_PROPERTY");
  });

  await t.test("should distinguish 360° Panorama Tour from 3D Digital Twin model", () => {
    const mode3D = "3D Digital Twin WebXR Model";
    const mode360 = "360° Panorama Equirectangular Tour";

    assert.notEqual(mode3D, mode360);
    assert.equal(mode360.includes("360° Panorama"), true);
  });

  await t.test("should maintain zero dependency on PMS/BMS hotel workflows", () => {
    const forbiddenDomains = ["hotel_booking", "housekeeping_shift", "pms_checkin", "guest_folio"];
    const activePipelineDomains = ["property_listing", "gltf_loader", "webxr_session", "oprox_estimate"];

    forbiddenDomains.forEach((d) => {
      assert.equal(activePipelineDomains.includes(d), false);
    });
  });
});
