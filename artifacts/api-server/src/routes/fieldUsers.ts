import { Router } from "express";

const router = Router();

const gone = (_req: import("express").Request, res: import("express").Response): void => {
  res.status(410).json({
    error: "DEPRECATED",
    message: "The /field-users module has been removed. Field workers are now managed via /staff.",
  });
};

router.get("/field-users",      gone);
router.post("/field-users",     gone);
router.patch("/field-users/:id", gone);
router.delete("/field-users/:id", gone);

export default router;
