import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger.js";
import { sessions, getRoleTier } from "./auth.js";
import { suspendedTenants, loadSuspendedTenants } from "../tenant-status.js";
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
import unitRequestsRouter from "./unitRequests";
import superAdminRouter from "./super-admin";
import supportTicketsRouter from "./support-tickets";
import serviceCategoriesRouter from "./serviceCategories";

const TIER_LEVEL: Record<"admin" | "supervisor" | "worker", number> = {
  worker: 0, supervisor: 1, admin: 2,
};

const PUBLIC_PREFIXES = ["/auth/", "/health", "/guest/", "/unit-requests", "/unit-info/", "/service-categories"];

const SUPER_ADMIN_PREFIXES = ["/super-admin/"];

const ADMIN_PREFIXES = ["/expenses", "/settings"];

const SUPERVISOR_PREFIXES = [
  "/users", "/activity-logs", "/staff", "/properties",
  "/bookings", "/stats", "/guests", "/shifts",
  "/maintenance-requests", "/admin/",
];

// Paths workers may access even though they are below supervisor tier
const WORKER_ALLOWED_PREFIXES = [
  "/tasks", "/work-orders", "/rooms", "/notifications", "/unit-financials",
];

async function tierGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const path = req.path;

  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p) || path === p.replace(/\/$/, ""))) {
    next(); return;
  }

  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? await sessions.get(sessionId) : undefined;
  if (!session) {
    res.status(401).json({ error: "Not authenticated" }); return;
  }

  // Attach session + tenant context for downstream handlers
  (req as any).sessionUser = session;
  (req as any).tenantId    = session.tenantId;

  // ── Kill-switch check ─────────────────────────────────────────────────────
  // If the tenant is suspended all its users are immediately blocked.
  // Super-admins bypass this (they need access to reactivate tenants).
  if (!session.isSuperAdmin && session.tenantId !== null) {
    if (suspendedTenants.has(session.tenantId)) {
      res.status(403).json({
        error: "TENANT_SUSPENDED",
        message: "This company account has been suspended. Please contact support.",
      });
      return;
    }
  }

  // Super-admin: may only access super-admin routes and auth routes
  if (session.isSuperAdmin) {
    if (SUPER_ADMIN_PREFIXES.some((p) => path.startsWith(p))) {
      next(); return;
    }
    // Allow super-admin to access any tenant route (they bypass tenant scoping)
    // so they can inspect/manage tenant data
    next(); return;
  }

  // Block regular users from super-admin routes
  if (SUPER_ADMIN_PREFIXES.some((p) => path.startsWith(p))) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const tier = getRoleTier(session.role);
  const level = TIER_LEVEL[tier];

  if (ADMIN_PREFIXES.some((p) => path.startsWith(p))) {
    if (level < TIER_LEVEL.admin) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  if (SUPERVISOR_PREFIXES.some((p) => path.startsWith(p))) {
    // Workers may still access specific allowed sub-paths
    const isWorkerAllowed = tier === "worker" && WORKER_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
    if (!isWorkerAllowed && level < TIER_LEVEL.supervisor) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  next();
}

const router: IRouter = Router();

router.use(tierGate);

router.use(authRouter);
router.use(healthRouter);
router.use(superAdminRouter);
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
router.use(unitRequestsRouter);
router.use(supportTicketsRouter);
router.use(serviceCategoriesRouter);

// Populate the kill-switch cache from DB on startup.
// Runs asynchronously; any request that arrives before it finishes will do
// an extra DB check in the worst case (safe, just slightly slower).
loadSuspendedTenants().catch((err) => {
  logger.error({ err }, "[tenant-status] Failed to load suspended tenants");
});

export default router;
