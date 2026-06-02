import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const equityStakesTable = pgTable("equity_stakes", {
  id:                 serial("id").primaryKey(),
  tenantId:           integer("tenant_id").notNull(),
  userId:             integer("user_id").notNull(),
  totalCompanyShares: integer("total_company_shares").notNull(),
  partnerShareCount:  integer("partner_share_count").notNull(),
  valuationPerShare:  numeric("valuation_per_share", { precision: 14, scale: 4 }).notNull(),
  currency:           text("currency").notNull().default("AED"),
  effectiveDate:      text("effective_date").notNull(),
  updatedAt:          timestamp("updated_at").defaultNow().notNull(),
});

export const dividendDistributionsTable = pgTable("dividend_distributions", {
  id:               serial("id").primaryKey(),
  tenantId:         integer("tenant_id").notNull(),
  partnerId:        integer("partner_id").notNull(),
  amount:           numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency:         text("currency").notNull().default("AED"),
  distributionDate: text("distribution_date").notNull(),
  status:           text("status").notNull().default("paid"),
  fiscalPeriod:     text("fiscal_period").notNull(),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
});

export const companyReportsTable = pgTable("company_reports", {
  id:           serial("id").primaryKey(),
  tenantId:     integer("tenant_id").notNull(),
  title:        text("title").notNull(),
  reportType:   text("report_type").notNull().default("annual"),
  fiscalYear:   integer("fiscal_year").notNull(),
  fiscalPeriod: text("fiscal_period").notNull(),
  fileUrl:      text("file_url"),
  fileSizeKb:   integer("file_size_kb"),
  publishedAt:  text("published_at").notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertEquityStakeSchema = createInsertSchema(equityStakesTable).omit({ id: true, updatedAt: true });
export const insertDividendSchema    = createInsertSchema(dividendDistributionsTable).omit({ id: true, createdAt: true });
export const insertCompanyReportSchema = createInsertSchema(companyReportsTable).omit({ id: true, createdAt: true });

export type EquityStake          = typeof equityStakesTable.$inferSelect;
export type DividendDistribution = typeof dividendDistributionsTable.$inferSelect;
export type CompanyReport        = typeof companyReportsTable.$inferSelect;
