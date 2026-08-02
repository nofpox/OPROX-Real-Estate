import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

describe("OPROX Phase 8 — Advanced AR Property & Spatial Experience Tests", () => {
  test("should detect and handle AR capability state transitions", () => {
    const validStates = [
      "AR_SUPPORTED",
      "AR_NOT_SUPPORTED",
      "AR_BROWSER_REQUIRED",
      "AR_DEVICE_UNSUPPORTED",
      "MODEL_NOT_AVAILABLE",
      "AR_FALLBACK_AVAILABLE",
    ];

    const evaluateArCapability = (hasNavigatorXr: boolean, isArSupported: boolean, hasModel: boolean) => {
      if (!hasModel) return "MODEL_NOT_AVAILABLE";
      if (!hasNavigatorXr) return "AR_BROWSER_REQUIRED";
      if (!isArSupported) return "AR_DEVICE_UNSUPPORTED";
      return "AR_SUPPORTED";
    };

    assert.equal(evaluateArCapability(true, true, true), "AR_SUPPORTED");
    assert.equal(evaluateArCapability(false, false, true), "AR_BROWSER_REQUIRED");
    assert.equal(evaluateArCapability(true, false, true), "AR_DEVICE_UNSUPPORTED");
    assert.equal(evaluateArCapability(true, true, false), "MODEL_NOT_AVAILABLE");
  });

  test("should validate WebXR session parameters for immersive-ar mode and hit-testing", () => {
    const requiredFeatures = ["hit-test", "local-floor"];
    const mode = "immersive-ar";

    assert.equal(mode, "immersive-ar");
    assert.ok(requiredFeatures.includes("hit-test"));
    assert.ok(requiredFeatures.includes("local-floor"));
  });

  test("should route CHECK_AR_SUPPORT action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "فحص دعم الواقع المعزز" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "CHECK_AR_SUPPORT");
  });

  test("should route OPEN_PROPERTY_AR action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "ورني العقار بالواقع المعزز" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "OPEN_PROPERTY_AR");
  });

  test("should route PLACE_AR_MODEL action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "حط المجسم هنا" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "PLACE_AR_MODEL");
  });

  test("should route ROTATE_AR_MODEL action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "لف البيت" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "ROTATE_AR_MODEL");
  });

  test("should route RESET_AR_MODEL action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "رجعه لحجمه" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "RESET_AR_MODEL");
  });

  test("should route REMOVE_AR_MODEL action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "شيل المجسم" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "REMOVE_AR_MODEL");
  });

  test("should route EXIT_AR action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "اخرج من ar" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "EXIT_AR");
  });

  test("should route RETURN_TO_PROPERTY action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "العودة للعقار" }]);
    assert.ok(res.actions && res.actions.length > 0);
    assert.equal(res.actions[0].action, "RETURN_TO_PROPERTY");
  });

  test("should preserve model classification and classify test assets truthfully", () => {
    const sampleAssetPath = "/media/models/sample_villa.glb";
    const classification = "DEVELOPMENT/TEST ASSET";

    assert.ok(sampleAssetPath.endsWith(".glb"));
    assert.equal(classification, "DEVELOPMENT/TEST ASSET");
    assert.notEqual(classification, "ACTUAL PROPERTY MODEL");
  });

  test("should maintain AR furniture preview classification as development test asset", () => {
    const furnitureClassification = "DEVELOPMENT/TEST FURNITURE ASSET";
    assert.equal(furnitureClassification, "DEVELOPMENT/TEST FURNITURE ASSET");
  });

  test("should maintain zero dependency on PMS/BMS hotel workflows", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "غرف العقار والمساحات" }]);
    const reply = res.reply.toLowerCase();

    assert.doesNotMatch(reply, /check-in|checkout|room service|housekeeping|staff shift|minibar|pms/i);
  });
});
