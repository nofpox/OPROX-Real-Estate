import { Router, type Request, type Response } from "express";
import { db, listingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  calculatePropertyEstimate,
  calculateInvestmentMetrics,
  generateInvestmentScenarios,
  getDistrictMarketSummary,
  type ValuationInput,
  type InvestmentInput,
} from "../lib/oprox-estimate-engine.js";

const router = Router();

// ── POST /api/valuation/estimate ──────────────────────────────────────────────
router.post("/estimate", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    let input: ValuationInput;

    if (body.listingId) {
      // Load listing details from DB
      try {
        const [listing] = await db
          .select()
          .from(listingsTable)
          .where(eq(listingsTable.id, Number(body.listingId)));

        if (listing) {
          input = {
            listingId: listing.id,
            propertyType: (listing.propertyType as any) ?? "villa",
            transactionType: (listing.listingType as any) ?? "sale",
            city: listing.city ?? "الرياض",
            district: listing.district ?? undefined,
            areaSqm: listing.areaSqm ? Number(listing.areaSqm) : 350,
            bedrooms: listing.bedrooms ?? undefined,
            bathrooms: listing.bathrooms ?? undefined,
            askingPrice: listing.price ? Number(listing.price) : undefined,
            lat: listing.lat ? Number(listing.lat) : undefined,
            lng: listing.lng ? Number(listing.lng) : undefined,
          };
        } else {
          input = body;
        }
      } catch {
        input = body;
      }
    } else {
      input = body;
    }

    const result = await calculatePropertyEstimate(input);
    res.json(result);
  } catch (err) {
    req.log?.error({ err }, "POST /api/valuation/estimate failed");
    res.status(500).json({ error: "Failed to calculate valuation estimate" });
  }
});

// ── POST /api/valuation/investment ───────────────────────────────────────────
router.post("/investment", async (req: Request, res: Response) => {
  try {
    const input = (req.body ?? {}) as InvestmentInput;
    const metrics = calculateInvestmentMetrics(input);
    const scenarios = generateInvestmentScenarios(input.purchasePrice, input.expectedMonthlyRent);

    res.json({
      metrics,
      scenarios,
    });
  } catch (err) {
    req.log?.error({ err }, "POST /api/valuation/investment failed");
    res.status(500).json({ error: "Failed to calculate investment metrics" });
  }
});

// ── GET /api/valuation/district-summary ──────────────────────────────────────
router.get("/district-summary", async (req: Request, res: Response) => {
  try {
    const city = (req.query.city as string) || "الرياض";
    const district = req.query.district as string | undefined;

    const summary = await getDistrictMarketSummary(city, district);
    res.json(summary);
  } catch (err) {
    req.log?.error({ err }, "GET /api/valuation/district-summary failed");
    res.status(500).json({ error: "Failed to retrieve district summary" });
  }
});

export default router;
