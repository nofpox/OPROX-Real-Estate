import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { sessions, getRoleTier } from "./auth.js";
import healthRouter from "./health";
import roomsRouter from "./rooms";
import bookingsRouter from "./bookings";
import statsRouter from "./stats";
import guestsRouter from "./guests";
import propertiesRouter from "./properties";
import expensesRouter from "./expenses";
import workOrdersRouter from "./workOrders";
import staffRouter from "./staff";
import tasksRouter from "./tasks";
import notificationsRouter from "./notifications";
import shiftsRouter from "./shifts";
import authRouter from "./auth";
import usersRouter from "./users";
import guestRouter from "./guest";
import unitFinancialsRouter from "./unitFinancials";
import activityLogsRouter from "./activityLogs";
import maintenanceRequestsRouter from "./maintenanceRequests";
import settingsRouter from "./settings";
import fieldUsersRouter from "./fieldUsers";
import customFieldsRouter from "./customFields";
import storageRouter from "./storage";

const TIER_LEVEL: Record<"admin" | "supervisor" | "worker", number> = {
  worker: 0, supervisor: 1, admin: 2,
};

// Paths that are public (no session required)
const PUBLIC_PREFIXES = ["/auth/", "/health"];

// Paths that require admin tier (owner only)
const ADMIN_PREFIXES = ["/expenses", "/unit-financials", "/settings"];

// Paths that require supervisor tier (manager+)
const SUPERVISOR_PREFIXES = [
  "/users", "/activity-logs", "/staff", "/properties", "/rooms",
  "/bookings", "/stats", "/guests", "/work-orders", "/shifts",
  "/maintenance-requests", "/field-users", "/admin/",
];

function tierGate(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Public routes bypass auth entirely
  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p) || path === p.replace(/\/$/, ""))) {
    next(); return;
  }

  // All other routes require a valid session
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) {
    res.status(401).json({ error: "Not authenticated" }); return;
  }

  const tier = getRoleTier(session.role);
  const level = TIER_LEVEL[tier];

  // Check admin-only paths
  if (ADMIN_PREFIXES.some((p) => path.startsWith(p))) {
    if (level < TIER_LEVEL.admin) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  // Check supervisor+ paths
  if (SUPERVISOR_PREFIXES.some((p) => path.startsWith(p))) {
    if (level < TIER_LEVEL.supervisor) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  // Attach session for downstream handlers
  (req as any).sessionUser = session;
  next();
}

const router: IRouter = Router();

// Single path-aware gate — must be first
router.use(tierGate);

// All routers — no per-router middleware needed; tierGate handles access control
router.use(authRouter);
router.use(healthRouter);
router.use(expensesRouter);
router.use(unitFinancialsRouter);
router.use(settingsRouter);
router.use(usersRouter);
router.use(activityLogsRouter);
router.use(staffRouter);
router.use(propertiesRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(statsRouter);
router.use(guestsRouter);
router.use(workOrdersRouter);
router.use(shiftsRouter);
router.use(maintenanceRequestsRouter);
router.use(fieldUsersRouter);
router.use(customFieldsRouter);
router.use(tasksRouter);
router.use(notificationsRouter);
router.use(storageRouter);
router.use(guestRouter);

export default router;
