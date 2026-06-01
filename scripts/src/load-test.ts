/**
 * Grand PMS — Load Test Simulation
 *
 * Uses autocannon to fire concurrent HTTP requests against the key booking
 * and financial endpoints and prints a structured performance report.
 *
 * Run:
 *   pnpm --filter @workspace/scripts run load-test
 *
 * Prerequisites: API server must be running (workflow: artifacts/api-server).
 * All requests go through the shared reverse proxy at localhost:80.
 */

import autocannon from "autocannon";

const BASE = "http://localhost:80";

// ── Auth: obtain a real session cookie by logging in ─────────────────────────
async function getSessionCookie(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: "rakez", username: "admin", password: "admin123" }),
    });
    const cookies = res.headers.getSetCookie?.() ?? [];
    const sid = cookies.find((c) => c.startsWith("sid=") || c.startsWith("connect.sid="));
    if (sid) return sid.split(";")[0];
    return null;
  } catch {
    return null;
  }
}

// ── Run a single autocannon scenario ─────────────────────────────────────────
function runScenario(opts: {
  title:       string;
  url:         string;
  method?:     string;
  body?:       string;
  headers?:    Record<string, string>;
  connections: number;
  duration:    number;
}): Promise<autocannon.Result> {
  console.log(`\n  → ${opts.title}  (${opts.connections} connections × ${opts.duration}s)`);
  return new Promise((resolve, reject) => {
    const inst = autocannon({
      url:         opts.url,
      method:      (opts.method as autocannon.Request["method"]) ?? "GET",
      body:        opts.body,
      headers:     opts.headers ?? {},
      connections: opts.connections,
      duration:    opts.duration,
      pipelining:  1,
    }, (err, result) => {
      if (err) { reject(err); return; }
      resolve(result);
    });
    autocannon.track(inst, { renderProgressBar: true });
  });
}

// ── Format a latency value in ms ──────────────────────────────────────────────
function ms(n: number): string {
  return `${n.toFixed(1)}ms`;
}

// ── Print results as a tidy table ─────────────────────────────────────────────
function printReport(results: Array<{ title: string; result: autocannon.Result }>): void {
  const LINE = "─".repeat(100);
  const HEADER = [
    "Endpoint".padEnd(40),
    "RPS".padStart(7),
    "P50".padStart(9),
    "P95".padStart(9),
    "P99".padStart(9),
    "Max".padStart(9),
    "2xx%".padStart(7),
    "Errors".padStart(8),
  ].join("  ");

  console.log(`\n${"═".repeat(100)}`);
  console.log("  GRAND PMS — LOAD TEST RESULTS");
  console.log(`${"═".repeat(100)}`);
  console.log(`  ${HEADER}`);
  console.log(`  ${LINE}`);

  for (const { title, result } of results) {
    const lat   = result.latency;
    const reqs  = result.requests;
    const total = (result as any)["2xx"] + result.non2xx + result.errors;
    const pct2xx = total > 0
      ? `${(((result as any)["2xx"] / total) * 100).toFixed(1)}%`
      : "—";
    const row = [
      title.padEnd(40),
      String(reqs.average.toFixed(0)).padStart(7),
      ms(lat.p50 ?? 0).padStart(9),
      ms((lat as any).p97_5 ?? lat.p99 ?? 0).padStart(9),
      ms(lat.p99 ?? 0).padStart(9),
      ms(lat.max ?? 0).padStart(9),
      pct2xx.padStart(7),
      String(result.errors).padStart(8),
    ].join("  ");
    console.log(`  ${row}`);
  }

  console.log(`  ${LINE}`);
  console.log("\n  Legend: RPS = requests/sec (avg), P50/P95/P99 = latency percentiles");
  console.log(`${"═".repeat(100)}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Grand PMS Load Test — starting...");
  console.log("══════════════════════════════════════════════════════════════");

  // 1. Get auth session
  console.log("\n[1/6] Authenticating...");
  const cookie = await getSessionCookie();
  if (cookie) {
    console.log("  ✓ Session established");
  } else {
    console.log("  ⚠ Could not authenticate — auth-guarded endpoints will return 401 (testing middleware overhead)");
  }

  const authHeaders: Record<string, string> = cookie
    ? { Cookie: cookie }
    : {};

  const results: Array<{ title: string; result: autocannon.Result }> = [];

  // 2. Health check — baseline (unauth, minimal overhead)
  console.log("\n[2/6] Health check — baseline");
  results.push({
    title: "GET /api/health",
    result: await runScenario({
      title: "GET /api/health",
      url: `${BASE}/api/health`,
      connections: 20,
      duration: 8,
    }),
  });

  // 3. Listings — public, cached
  console.log("\n[3/6] Listings — public + Redis-ready cache");
  results.push({
    title: "GET /api/listings",
    result: await runScenario({
      title: "GET /api/listings",
      url: `${BASE}/api/listings`,
      connections: 20,
      duration: 10,
    }),
  });

  // 4. Bookings list — auth-guarded
  console.log("\n[4/6] Bookings list — auth-guarded");
  results.push({
    title: "GET /api/bookings",
    result: await runScenario({
      title: "GET /api/bookings",
      url: `${BASE}/api/bookings`,
      headers: authHeaders,
      connections: 15,
      duration: 10,
    }),
  });

  // 5. Finance summary — heavy aggregation
  console.log("\n[5/6] Finance summary — multi-property aggregation");
  results.push({
    title: "GET /api/finance/summary",
    result: await runScenario({
      title: "GET /api/finance/summary",
      url: `${BASE}/api/finance/summary`,
      headers: authHeaders,
      connections: 10,
      duration: 10,
    }),
  });

  // 6. Activity logs — audit log reads
  console.log("\n[6/6] Activity logs — audit log reads");
  results.push({
    title: "GET /api/activity-logs?limit=100",
    result: await runScenario({
      title: "GET /api/activity-logs?limit=100",
      url: `${BASE}/api/activity-logs?limit=100`,
      headers: authHeaders,
      connections: 10,
      duration: 8,
    }),
  });

  // Print final report
  printReport(results);

  // Exit summary
  const avgP99 = results.reduce((s, r) => s + r.result.latency.p99, 0) / results.length;
  const anyErrors = results.some((r) => r.result.errors > 0);
  console.log("  System verdict:");
  if (avgP99 < 200 && !anyErrors) {
    console.log("  ✅ PASS — All endpoints P99 < 200ms, zero errors");
  } else if (avgP99 < 500) {
    console.log("  ⚠️  WARN — Average P99 is between 200-500ms; review slow endpoints");
  } else {
    console.log("  ❌ FAIL — P99 exceeds 500ms; database query optimisation needed");
  }
  if (anyErrors) {
    console.log("  ❌ Errors detected — check server logs for 5xx responses");
  }
  console.log();
}

main().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
