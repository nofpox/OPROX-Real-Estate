import { Router } from "express";
import {
  db,
  equityStakesTable,
  dividendDistributionsTable,
  companyReportsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requirePartner(req: any, res: any, next: any): void {
  const user = req.sessionUser;
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const adminRoles = ["owner", "admin", "super_admin", "admin-manager", "administrator"];
  if (user.role !== "partner" && !adminRoles.includes(user.role)) {
    res.status(403).json({ error: "Partner access only" }); return;
  }
  next();
}

router.get("/partner/equity", requirePartner, async (req, res) => {
  const user    = (req as any).sessionUser;
  const tenantId = user.tenantId as number | null;

  const conds = [eq(equityStakesTable.userId, user.id as number)];
  if (tenantId !== null) conds.push(eq(equityStakesTable.tenantId, tenantId));

  const [stake] = await db.select().from(equityStakesTable).where(and(...conds)).limit(1);

  if (!stake) {
    res.json({
      userId: user.id,
      totalCompanyShares: 0,
      partnerShareCount: 0,
      valuationPerShare: 0,
      currency: "AED",
      ownershipPct: 0,
      totalValuation: 0,
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
    return;
  }

  const valPerShare  = parseFloat(String(stake.valuationPerShare));
  const ownershipPct = stake.totalCompanyShares > 0
    ? (stake.partnerShareCount / stake.totalCompanyShares) * 100 : 0;

  res.json({
    userId:             stake.userId,
    totalCompanyShares: stake.totalCompanyShares,
    partnerShareCount:  stake.partnerShareCount,
    valuationPerShare:  valPerShare,
    currency:           stake.currency,
    ownershipPct:       parseFloat(ownershipPct.toFixed(4)),
    totalValuation:     parseFloat((stake.partnerShareCount * valPerShare).toFixed(2)),
    effectiveDate:      stake.effectiveDate,
  });
});

router.get("/partner/dividends", requirePartner, async (req, res) => {
  const user    = (req as any).sessionUser;
  const tenantId = user.tenantId as number | null;

  const conds = [eq(dividendDistributionsTable.partnerId, user.id as number)];
  if (tenantId !== null) conds.push(eq(dividendDistributionsTable.tenantId, tenantId));

  const rows = await db
    .select()
    .from(dividendDistributionsTable)
    .where(and(...conds))
    .orderBy(dividendDistributionsTable.distributionDate);

  res.json(rows.map((r) => ({
    id:               r.id,
    amount:           parseFloat(String(r.amount)),
    currency:         r.currency,
    distributionDate: r.distributionDate,
    status:           r.status,
    fiscalPeriod:     r.fiscalPeriod,
    notes:            r.notes ?? null,
  })));
});

router.get("/partner/reports", requirePartner, async (req, res) => {
  const user    = (req as any).sessionUser;
  const tenantId = user.tenantId as number | null;

  const conds = tenantId !== null ? [eq(companyReportsTable.tenantId, tenantId)] : [];

  const rows = await db
    .select()
    .from(companyReportsTable)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(companyReportsTable.publishedAt);

  res.json(rows.map((r) => ({
    id:           r.id,
    title:        r.title,
    reportType:   r.reportType,
    fiscalYear:   r.fiscalYear,
    fiscalPeriod: r.fiscalPeriod,
    fileUrl:      r.fileUrl ?? null,
    fileSizeKb:   r.fileSizeKb ?? null,
    publishedAt:  r.publishedAt,
  })));
});

export default router;
