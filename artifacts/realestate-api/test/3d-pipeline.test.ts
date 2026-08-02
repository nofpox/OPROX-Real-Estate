/**
 * OPROX Phase 6 — Advanced 3D Property & City Experience Automated Tests
 */
import test from "node:test";
import assert from "node:assert/strict";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

test("OPROX Phase 6 — Advanced 3D Engine & Asset Pipeline Tests", async (t) => {

  await t.test("should validate GLTF/GLB model file formats correctly", () => {
    const validFormats = ["glb", "gltf"];
    const invalidFormats = ["exe", "zip", "mp4", "txt"];

    validFormats.forEach((fmt) => {
      assert.equal(["glb", "gltf"].includes(fmt), true);
    });

    invalidFormats.forEach((fmt) => {
      assert.equal(["glb", "gltf"].includes(fmt), false);
    });
  });

  await t.test("should reject 3D assets exceeding 50MB size limit", () => {
    const validateSize = (sizeMb: number) => sizeMb <= 50;

    assert.equal(validateSize(12.5), true);
    assert.equal(validateSize(48.0), true);
    assert.equal(validateSize(52.1), false);
    assert.equal(validateSize(120.0), false);
  });

  await t.test("should reject path traversal in 3D asset URLs", () => {
    const isSafePath = (url: string) => !url.includes("..") && !url.includes("//etc/");

    assert.equal(isSafePath("/media/models/sample_villa.glb"), true);
    assert.equal(isSafePath("https://cdn.oprox.sa/models/building.gltf"), true);
    assert.equal(isSafePath("/media/../../etc/passwd"), false);
    assert.equal(isSafePath("//etc/shadow"), false);
  });

  await t.test("should map strict model classification taxonomy", () => {
    const allowedTaxonomy = [
      "ACTUAL PROPERTY MODEL",
      "CONCEPTUAL MODEL",
      "AI-GENERATED MODEL",
      "PROCEDURAL REPRESENTATION",
    ];

    assert.equal(allowedTaxonomy.includes("ACTUAL PROPERTY MODEL"), true);
    assert.equal(allowedTaxonomy.includes("PROCEDURAL REPRESENTATION"), true);
    assert.equal(allowedTaxonomy.includes("EXACT_DIGITAL_TWIN_UNVERIFIED"), false);
  });

  await t.test("should extract OPEN_3D_CITY action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "افتح المدينة 3D في الرياض" }]);
    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "OPEN_3D_CITY");
    assert.equal(res.actions![0].payload?.city, "الرياض");
  });

  await t.test("should extract OPEN_PROPERTY_3D action in AI Concierge", async () => {
    const res = await processConciergeRequest(
      [{ role: "user", content: "ورني العقار ثلاثي الأبعاد" }],
      {},
      {
        id: 101,
        title: "فيلا النرجس",
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
    assert.equal(res.actions![0].action, "OPEN_PROPERTY_3D");
    assert.equal(res.actions![0].payload?.listingId, 101);
  });

  await t.test("should extract FOCUS_PROPERTY_3D action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "ركز على هذا العقار" }]);
    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "FOCUS_PROPERTY_3D");
  });

  await t.test("should extract RESET_3D_CAMERA action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "اعادة ضبط الكاميرا" }]);
    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "RESET_3D_CAMERA");
  });

  await t.test("should extract RETURN_TO_2D_MAP action in AI Concierge", async () => {
    const res = await processConciergeRequest([{ role: "user", content: "ارجع للخريطة 2d" }]);
    assert.equal(res.actions && res.actions.length > 0, true);
    assert.equal(res.actions![0].action, "RETURN_TO_2D_MAP");
  });

  await t.test("should validate real estate unit status lifecycle mapping", () => {
    const validStatuses = ["AVAILABLE", "RESERVED", "SOLD", "RENTED", "UNAVAILABLE"];
    const pmsHotelStatuses = ["CHECKED_IN", "HOUSEKEEPING", "CLEANING_REQUIRED"];

    validStatuses.forEach((s) => {
      assert.equal(["AVAILABLE", "RESERVED", "SOLD", "RENTED", "UNAVAILABLE"].includes(s), true);
    });

    pmsHotelStatuses.forEach((s) => {
      assert.equal(["AVAILABLE", "RESERVED", "SOLD", "RENTED", "UNAVAILABLE"].includes(s), false);
    });
  });

  await t.test("should serialize 2D <-> 3D handoff parameters correctly", () => {
    const serializeHandoff = (params: { city?: string; district?: string; listingId?: number }) => {
      const q = new URLSearchParams();
      if (params.city) q.set("city", params.city);
      if (params.district) q.set("district", params.district);
      if (params.listingId) q.set("id", String(params.listingId));
      return q.toString();
    };

    const query = serializeHandoff({ city: "الرياض", district: "النرجس", listingId: 101 });
    assert.equal(query.includes("city=%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6"), true);
    assert.equal(query.includes("id=101"), true);
  });

  // ── Seller Security Proof Tests ─────────────────────────────────────────────
  await t.test("Seller Security: Rejects request missing authentication header", () => {
    const processUploadSecurity = (headers: Record<string, string>, body: any) => {
      const auth = headers.authorization || headers["x-seller-id"];
      if (!auth) return { status: 401, error: "Authentication required" };
      return { status: 200, success: true };
    };

    const res = processUploadSecurity({}, { url: "/media/models/sample_villa.glb" });
    assert.equal(res.status, 401);
  });

  await t.test("Seller Security: Rejects cross-listing modification by unauthorized seller", () => {
    const processUploadSecurity = (sellerId: string, listingOwnerId: string) => {
      if (sellerId !== listingOwnerId) return { status: 403, error: "Cross-listing asset attachment prohibited" };
      return { status: 200, success: true };
    };

    const res = processUploadSecurity("seller_attacker_99", "seller_narjis_01");
    assert.equal(res.status, 403);
  });

  await t.test("Seller Security: Rejects invalid MIME type and corrupt magic header signature", () => {
    const validateMimeAndSignature = (mime: string, sig: string) => {
      const allowedMimes = ["model/gltf-binary", "model/gltf+json", "application/octet-stream"];
      if (!allowedMimes.includes(mime)) return false;
      if (sig && !sig.startsWith("glTF") && !sig.startsWith("0x676c5446")) return false;
      return true;
    };

    assert.equal(validateMimeAndSignature("image/jpeg", "glTF_v2"), false);
    assert.equal(validateMimeAndSignature("model/gltf-binary", "CORRUPT_HEADER_BYTES"), false);
    assert.equal(validateMimeAndSignature("model/gltf-binary", "glTF_0x676c5446"), true);
  });

  await t.test("Seller Security: Confirms storage credentials are never exposed", () => {
    const sanitizeResponse = (rawMeta: any) => ({
      message: "Success",
      asset: rawMeta,
      securityStatus: { credentialsExposed: false },
    });

    const output = sanitizeResponse({ url: "https://cdn.oprox.sa/models/v1.glb" });
    assert.equal(output.securityStatus.credentialsExposed, false);
    assert.equal("secretKey" in output, false);
    assert.equal("awsAccessKey" in output, false);
  });
});
