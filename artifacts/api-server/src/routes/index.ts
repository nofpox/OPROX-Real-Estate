import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use(propertiesRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(statsRouter);
router.use(guestsRouter);
router.use(expensesRouter);
router.use(workOrdersRouter);
router.use(staffRouter);
router.use(tasksRouter);
router.use(notificationsRouter);
router.use(shiftsRouter);

export default router;
