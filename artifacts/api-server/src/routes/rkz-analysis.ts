import { Router } from "express";
import { isAiHalted } from "./aiGovernance.js";
import { resolveAiClient, resolveAiModel } from "../lib/ai-provider.js";
import { db, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const SYSTEM_PROMPT = `You are the Rozoz Real Estate Analysis Engine. Do not initiate chat. Process input data and return a JSON object with exactly these three keys: eligibility_score (integer 0–100 representing buyer financial readiness), recommended_payment_method (one of: cash, mortgage, installment, lease_to_own), reasoning_summary (2–3 concise professional sentences explaining the score and recommendation, in the same language as the user input). Tone: Professional, premium, concise. Return only valid JSON — no prose, no markdown.`;

function extractJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch { return {}; }
}

async function isAnalysisKillswitchActive(): Promise<boolean> {
  try {
    const rows = await db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(and(eq(settingsTable.tenantId, 1), eq(settingsTable.key, "rkz_analysis_killswitch")))
      .limit(1);
    return rows[0]?.value === "true";
  } catch {
    return false;
  }
}

// POST /rkz/analysis
// Public — called from the Rozoz Expo app (no PMS session required)
router.post("/rkz/analysis", async (req, res) => {
  try {
    if (await isAiHalted(1)) {
      res.status(423).json({ killswitch: true, error: "AI_HALTED" });
      return;
    }
    if (await isAnalysisKillswitchActive()) {
      res.status(423).json({ killswitch: true, error: "ANALYSIS_DISABLED" });
      return;
    }

    const {
      income,
      budget,
      paymentPreference,
      propertyType,
      city,
      existingCommitments,
    } = req.body as {
      income?: number;
      budget?: number;
      paymentPreference?: string;
      propertyType?: string;
      city?: string;
      existingCommitments?: number;
    };

    if (!income || !budget || income <= 0 || budget <= 0) {
      res.status(400).json({ error: "income and budget are required and must be positive" });
      return;
    }

    const lines = [
      `Monthly Income: SAR ${income}`,
      `Max Property Budget: SAR ${budget}`,
      `Existing Monthly Commitments: SAR ${existingCommitments ?? 0}`,
      propertyType ? `Property Type Preferred: ${propertyType}` : null,
      city ? `Preferred Location: ${city}` : null,
      paymentPreference ? `Preferred Payment Method: ${paymentPreference}` : null,
    ].filter(Boolean);

    const userPrompt = lines.join("\n");

    const ai = await resolveAiClient(1);
    const model = await resolveAiModel(1, "gpt-5-mini");

    const completion = await ai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJson(raw);

    const eligibility_score = typeof parsed.eligibility_score === "number"
      ? Math.max(0, Math.min(100, Math.round(parsed.eligibility_score)))
      : 0;

    const VALID_METHODS = ["cash", "mortgage", "installment", "lease_to_own"];
    const recommended_payment_method =
      typeof parsed.recommended_payment_method === "string" && VALID_METHODS.includes(parsed.recommended_payment_method)
        ? parsed.recommended_payment_method
        : "mortgage";

    const reasoning_summary = typeof parsed.reasoning_summary === "string"
      ? parsed.reasoning_summary.trim()
      : "";

    res.json({ eligibility_score, recommended_payment_method, reasoning_summary });
  } catch (err) {
    req.log.error({ err }, "[rkz-analysis] analysis failed");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

// GET /rkz/analysis-killswitch — read current kill-switch state
router.get("/rkz/analysis-killswitch", async (req, res) => {
  const enabled = await isAnalysisKillswitchActive();
  res.json({ enabled });
});

// POST /rkz/analysis-killswitch — toggle kill-switch (protected in admin panel by PIN)
router.post("/rkz/analysis-killswitch", async (req, res) => {
  const { enabled } = req.body as { enabled: boolean };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) is required" });
    return;
  }
  try {
    await db
      .insert(settingsTable)
      .values({ tenantId: 1, key: "rkz_analysis_killswitch", value: String(enabled) })
      .onConflictDoUpdate({
        target: [settingsTable.tenantId, settingsTable.key],
        set: { value: String(enabled) },
      });
    req.log.info({ enabled }, "[rkz-analysis] killswitch updated");
    res.json({ ok: true, enabled });
  } catch (err) {
    req.log.error({ err }, "[rkz-analysis] killswitch update failed");
    res.status(500).json({ error: "Failed to update killswitch" });
  }
});

export default router;
