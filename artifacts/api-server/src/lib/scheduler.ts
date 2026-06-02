/**
 * Scheduler — daily maintenance tasks
 *
 * Currently runs:
 *  1. Compressed database backup → ./backups/ with 7-day retention
 *
 * To also ship backups off-site, set these env vars and uncomment the upload block:
 *   BACKUP_GCS_BUCKET — a GCS bucket name (separate from the app's object-storage bucket)
 *
 * The scheduler uses plain setInterval (no external cron library) so it works
 * in any Node.js environment without extra dependencies.
 */

import { execSync }  from "node:child_process";
import fs            from "node:fs";
import path          from "node:path";
import { logger }    from "./logger.js";

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FIRST_RUN_DELAY_MS =  5 * 60 * 1000;       // 5 minutes after server boot
const BACKUP_DIR         = path.join(process.cwd(), "backups");
const RETENTION_COUNT    = parseInt(process.env.BACKUP_RETENTION_DAYS ?? "7", 10);

// ── Core backup logic ─────────────────────────────────────────────────────────

function runBackup(): void {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    logger.warn("SCHEDULER: DATABASE_URL not set — skipping backup");
    return;
  }

  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const ts       = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `pms-${ts}.sql.gz`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Dump → gzip in one pipeline (avoids large intermediate plain-text file)
    execSync(
      `pg_dump "${DATABASE_URL}" --no-password | gzip -9 > "${filepath}"`,
      { stdio: "pipe", shell: "/bin/sh" },
    );

    const sizeKb = Math.round(fs.statSync(filepath).size / 1024);
    logger.info({ filename, sizeKb }, "SCHEDULER: Daily database backup completed");

    // Rotate — keep only the N most recent backups
    pruneOldBackups();
  } catch (err) {
    logger.error({ err }, "SCHEDULER: Database backup FAILED");
  }
}

function pruneOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("pms-") && f.endsWith(".sql.gz"))
      .sort()   // lexicographic = chronological for ISO timestamps
      .reverse();

    const toDelete = files.slice(RETENTION_COUNT);
    for (const f of toDelete) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        logger.info({ file: f }, "SCHEDULER: Pruned old backup");
      } catch { /* ignore individual delete errors */ }
    }
  } catch (err) {
    logger.warn({ err }, "SCHEDULER: Backup pruning failed — non-fatal");
  }
}

// ── Vulnerability scan (weekly) ───────────────────────────────────────────────

const SCAN_LOG = path.join(process.cwd(), "logs", "vuln-scan.log");
const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function runVulnScan(): void {
  try {
    const logsDir = path.dirname(SCAN_LOG);
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const result = execSync("pnpm audit --json 2>/dev/null || true", {
      stdio: "pipe",
      shell: "/bin/sh",
      cwd: path.join(process.cwd(), ".."),  // workspace root
    }).toString();

    let summary = `=== Vulnerability Scan — ${new Date().toISOString()} ===\n`;
    try {
      const parsed = JSON.parse(result);
      const meta   = parsed?.metadata?.vulnerabilities ?? {};
      summary += `critical:${meta.critical ?? 0} high:${meta.high ?? 0} moderate:${meta.moderate ?? 0} low:${meta.low ?? 0} info:${meta.info ?? 0}\n`;
    } catch {
      summary += result.slice(0, 2000) + "\n"; // fallback: raw text
    }

    fs.appendFileSync(SCAN_LOG, summary, "utf8");
    logger.info({ scanLog: SCAN_LOG }, "SCHEDULER: Weekly vulnerability scan completed");
  } catch (err) {
    logger.warn({ err }, "SCHEDULER: Vulnerability scan failed — non-fatal");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startScheduler(): void {
  // Stagger first runs to avoid thundering herd at startup
  setTimeout(() => {
    runBackup();
    setInterval(runBackup, BACKUP_INTERVAL_MS);
  }, FIRST_RUN_DELAY_MS);

  // Weekly vulnerability scan — first run after 10 minutes
  setTimeout(() => {
    runVulnScan();
    setInterval(runVulnScan, WEEKLY_INTERVAL_MS);
  }, 10 * 60 * 1000);

  logger.info(
    { backupDir: BACKUP_DIR, retention: RETENTION_COUNT },
    "SCHEDULER: Daily backup + weekly vuln-scan scheduled",
  );
}
