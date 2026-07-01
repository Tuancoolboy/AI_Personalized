#!/usr/bin/env node
/**
 * Smoke test 4 AI agents + báo cáo /api/manager/agent-health
 * Usage: node --env-file=.env.local scripts/test-agent-health.mjs [baseUrl]
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

const checks = [];

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

  if (created?.user?.id && prefix === "quanly") {
    const organizationName = `Công ty của ${email.toLowerCase()}`;
    const { data: privateOrg, error: orgError } = await admin
      .from("organizations")
      .upsert(organizationSeedRow(email, organizationName), { onConflict: "name" })
      .select("id")
      .single();
    if (!orgError && privateOrg?.id) {
      await admin.from("organization_members").upsert(
        {
          organization_id: privateOrg.id,
          user_id: created.user.id,
          member_role: "manager",
          department_id: "khac",
        },
        { onConflict: "organization_id,user_id" },
      );
    }
  }

  if (created?.user?.id && prefix === "api-chat") {
    await admin.from("profiles").upsert({
      id: created.user.id,
      role_id: "marketing",
      full_name: "NV Test Agent",
    });
  }

  const jar = new Map();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
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

function record(agent, name, ok, detail = "") {
  checks.push({ agent, name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} [${agent}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function jsonFetch(path, init = {}) {
  return fetch(`${BASE}${path}`, init);
}

async function main() {
  console.log(`Agent smoke tests @ ${BASE}\n`);

  let employeeCookie = DEMO_COOKIE;
  let managerCookie = DEMO_COOKIE;
  let supabaseMode = false;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    employeeCookie = await loginTestUser("api-chat");
    managerCookie = await loginTestUser("quanly");
    supabaseMode = true;
    console.log("Supabase mode: session thật\n");
  } else {
    console.log("Demo mode: cookie demo\n");
  }

  // Agent health dashboard API
  const healthRes = await jsonFetch("/api/manager/agent-health", {
    headers: { Cookie: managerCookie },
  });
  const healthJson = await healthRes.json();
  record(
    "dashboard",
    "GET /api/manager/agent-health",
    healthRes.ok && Array.isArray(healthJson.agents) && healthJson.agents.length === 4,
    healthRes.ok ? `${healthJson.agents?.length ?? 0} agents` : healthJson.error?.message,
  );

  // Agent 1 — tutor (employee chat)
  const chatRes = await jsonFetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      message: "AI giúp gì cho marketing?",
      roleId: "marketing",
    }),
  });
  record(
    "tutor",
    "POST /api/chat (employee)",
    chatRes.status === 200 || chatRes.status === 429,
    `status=${chatRes.status}`,
  );

  // Agent 4 — manager analytics chat
  const managerChatRes = await jsonFetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: managerCookie,
    },
    body: JSON.stringify({
      message: "Ai trong đội học chậm nhất?",
      userType: "manager",
    }),
  });
  record(
    "manager-analytics",
    "POST /api/chat (manager)",
    managerChatRes.status === 200 || managerChatRes.status === 429,
    `status=${managerChatRes.status}`,
  );

  // Agent 3 — recommender
  const recRes = await jsonFetch("/api/agents/recommender", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: employeeCookie,
    },
    body: JSON.stringify({ limit: 3, roleId: "marketing" }),
  });
  const recJson = await recRes.json();
  record(
    "recommender",
    "POST /api/agents/recommender",
    recRes.ok && Array.isArray(recJson.recommendations),
    recRes.ok
      ? `engine=${recJson.engineVersion ?? "?"} items=${recJson.recommendations?.length ?? 0}`
      : recJson.error?.message,
  );

  // Agent 2 — grader (validation path proves endpoint alive)
  const graderBadRes = await jsonFetch("/api/agents/grader", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      prompt: "Mô tả cách dùng AI viết caption",
      answer: "ngắn",
    }),
  });
  record(
    "grader",
    "POST /api/agents/grader validation",
    graderBadRes.status === 400,
    `status=${graderBadRes.status}`,
  );

  if (process.env.OPENAI_API_KEY?.trim()) {
    const graderRes = await jsonFetch("/api/agents/grader", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: employeeCookie,
      },
      body: JSON.stringify({
        prompt: "Viết caption Instagram cho sản phẩm mới",
        answer:
          "Em dùng ChatGPT tạo 3 caption ngắn, có CTA và emoji vừa phải, nhấn lợi ích sản phẩm cho khách hàng trẻ.",
        roleId: "marketing",
      }),
    });
    const graderJson = await graderRes.json();
    record(
      "grader",
      "POST /api/agents/grader live OpenAI",
      graderRes.ok && typeof graderJson.result?.score === "number",
      graderRes.ok ? `score=${graderJson.result?.score}` : graderJson.error?.message,
    );
  } else {
    record(
      "grader",
      "POST /api/agents/grader live OpenAI",
      true,
      "skipped — no OPENAI_API_KEY",
    );
  }

  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  console.log(`\n${passed}/${total} checks passed`);

  const report = {
    baseUrl: BASE,
    supabaseMode,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    passed,
    total,
    checks,
    agentHealth: healthRes.ok ? healthJson : null,
  };

  console.log("\n--- JSON report ---");
  console.log(JSON.stringify(report, null, 2));

  if (passed !== total) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
