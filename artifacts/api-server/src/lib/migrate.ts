import { db } from "@workspace/db";
  import { sql } from "drizzle-orm";
  import { logger } from "./logger";

  export async function runMigrations(): Promise<void> {
    const migrations = [
      // users table
      sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        permissions TEXT NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // guest_requests table
      sql`CREATE TABLE IF NOT EXISTS guest_requests (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        facility_name TEXT,
        scheduled_at TEXT,
        visitor_name TEXT,
        visitor_phone TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        ref_code TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // guest_feedback table
      sql`CREATE TABLE IF NOT EXISTS guest_feedback (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        rating TEXT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // activity_logs table
      sql`CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        username TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // unit_financials table
      sql`CREATE TABLE IF NOT EXISTS unit_financials (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'available',
        due_date TEXT,
        amount_due NUMERIC(10, 2),
        check_in TEXT,
        check_out TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    ];

    for (const migration of migrations) {
      try {
        await db.execute(migration);
      } catch (err: any) {
        logger.warn({ err: err.message }, "Migration step warning (may already exist)");
      }
    }
    logger.info("Database migrations complete");
  }
  