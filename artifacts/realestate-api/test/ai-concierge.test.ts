import assert from "node:assert";
import test, { describe } from "node:test";
import {
  parseIntentFromText,
  rankListings,
  generatePropertyComparison,
  processConciergeRequest,
  type GroundedListing,
  type SearchCriteria,
} from "../src/lib/ai-concierge-engine.js";

describe("OPROX AI Concierge — Intent Extraction & Criteria Parsing", () => {
  test("Extracts structured criteria from complex Arabic natural language request", () => {
    const text = "أبي فيلا حديثة شمال الرياض، ميزانيتي ما تتجاوز 3 مليون، أبي 4 غرف أو أكثر ويفضل فيها مسبح.";
    const criteria = parseIntentFromText(text);

    assert.strictEqual(criteria.propertyType, "villa");
    assert.strictEqual(criteria.city, "الرياض");
    assert.strictEqual(criteria.locationPreference, "شمال الرياض");
    assert.strictEqual(criteria.maxPrice, 3000000);
    assert.strictEqual(criteria.bedrooms, 4);
    assert.ok(criteria.amenities?.includes("pool"));
  });

  test("Extracts criteria from English natural language input", () => {
    const text = "Looking for a luxury apartment in Jeddah for rent under 50k SAR";
    const criteria = parseIntentFromText(text);

    assert.strictEqual(criteria.propertyType, "apartment");
    assert.strictEqual(criteria.city, "جدة");
    assert.strictEqual(criteria.transactionType, "rent");
    assert.strictEqual(criteria.maxPrice, 50000);
  });

  test("Multi-turn memory: incrementally updates budget and location", () => {
    const turn1Text = "أبي فيلا في الرياض ميزانيتي 3 مليون";
    const turn1Criteria = parseIntentFromText(turn1Text);

    const turn2Text = "ارفع الميزانية لـ 3.5 مليون وخليها شمال الرياض بـ 5 غرف";
    const turn2Criteria = parseIntentFromText(turn2Text, turn1Criteria);

    assert.strictEqual(turn2Criteria.propertyType, "villa");
    assert.strictEqual(turn2Criteria.city, "الرياض");
    assert.strictEqual(turn2Criteria.maxPrice, 3500000);
    assert.strictEqual(turn2Criteria.locationPreference, "شمال الرياض");
    assert.strictEqual(turn2Criteria.bedrooms, 5);
  });
});

describe("OPROX AI Concierge — Ranking Algorithm & Grounding", () => {
  test("Ranks verified listings within budget higher than over-budget listings", () => {
    const criteria: SearchCriteria = {
      propertyType: "villa",
      city: "الرياض",
      maxPrice: 3000000,
      bedrooms: 4,
    };

    const mockListings: GroundedListing[] = [
      {
        id: 1,
        title: "فيلا فوق الميزانية",
        description: "",
        transactionType: "sale",
        propertyType: "villa",
        price: 4500000,
        currency: "SAR",
        areaSqm: 500,
        bedrooms: 5,
        city: "الرياض",
        district: "حطين",
        address: "الرياض",
        lat: 24.7,
        lng: 46.6,
        image: "",
        verified: true,
        featured: false,
      },
      {
        id: 2,
        title: "فيلا داخل الميزانية وموثقة",
        description: "",
        transactionType: "sale",
        propertyType: "villa",
        price: 2800000,
        currency: "SAR",
        areaSqm: 450,
        bedrooms: 4,
        city: "الرياض",
        district: "النرجس",
        address: "الرياض",
        lat: 24.7,
        lng: 46.6,
        image: "",
        verified: true,
        featured: true,
      },
    ];

    const ranked = rankListings(mockListings, criteria);
    assert.strictEqual(ranked[0].id, 2);
    assert.ok((ranked[0].rankingScore ?? 0) > (ranked[1].rankingScore ?? 0));
  });
});

describe("OPROX AI Concierge — Side-by-Side Property Comparison", () => {
  test("Generates side-by-side comparison summary with price per sqm", () => {
    const properties: GroundedListing[] = [
      {
        id: 101,
        title: "فيلا حي النرجس",
        description: "",
        transactionType: "sale",
        propertyType: "villa",
        price: 2850000,
        currency: "SAR",
        pricePerSqm: 4385,
        areaSqm: 650,
        bedrooms: 5,
        city: "الرياض",
        district: "النرجس",
        address: "",
        lat: 24.7,
        lng: 46.6,
        image: "",
        verified: true,
        featured: true,
      },
      {
        id: 102,
        title: "فيلا حي الملقا",
        description: "",
        transactionType: "sale",
        propertyType: "villa",
        price: 3200000,
        currency: "SAR",
        pricePerSqm: 4571,
        areaSqm: 700,
        bedrooms: 6,
        city: "الرياض",
        district: "الملقا",
        address: "",
        lat: 24.8,
        lng: 46.6,
        image: "",
        verified: true,
        featured: false,
      },
    ];

    const comparison = generatePropertyComparison(properties);

    assert.ok(comparison.summaryAr.includes("مقارنة شاملة بين العقارين"));
    assert.ok(comparison.summaryAr.includes("سعر المتر المربع"));
    assert.strictEqual(comparison.properties.length, 2);
  });
});

describe("OPROX AI Concierge — End-to-End Orchestration Process", () => {
  test("Processes search request and returns grounded marketplace inventory", async () => {
    const res = await processConciergeRequest([
      { role: "user", content: "أبي فيلا في الرياض بـ 3 مليون 4 غرف" },
    ]);

    assert.ok(res.reply.length > 0);
    assert.ok(res.listings && res.listings.length > 0);
    assert.strictEqual(res.criteria?.propertyType, "villa");
    assert.strictEqual(res.criteria?.maxPrice, 3000000);
  });

  test("Detects seller publishing intent and offers listing wizard action", async () => {
    const res = await processConciergeRequest([
      { role: "user", content: "أبي أبيع أرض عندي في الرياض" },
    ]);

    assert.ok(res.reply.includes("عرض ونشر عقارك"));
    assert.strictEqual(res.actions?.[0].action, "PUBLISH_LISTING_INTENT");
  });
});
