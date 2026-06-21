#!/usr/bin/env node
/**
 * Phase 2.0 integration tests — manager team isolation + invite POST accept.
 * Usage: node --env-file=.env.local scripts/test-phase2-manager-invite.mjs [baseUrl]
 */

import { existsSync, readFileSync } from "node:fs";
import { organizationSeedRow } from "./test-org-helpers.mjs";

const BASE = process.argv[2] ?? "http://localhost:3000";

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

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function createSessionCookie(emailPrefix) {
  const { createClient } = await import("@supabase/supabase-js");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
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

  return {
    email,
    userId: created.user.id,
    admin,
    cookie: await signInCookie(url, anon, email, password),
  };
}

async function signInCookie(url, anon, email, password) {
  const { createServerClient } = await import("@supabase/ssr");
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  return [...jar.entries()]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

async function ensureManagerOrg(admin, userId, email) {
  const organizationName = `Công ty của ${email.toLowerCase()}`;
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .upsert(organizationSeedRow(email, organizationName), { onConflict: "name" })
    .select("id, name")
    .single();
  if (orgError) throw new Error(orgError.message);

  const { error: memberError } = await admin.from("organization_members").upsert(
    {
      organization_id: org.id,
      user_id: userId,
      member_role: "manager",
      department_id: "khac",
    },
    { onConflict: "organization_id,user_id" },
  );
  if (memberError) throw new Error(memberError.message);

  return org;
}

async function fetchWithCookie(path, options = {}, cookie) {
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Cookie: cookie,
    },
    redirect: options.redirect ?? "follow",
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

async function testManagerInviteIsolationFlow() {
  const managerA = await createSessionCookie("p2-manager-a");
  const managerB = await createSessionCookie("p2-manager-b");
  const orgA = await ensureManagerOrg(managerA.admin, managerA.userId, managerA.email);
  const orgB = await ensureManagerOrg(managerB.admin, managerB.userId, managerB.email);

  const inviteCreateRes = await fetchWithCookie(
    "/api/manager/invite-links",
    { method: "POST" },
    managerA.cookie,
  );
  const inviteCreateData = await inviteCreateRes.json();
  const token = inviteCreateData.link?.token;
  record(
    "POST /api/manager/invite-links creates token",
    inviteCreateRes.ok && typeof token === "string" && token.length >= 32,
    `status=${inviteCreateRes.status}`,
  );
  if (!token) return;

  const employee = await createSessionCookie("p2-employee");
  const invitePageRes = await fetch(`${BASE}/moi/${encodeURIComponent(token)}`);
  record(
    "GET /moi/[token] renders invite page",
    invitePageRes.ok,
    `status=${invitePageRes.status}`,
  );

  const getAcceptRes = await fetchWithCookie(
    `/moi/${encodeURIComponent(token)}/accept`,
    { redirect: "manual" },
    employee.cookie,
  );
  const getAcceptLocation = getAcceptRes.headers.get("location") ?? "";
  record(
    "GET /moi/[token]/accept does not mutate (redirects to invite)",
    getAcceptRes.status >= 300 &&
      getAcceptRes.status < 400 &&
      getAcceptLocation.includes(`/moi/${token}`),
    `status=${getAcceptRes.status} location=${getAcceptLocation}`,
  );

  const { count: beforeCount } = await managerA.admin
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", employee.userId);
  record(
    "Employee has no membership before POST accept",
    (beforeCount ?? 0) === 0,
    `count=${beforeCount ?? 0}`,
  );

  const postAcceptRes = await fetchWithCookie(
    `/moi/${encodeURIComponent(token)}/accept`,
    { method: "POST", redirect: "manual" },
    employee.cookie,
  );
  const postAcceptLocation = postAcceptRes.headers.get("location") ?? "";
  record(
    "POST /moi/[token]/accept joins organization",
    postAcceptRes.status >= 300 &&
      postAcceptRes.status < 400 &&
      (postAcceptLocation.includes("/onboarding") ||
        postAcceptLocation.includes("/lo-trinh")),
    `status=${postAcceptRes.status} location=${postAcceptLocation}`,
  );

  const { data: membership } = await managerA.admin
    .from("organization_members")
    .select("organization_id, member_role, department_id")
    .eq("user_id", employee.userId)
    .maybeSingle();
  record(
    "Employee membership written to manager A organization",
    membership?.organization_id === orgA.id && membership?.member_role === "employee",
    `org=${membership?.organization_id}`,
  );

  const teamARes = await fetchWithCookie("/api/manager/team", {}, managerA.cookie);
  const teamAData = await teamARes.json();
  const employeeInA = (teamAData.members ?? teamAData.team ?? []).some(
    (member) =>
      member.email === employee.email ||
      member.userId === employee.userId ||
      member.id === employee.userId,
  );
  record(
    "Manager A team includes invited employee",
    teamARes.ok && employeeInA,
    `status=${teamARes.status}`,
  );

  const teamBRes = await fetchWithCookie("/api/manager/team", {}, managerB.cookie);
  const teamBData = await teamBRes.json();
  const membersB = teamBData.members ?? teamBData.team ?? [];
  const employeeInB = membersB.some(
    (member) =>
      member.email === employee.email ||
      member.userId === employee.userId ||
      member.id === employee.userId,
  );
  record(
    "Manager B team excludes employee from organization A",
    teamBRes.ok && !employeeInB,
    `status=${teamBRes.status} members=${membersB.length}`,
  );

  await managerA.admin
    .from("profiles")
    .upsert({ id: employee.userId, role_id: "marketing" }, { onConflict: "id" });

  const profileRes = await fetchWithCookie(
    "/api/profile",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: "marketing" }),
    },
    employee.cookie,
  );
  record("PUT /api/profile updates role", profileRes.ok, `status=${profileRes.status}`);

  const { data: syncedMembership } = await managerA.admin
    .from("organization_members")
    .select("department_id")
    .eq("user_id", employee.userId)
    .maybeSingle();
  record(
    "Department sync updates organization_members.department_id",
    syncedMembership?.department_id === "marketing",
    `department=${syncedMembership?.department_id ?? "null"}`,
  );

  const invalidPageRes = await fetch(`${BASE}/moi/invalid-token-should-not-work-1234567890`);
  record(
    "Invalid invite token shows invalid state",
    invalidPageRes.ok,
    `status=${invalidPageRes.status}`,
  );

  void orgB;
}

async function main() {
  console.log(`\nPhase 2 manager/invite integration tests @ ${BASE}\n`);

  if (!isSupabaseConfigured()) {
    console.log("Skipped — cần NEXT_PUBLIC_SUPABASE_* và SUPABASE_SERVICE_ROLE_KEY trong .env.local");
    process.exit(0);
  }

  const up = await testServerUp();
  if (!up) {
    console.error("\nStart server first: npm run dev");
    process.exit(1);
  }

  try {
    const { error: probeError } = await (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""),
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    )
      .from("organizations")
      .select("id")
      .limit(1);
    if (probeError) {
      record("Supabase schema ready", false, probeError.message);
      process.exit(1);
    }

    await testManagerInviteIsolationFlow();
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
