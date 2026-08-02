import { Router, type Request, type Response } from "express";
import {
  INTERIOR_STYLES,
  parseInteriorBriefFromText,
  generateInteriorConcept,
  generateInteriorOptions,
  reviseInteriorConcept,
  validateFurnitureGeometry,
  createInteriorProject,
  getInteriorProject,
  attachConceptToInteriorProject,
  restoreInteriorConceptVersion,
  generateVirtualStaging,
  createInteriorGenerationJob,
  generateInteriorHandoffPackage,
  type InteriorBrief,
  type InteriorConcept,
  type VirtualStagingRequest,
} from "../lib/interior-engine.js";

const router = Router();

// ── GET /styles ───────────────────────────────────────────────────────────────
router.get("/styles", (_req: Request, res: Response) => {
  res.json({ styles: INTERIOR_STYLES });
});

// ── POST /brief/parse ─────────────────────────────────────────────────────────
router.post("/brief/parse", (req: Request, res: Response) => {
  try {
    const { text, context } = req.body as { text?: string; context?: any };
    const brief = parseInteriorBriefFromText(text || "", context || {});
    res.json({ brief });
  } catch (err) {
    req.log?.error({ err }, "POST /api/interior/brief/parse failed");
    res.status(500).json({ error: "Failed to parse interior design brief" });
  }
});

// ── POST /concept/generate ────────────────────────────────────────────────────
router.post("/concept/generate", (req: Request, res: Response) => {
  try {
    const { brief, context, variant } = req.body as {
      brief: InteriorBrief;
      context?: any;
      variant?: "A" | "B" | "C";
    };
    if (!brief) {
      res.status(400).json({ error: "brief object is required" });
      return;
    }
    const concept = generateInteriorConcept(brief, context || {}, variant || "A");
    res.json({ concept });
  } catch (err) {
    req.log?.error({ err }, "POST /api/interior/concept/generate failed");
    res.status(500).json({ error: "Failed to generate interior concept" });
  }
});

// ── POST /concept/options ─────────────────────────────────────────────────────
router.post("/concept/options", (req: Request, res: Response) => {
  try {
    const { brief, context } = req.body as {
      brief: InteriorBrief;
      context?: any;
    };
    if (!brief) {
      res.status(400).json({ error: "brief object is required" });
      return;
    }
    const options = generateInteriorOptions(brief, context || {});
    res.json(options);
  } catch (err) {
    req.log?.error({ err }, "POST /api/interior/concept/options failed");
    res.status(500).json({ error: "Failed to generate interior concept options" });
  }
});

// ── POST /concept/revise ──────────────────────────────────────────────────────
router.post("/concept/revise", (req: Request, res: Response) => {
  try {
    const { existingConcept, userPrompt } = req.body as {
      existingConcept: InteriorConcept;
      userPrompt: string;
    };
    if (!existingConcept || !userPrompt) {
      res.status(400).json({ error: "existingConcept and userPrompt are required" });
      return;
    }
    const revisedConcept = reviseInteriorConcept(existingConcept, userPrompt);
    res.json({ concept: revisedConcept });
  } catch (err) {
    req.log?.error({ err }, "POST /api/interior/concept/revise failed");
    res.status(500).json({ error: "Failed to revise interior concept" });
  }
});

// ── POST /staging/generate ────────────────────────────────────────────────────
router.post("/staging/generate", (req: Request, res: Response) => {
  try {
    const stagingReq = req.body as VirtualStagingRequest;
    if (!stagingReq || !stagingReq.roomType) {
      res.status(400).json({ error: "roomType is required for virtual staging" });
      return;
    }
    const result = generateVirtualStaging(stagingReq);
    res.json(result);
  } catch (err) {
    req.log?.error({ err }, "POST /api/interior/staging/generate failed");
    res.status(500).json({ error: "Failed to generate virtual staging" });
  }
});

// ── POST /projects ────────────────────────────────────────────────────────────
router.post("/projects", (req: Request, res: Response) => {
  try {
    const { tenantId, userId, title, roomType, propertyId, architectProjectId, dimensions } = req.body;
    if (!title || !roomType) {
      res.status(400).json({ error: "title and roomType are required" });
      return;
    }
    const secCtx = { tenantId: tenantId || 1, userId: userId || "usr_default" };
    const proj = createInteriorProject(secCtx, { title, roomType, propertyId, architectProjectId, dimensions });
    res.json({ project: proj });
  } catch (err: any) {
    req.log?.error({ err }, "POST /api/interior/projects failed");
    if (err.message.includes("PERSISTENCE_ERROR")) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to create interior project" });
  }
});

// ── GET /projects/:id ─────────────────────────────────────────────────────────
router.get("/projects/:id", (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const tenantId = parseInt(req.query.tenantId as string, 10) || 1;
    const userId = (req.query.userId as string) || "usr_default";

    const proj = getInteriorProject(projectId, { tenantId, userId });
    res.json({ project: proj });
  } catch (err: any) {
    req.log?.error({ err }, "GET /api/interior/projects/:id failed");
    if (err.message.includes("FORBIDDEN")) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err.message.includes("NOT_FOUND")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to fetch interior project" });
  }
});

// ── POST /projects/:id/concept ───────────────────────────────────────────────
router.post("/projects/:id/concept", (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { tenantId, userId, concept } = req.body;
    if (!concept) {
      res.status(400).json({ error: "concept is required" });
      return;
    }
    const secCtx = { tenantId: tenantId || 1, userId: userId || "usr_default" };
    const proj = attachConceptToInteriorProject(projectId, concept, secCtx);
    res.json({ project: proj });
  } catch (err: any) {
    req.log?.error({ err }, "POST /api/interior/projects/:id/concept failed");
    if (err.message.includes("FORBIDDEN")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to attach concept to interior project" });
  }
});

// ── POST /projects/:id/concept/:conceptId/restore/:version ──────────────────
router.post("/projects/:id/concept/:conceptId/restore/:version", (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const conceptId = req.params.conceptId;
    const versionNum = parseInt(req.params.version, 10);
    const { tenantId, userId } = req.body;

    const secCtx = { tenantId: tenantId || 1, userId: userId || "usr_default" };
    const restored = restoreInteriorConceptVersion(projectId, conceptId, versionNum, secCtx);
    res.json({ concept: restored });
  } catch (err: any) {
    req.log?.error({ err }, "POST restore concept version failed");
    if (err.message.includes("FORBIDDEN")) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err.message.includes("NOT_FOUND")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to restore concept version" });
  }
});

export default router;
