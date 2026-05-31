/**
 * In-memory kill-switch cache.
 *
 * Holds the IDs of every tenant whose status is "suspended".
 * - Populated once on server startup via `loadSuspendedTenants()`.
 * - Kept in sync immediately by the super-admin PATCH route.
 * - Checked on every authenticated non-super-admin request (O(1) Set lookup).
 */
import { db, tenantsTable } from "@workspace/db";
import { eq, or, not } from "drizzle-orm";

export const suspendedTenants = new Set<number>();

/** Read DB and (re-)populate the in-memory set. Called once at startup. */
export async function loadSuspendedTenants(): Promise<void> {
  const rows = await db
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(or(eq(tenantsTable.status, "suspended"), not(tenantsTable.isActive)));
  suspendedTenants.clear();
  for (const r of rows) suspendedTenants.add(r.id);
}
