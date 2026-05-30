import fs from "node:fs";
import path from "node:path";

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS   = 5;
const WINDOW_MS      = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS     = 15 * 60 * 1000; // 15-minute lockout
const LOG_DIR        = path.join(process.cwd(), "logs");
const SECURITY_LOG   = path.join(LOG_DIR, "security.log");

// ── State (in-process) ────────────────────────────────────────────────────────
interface AttemptRecord {
  count:     number;
  firstAt:   number;
  lockedUntil: number | null;
}

const attempts = new Map<string, AttemptRecord>();

function key(ip: string, username: string): string {
  return `${ip}::${username}`;
}

// ── Log writer ────────────────────────────────────────────────────────────────
function writeLog(level: "INFO" | "WARN" | "ALERT", event: string, detail: Record<string, unknown>) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...detail }) + "\n";
    fs.appendFileSync(SECURITY_LOG, line, "utf8");
  } catch {
    // never throw from security logger
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface LoginResult {
  allowed:       boolean;
  lockedUntilMs: number | null;
  attemptsLeft:  number;
}

/** Call BEFORE attempting DB lookup to check if the IP/user is locked out. */
export function checkLoginAllowed(ip: string, username: string): LoginResult {
  const k   = key(ip, username);
  const rec = attempts.get(k);
  const now = Date.now();

  if (rec?.lockedUntil && now < rec.lockedUntil) {
    return { allowed: false, lockedUntilMs: rec.lockedUntil, attemptsLeft: 0 };
  }

  // Reset window if it has expired
  if (rec && now - rec.firstAt > WINDOW_MS) {
    attempts.delete(k);
  }

  const current = attempts.get(k);
  const left    = MAX_ATTEMPTS - (current?.count ?? 0);
  return { allowed: true, lockedUntilMs: null, attemptsLeft: left };
}

/** Call after a FAILED login attempt. Returns updated LoginResult. */
export function recordFailedAttempt(ip: string, username: string): LoginResult {
  const k   = key(ip, username);
  const now = Date.now();
  const rec = attempts.get(k) ?? { count: 0, firstAt: now, lockedUntil: null };

  // Reset window if expired
  if (now - rec.firstAt > WINDOW_MS) {
    rec.count   = 0;
    rec.firstAt = now;
    rec.lockedUntil = null;
  }

  rec.count += 1;

  const locked = rec.count >= MAX_ATTEMPTS;
  if (locked) rec.lockedUntil = now + LOCKOUT_MS;

  attempts.set(k, rec);

  writeLog(
    locked ? "ALERT" : "WARN",
    locked ? "LOGIN_LOCKOUT" : "LOGIN_FAILED",
    { ip, username, attempt: rec.count, lockedUntil: rec.lockedUntil ?? undefined }
  );

  return {
    allowed:       !locked,
    lockedUntilMs: rec.lockedUntil,
    attemptsLeft:  Math.max(0, MAX_ATTEMPTS - rec.count),
  };
}

/** Call after a SUCCESSFUL login — clears the counter for this key. */
export function recordSuccessfulLogin(ip: string, username: string) {
  attempts.delete(key(ip, username));
  writeLog("INFO", "LOGIN_SUCCESS", { ip, username });
}

/** Read last N lines of the security log (for an admin endpoint). */
export function readSecurityLog(lines = 100): string[] {
  try {
    if (!fs.existsSync(SECURITY_LOG)) return [];
    const content = fs.readFileSync(SECURITY_LOG, "utf8");
    return content.trim().split("\n").filter(Boolean).slice(-lines);
  } catch {
    return [];
  }
}
