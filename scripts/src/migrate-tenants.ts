import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const steps: string[] = [
  `CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    logo_text TEXT,
    logo_sub TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `ALTER TABLE properties    ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE rooms         ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE bookings      ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE staff         ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE tasks         ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE expenses      ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE work_orders   ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE shifts        ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE users         ADD COLUMN IF NOT EXISTS tenant_id INTEGER`,
  `ALTER TABLE settings      ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE field_users   ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE unit_financials ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE guest_requests  ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE guest_feedback  ADD COLUMN IF NOT EXISTS tenant_id INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key`,
  `DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_tenant_key_uniq') THEN
      ALTER TABLE settings ADD CONSTRAINT settings_tenant_key_uniq UNIQUE (tenant_id, key);
    END IF;
  END$$`,
  `INSERT INTO tenants (id, name, slug, plan, status, logo_text, logo_sub)
   VALUES (1, 'Rozoz Demo', 'grand-pms', 'enterprise', 'active', 'Rozoz', 'Smart')
   ON CONFLICT (slug) DO NOTHING`,
  `INSERT INTO users (username, display_name, email, password_hash, role, permissions, is_active, tenant_id)
   VALUES (
     'superadmin', 'Super Administrator', 'super@rozoz.com',
     encode(digest('grand-pms::superadmin123', 'sha256'), 'hex'),
     'super_admin', '["all"]', TRUE, NULL
   ) ON CONFLICT (username) DO NOTHING`,
];

async function run() {
  for (const step of steps) {
    await db.execute(sql.raw(step));
    process.stdout.write(".");
  }
  console.log("\n✓ Migration complete");
  process.exit(0);
}

run().catch((e) => {
  console.error("\n✗ Migration failed:", e.message);
  process.exit(1);
});
