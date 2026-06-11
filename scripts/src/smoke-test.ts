import { env } from "node:process";

const BASE_URL = env.SMOKE_TEST_URL ?? "http://localhost:80";
const TIMEOUT_MS = 10_000;

interface CheckResult {
  path: string;
  status: number | "error";
  ok: boolean;
  latencyMs: number;
  error?: string;
}

async function checkEndpoint(path: string, expectedStatus = 200): Promise<CheckResult> {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Accept": "application/json" },
      redirect: "manual",
    });
    const latencyMs = Date.now() - start;
    const ok = res.status === expectedStatus || (expectedStatus === 200 && res.status < 400);
    return { path, status: res.status, ok, latencyMs };
  } catch (err: unknown) {
    return {
      path,
      status: "error",
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const ENDPOINTS: Array<{ path: string; expectedStatus?: number }> = [
  { path: "/api/healthz" },
  { path: "/api/auth/user", expectedStatus: 401 },
  { path: "/api/skills" },
  { path: "/api/students/profile", expectedStatus: 401 },
  { path: "/api/students/dashboard", expectedStatus: 401 },
  { path: "/api/students/mastery", expectedStatus: 401 },
  { path: "/api/placement/sessions", expectedStatus: 401 },
  { path: "/api/practice/sessions", expectedStatus: 401 },
  { path: "/api/teacher/dashboard", expectedStatus: 401 },
  { path: "/api/teacher/classes", expectedStatus: 401 },
];

async function run() {
  console.log(`\nSmoke test: ${BASE_URL}\n${"─".repeat(60)}`);

  const results = await Promise.all(
    ENDPOINTS.map((e) => checkEndpoint(e.path, e.expectedStatus))
  );

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    const latency = `${r.latencyMs}ms`;
    const statusStr = r.status === "error" ? `ERR: ${r.error}` : `HTTP ${r.status}`;
    console.log(`${icon} [${latency.padStart(6)}] ${r.path.padEnd(40)} ${statusStr}`);
    if (r.ok) passed++; else failed++;
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\nSmoke test FAILED");
    process.exit(1);
  }

  console.log("\nSmoke test PASSED");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
