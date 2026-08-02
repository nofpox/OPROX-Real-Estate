import { Router, type Request, type Response } from "express";
import {
  parseBriefFromText,
  generateArchitectConcept,
  generateConceptOptions,
  reviseArchitectConcept,
  generateHandoffPackage,
  create3DGenerationJob,
  ARCHITECTURAL_STYLES,
  type ArchitecturalBrief,
  type PropertyContext,
  type ArchitecturalConcept,
  type ConceptVersionRecord,
} from "../lib/architect-engine.js";

const router = Router();

// ── GET /styles ───────────────────────────────────────────────────────────────
router.get("/styles", (_req: Request, res: Response) => {
  res.json({ styles: ARCHITECTURAL_STYLES });
});

// ── POST /brief/parse ─────────────────────────────────────────────────────────
router.post("/brief/parse", (req: Request, res: Response) => {
  try {
    const { text, context } = req.body as { text?: string; context?: PropertyContext };
    const brief = parseBriefFromText(text || "", context || {});
    res.json({ brief });
  } catch (err) {
    req.log?.error({ err }, "POST /brief/parse failed");
    res.status(500).json({ error: "Failed to parse architectural brief" });
  }
});

// ── POST /concept/generate ────────────────────────────────────────────────────
router.post("/concept/generate", (req: Request, res: Response) => {
  try {
    const { brief, context, variant } = req.body as {
      brief: ArchitecturalBrief;
      context?: PropertyContext;
      variant?: "A" | "B" | "C";
    };
    if (!brief) {
      res.status(400).json({ error: "brief object is required" });
      return;
    }
    const concept = generateArchitectConcept(brief, context || {}, variant || "A");
    res.json({ concept });
  } catch (err) {
    req.log?.error({ err }, "POST /concept/generate failed");
    res.status(500).json({ error: "Failed to generate architectural concept" });
  }
});

// ── POST /concept/options ─────────────────────────────────────────────────────
router.post("/concept/options", (req: Request, res: Response) => {
  try {
    const { brief, context } = req.body as {
      brief: ArchitecturalBrief;
      context?: PropertyContext;
    };
    if (!brief) {
      res.status(400).json({ error: "brief object is required" });
      return;
    }
    const options = generateConceptOptions(brief, context || {});
    res.json(options);
  } catch (err) {
    req.log?.error({ err }, "POST /concept/options failed");
    res.status(500).json({ error: "Failed to generate concept options" });
  }
});

// ── POST /concept/revise ──────────────────────────────────────────────────────
router.post("/concept/revise", (req: Request, res: Response) => {
  try {
    const { existingConcept, userPrompt } = req.body as {
      existingConcept: ArchitecturalConcept;
      userPrompt: string;
    };
    if (!existingConcept || !userPrompt) {
      res.status(400).json({ error: "existingConcept and userPrompt are required" });
      return;
    }
    const revisedConcept = reviseArchitectConcept(existingConcept, userPrompt);
    res.json({ concept: revisedConcept });
  } catch (err) {
    req.log?.error({ err }, "POST /concept/revise failed");
    res.status(500).json({ error: "Failed to revise architectural concept" });
  }
});

// ── POST /concept/3d ──────────────────────────────────────────────────────────
router.post("/concept/3d", (req: Request, res: Response) => {
  try {
    const { projectId, concept } = req.body as {
      projectId?: number;
      concept: ArchitecturalConcept;
    };
    if (!concept) {
      res.status(400).json({ error: "concept object is required" });
      return;
    }
    const tripoKeyAvailable = !!(process.env.TRIPO3D_API_KEY || process.env.TRIPO_KEY);
    const job = create3DGenerationJob(projectId || 1, concept, tripoKeyAvailable);
    res.json({ job });
  } catch (err) {
    req.log?.error({ err }, "POST /concept/3d failed");
    res.status(500).json({ error: "Failed to initiate 3D concept job" });
  }
});

// ── POST /concept/export ──────────────────────────────────────────────────────
router.post("/concept/export", (req: Request, res: Response) => {
  try {
    const { brief, concept, versionsHistory, context } = req.body as {
      brief: ArchitecturalBrief;
      concept: ArchitecturalConcept;
      versionsHistory?: ConceptVersionRecord[];
      context?: PropertyContext;
    };
    if (!brief || !concept) {
      res.status(400).json({ error: "brief and concept objects are required" });
      return;
    }
    const pkg = generateHandoffPackage(brief, concept, versionsHistory || [], context || {});
    res.json({ package: pkg });
  } catch (err) {
    req.log?.error({ err }, "POST /concept/export failed");
    res.status(500).json({ error: "Failed to generate professional handoff package" });
  }
});

export default router;
