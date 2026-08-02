import { pgTable, serial, text, integer, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";

export const architectProjectsTable = pgTable("architect_projects", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  userId: text("user_id").notNull().default("guest"),
  listingId: integer("listing_id"),
  title: text("title").notNull(),
  projectType: text("project_type").notNull().default("villa"), // villa | land | commercial | residential_compound | custom
  city: text("city").default("الرياض"),
  district: text("district").default("حي النرجس"),
  plotAreaSqm: numeric("plot_area_sqm", { precision: 10, scale: 2 }),
  dimensions: text("dimensions"), // e.g. "20m x 25m"
  status: text("status").notNull().default("active"), // active | archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const architectBriefsTable = pgTable("architect_briefs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  rawNaturalBrief: text("raw_natural_brief"),
  structuredData: text("structured_data").notNull().default("{}"), // JSON string of extracted requirements
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const architectConceptsTable = pgTable("architect_concepts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  conceptName: text("concept_name").notNull(),
  styleKey: text("style_key").notNull().default("saudi_contemporary"),
  designRationale: text("design_rationale"),
  spaceProgramJson: text("space_program_json").notNull().default("[]"), // Array of space allocations
  floorPlanDataJson: text("floor_plan_data_json").notNull().default("{}"), // Structured floor plan geometry & zones
  assumptionsJson: text("assumptions_json").notNull().default("[]"), // Array of assumptions with classification
  facadeConceptJson: text("facade_concept_json").default("{}"),
  materialConceptsJson: text("material_concepts_json").default("[]"),
  currentVersion: integer("current_version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const architectVersionsTable = pgTable("architect_versions", {
  id: serial("id").primaryKey(),
  conceptId: integer("concept_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  versionLabel: text("version_label").notNull(),
  snapshotJson: text("snapshot_json").notNull(), // Full JSON dump of concept at this version
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const architectJobsTable = pgTable("architect_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  conceptId: integer("concept_id"),
  jobType: text("job_type").notNull().default("3d_generation"), // 3d_generation | floor_2d | facade
  status: text("status").notNull().default("QUEUED"), // QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED
  provider: text("provider").notNull().default("tripo3d"),
  prompt: text("prompt").notNull(),
  resultAssetUrl: text("result_asset_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
