import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

export const customFieldsTable = pgTable("custom_fields", {
  id:         serial("id").primaryKey(),
  tenantId:   integer("tenant_id").notNull().default(1),
  entityType: text("entity_type").notNull(),
  fieldKey:   text("field_key").notNull(),
  fieldLabel: text("field_label").notNull(),
  fieldType:  text("field_type").notNull().default("text"),
  options:    text("options"),
  required:   boolean("required").default(false).notNull(),
  sortOrder:  integer("sort_order").default(0).notNull(),
  active:     boolean("active").default(true).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

export type CustomField = typeof customFieldsTable.$inferSelect;

export const insertCustomFieldSchema = createInsertSchema(customFieldsTable);
export const updateCustomFieldSchema = createUpdateSchema(customFieldsTable);
