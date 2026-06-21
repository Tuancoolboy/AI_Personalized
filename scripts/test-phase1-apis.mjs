#!/usr/bin/env node
/**
 * Integration tests Phase 1 APIs — cần server đang chạy.
 * Usage: node --env-file=.env.local scripts/test-phase1-apis.mjs [baseUrl]
 */

import { existsSync, readFileSync } from "node:fs";
import { organizationSeedRow } from "./test-org-helpers.mjs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const DEMO_COOKIE = "ai_troly_demo_session=true";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const results = [];
let authCookie = DEMO_COOKIE;
let noRoleAuthCookie = DEMO_COOKIE;
let managerAuthCookie = DEMO_COOKIE;
let supabaseMode = false;
let managerOrgReady = false;

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

async function loginTestUser(prefix) {
  const { createClient } = await import("@supabase/supabase-js");
  const { createServerClient } = await import("@supabase/ssr");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = `${prefix}-${Date.now()}@test.local`;
  const password = "TestPass123!";

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw new Error(createError.message);

  const managerPrefixes = new Set(["quanly", "manager", "hr", "admin"]);
  if (created?.user?.id && managerPrefixes.has(prefix)) {
    const organizationName = `Công ty của ${email.toLowerCase()}`;
    const { data: privateOrg, error: orgError } = await admin
      .from("organizations")
      .upsert(
        organizationSeedRow(email, organizationName),
        { onConflict: "name" },
      )
      .select("id")
      .single();
    if (orgError) {
      console.warn(
        `[test] skip manager membership for ${email}: ${orgError.message}`,
      );
    } else {
      if (privateOrg?.id) {
        const { error: memberError } = await admin
          .from("organization_members")
          .upsert(
            {
              organization_id: privateOrg.id,
              user_id: created.user.id,
              member_role: "manager",
              department_id: "khac",
            },
            { onConflict: "organization_id,user_id" },
          );
        if (memberError) {
          console.warn(
            `[test] skip manager membership for ${email}: ${memberError.message}`,
          );
        }
      }
    }
  }

  const jar = new Map();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () =>
        [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw new Error(signInError.message);

  return [...jar.entries()]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

async function setupAuth() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""),
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: orgProbeError } = await admin
    .from("organizations")
    .select("id")
    .limit(1);
  managerOrgReady = !orgProbeError;

  authCookie = await loginTestUser("api-chat");
  noRoleAuthCookie = await loginTestUser("api-norole");
  managerAuthCookie = await loginTestUser("quanly");
  supabaseMode = true;
  console.log("Supabase mode: dùng session thật cho API tests\n");
}

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function jsonPost(path, body, headers = {}) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function testServerUp() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
    record("Server reachable", res.ok, BASE);
    return res.ok;
  } catch {
    record("Server reachable", false, `Cannot connect to ${BASE}`);
    return false;
  }
}

async function testPages() {
  for (const path of ["/", "/login", "/register"]) {
    const res = await fetch(`${BASE}${path}`);
    record(`GET ${path}`, res.ok, `status=${res.status}`);
  }
}

async function testNotFound() {
  const res = await fetch(`${BASE}/trang-khong-ton-tai-xyz`);
  record("GET unknown route → 404", res.status === 404, `status=${res.status}`);
}

async function testLeads() {
  const res = await jsonPost("/api/leads", {
    email: `test-${Date.now()}@example.com`,
    name: "API Test",
    source: "api-test",
  });
  const data = await res.json();
  record(
    "POST /api/leads valid email",
    res.ok && data.ok === true,
    `status=${res.status}`,
  );
}

async function testLeadsValidation() {
  const res = await jsonPost("/api/leads", { email: "not-an-email" });
  record("POST /api/leads invalid email → 400", res.status === 400);
}

async function testLeadsMissingEmail() {
  const res = await jsonPost("/api/leads", {});
  record("POST /api/leads missing email → 400", res.status === 400);
}

async function testChatUnauthorized() {
  const res = await jsonPost("/api/chat", {
    message: "AI là gì?",
    role_id: "kinh-doanh",
  });
  record("POST /api/chat without auth → 401", res.status === 401);
}

async function testChatStreamsAnswer() {
  const res = await jsonPost(
    "/api/chat",
    { message: "AI là gì?", role_id: "kinh-doanh" },
    { Cookie: authCookie },
  );
  const text = await res.text();
  record(
    "POST /api/chat authenticated streams answer",
    res.ok && text.length > 20,
    `status=${res.status} len=${text.length}`,
  );
}

async function testChatKinDoanhExample() {
  const res = await jsonPost(
    "/api/chat",
    { message: "AI là gì?", role_id: "kinh-doanh" },
    { Cookie: authCookie },
  );
  const text = await res.text();
  record(
    "POST /api/chat kinh-doanh has sales context",
    text.includes("bán hàng") || text.includes("email"),
    supabaseMode ? "openai/cache sales example" : "cached/canned sales example",
  );
}

async function testChatSafety() {
  const res = await jsonPost(
    "/api/chat",
    { message: "STK 1234567890", role_id: "ke-toan" },
    { Cookie: authCookie },
  );
  const text = await res.text();
  record(
    "POST /api/chat sensitive data warning",
    text.includes("__SAFETY__") || text.includes("nhạy cảm"),
    "safety prefix or keyword",
  );
}

async function testChatEmptyMessage() {
  const res = await jsonPost(
    "/api/chat",
    { message: "   ", role_id: "kinh-doanh" },
    { Cookie: authCookie },
  );
  record("POST /api/chat empty message → 400", res.status === 400);
}

async function testChatMissingRole() {
  const res = await jsonPost(
    "/api/chat",
    { message: "AI là gì?" },
    { Cookie: noRoleAuthCookie },
  );
  record("POST /api/chat missing role → 400", res.status === 400);
}

async function testChatKhacRole() {
  const res = await jsonPost(
    "/api/chat",
    { message: "AI là gì?", role_id: "khac" },
    { Cookie: authCookie },
  );
  const text = await res.text();
  record(
    "POST /api/chat khac role works",
    res.ok && text.length > 10,
    `status=${res.status}`,
  );
}

async function testChatHistoryUnauthorized() {
  const res = await fetch(`${BASE}/api/chat/history`);
  record("GET /api/chat/history without auth → 401", res.status === 401);
}

async function testChatHistoryAuthenticated() {
  const res = await fetch(`${BASE}/api/chat/history`, {
    headers: { Cookie: authCookie },
  });
  const data = await res.json();
  record(
    "GET /api/chat/history authenticated",
    res.ok && data.ok === true && Array.isArray(data.messages),
    `status=${res.status} messages=${data.messages?.length ?? 0}`,
  );
}

async function testManagerChatWithoutRole() {
  if (supabaseMode && !managerOrgReady) {
    record(
      "POST /api/chat manager without role_id streams",
      true,
      "skipped — chưa có migration 0008_multi_manager_core.sql",
    );
    return;
  }

  const res = await jsonPost(
    "/api/chat",
    { message: "Nhân viên nào đang chậm tiến độ học?" },
    { Cookie: managerAuthCookie },
  );
  const text = await res.text();
  const conversationId = res.headers.get("X-Conversation-Id");
  const managerChatOk = res.ok && text.length > 10;
  record(
    "POST /api/chat manager without role_id streams",
    managerChatOk,
    managerChatOk
      ? `status=${res.status} len=${text.length}`
      : `status=${res.status} len=${text.length} (seed manager org/membership thất bại — xem log [test] skip manager membership)`,
  );
  if (supabaseMode && conversationId) {
    record(
      "POST /api/chat returns X-Conversation-Id",
      conversationId.length > 10,
      conversationId.slice(0, 8),
    );
  } else if (!supabaseMode) {
    record(
      "POST /api/chat returns X-Conversation-Id",
      true,
      "skipped in demo mode",
    );
  }
}

async function testChatPersistsHistory() {
  if (!supabaseMode) {
    record("Chat history persists after send", true, "skipped in demo mode");
    return;
  }

  const message = `Test memory ${Date.now()}`;
  const chatRes = await jsonPost(
    "/api/chat",
    { message, role_id: "kinh-doanh" },
    { Cookie: authCookie },
  );
  await chatRes.text();

  const historyRes = await fetch(`${BASE}/api/chat/history`, {
    headers: { Cookie: authCookie },
  });
  const history = await historyRes.json();
  const found = (history.messages ?? []).some(
    (m) => m.role === "user" && m.content.includes("Test memory"),
  );
  record(
    "Chat history persists after send",
    historyRes.ok && found,
    `messages=${history.messages?.length ?? 0}`,
  );
}

async function testProtectedWithoutAuth(path) {
  const res = await fetch(`${BASE}${path}`);
  record(
    `GET ${path} without auth`,
    res.status === 401 || res.status === 403,
    `status=${res.status}`,
  );
}

async function testEventsNoAuth() {
  const res = await jsonPost("/api/events", {
    eventName: "onboarding_complete",
  });
  const data = await res.json().catch(() => ({}));
  // Không Supabase: no-op 200 persisted=false. Có Supabase: 401.
  const ok =
    (res.status === 200 && data.ok === true && data.persisted === false) ||
    res.status === 401;
  record("POST /api/events without auth", ok, `status=${res.status}`);
}

async function testEventsInvalidName() {
  const res = await jsonPost("/api/events", {
    eventName: "invalid_event_xyz",
  });
  record("POST /api/events invalid name → 400", res.status === 400);
}

async function testEventsValidAuthenticated() {
  const res = await jsonPost(
    "/api/events",
    {
      eventName: "tutor_message_sent",
      properties: { source: "test" },
    },
    supabaseMode ? { Cookie: authCookie } : {},
  );
  const data = await res.json();
  const ok = supabaseMode
    ? res.ok && data.ok === true && data.persisted === true
    : res.ok && data.ok === true && data.persisted === false;
  record(
    supabaseMode
      ? "POST /api/events valid name (authenticated)"
      : "POST /api/events valid name (no-op without Supabase)",
    ok,
    `status=${res.status} persisted=${data.persisted}`,
  );
}

async function testProgressPostUnauthorized() {
  const res = await jsonPost("/api/progress", {
    moduleId: "kinh-doanh-m1",
    status: "hoan-thanh",
  });
  record(
    "POST /api/progress without auth",
    res.status === 401 || res.status === 403,
    `status=${res.status}`,
  );
}

async function testNhatKyPostUnauthorized() {
  const res = await jsonPost("/api/nhat-ky", { hoursSaved: 1 });
  record(
    "POST /api/nhat-ky without auth",
    res.status === 401 || res.status === 403,
    `status=${res.status}`,
  );
}

async function testQuizPostUnauthorized() {
  const res = await jsonPost("/api/quiz-results", {
    roleId: "kinh-doanh",
    score: 80,
  });
  record(
    "POST /api/quiz-results without auth",
    res.status === 401 || res.status === 403,
    `status=${res.status}`,
  );
}

async function main() {
  console.log(`\nPhase 1 API integration tests @ ${BASE}\n`);

  const up = await testServerUp();
  if (!up) {
    console.error("\nStart server first: npm run dev  OR  npm run test (auto-starts)");
    process.exit(1);
  }

  try {
    await setupAuth();
    await testPages();
    await testNotFound();
    await testLeads();
    await testLeadsValidation();
    await testLeadsMissingEmail();
    await testChatUnauthorized();
    await testChatStreamsAnswer();
    await testChatKinDoanhExample();
    await testChatSafety();
    await testChatEmptyMessage();
    await testChatMissingRole();
    await testChatKhacRole();
    await testChatHistoryUnauthorized();
    await testChatHistoryAuthenticated();
    await testManagerChatWithoutRole();
    await testChatPersistsHistory();
    await testProtectedWithoutAuth("/api/profile");
    await testProtectedWithoutAuth("/api/progress");
    await testProtectedWithoutAuth("/api/nhat-ky");
    await testProtectedWithoutAuth("/api/quiz-results");
    await testEventsNoAuth();
    await testEventsInvalidName();
    await testEventsValidAuthenticated();
    await testProgressPostUnauthorized();
    await testNhatKyPostUnauthorized();
    await testQuizPostUnauthorized();
  } catch (err) {
    console.error("\nFatal:", err.message);
    process.exit(1);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("\nFailed:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main();
