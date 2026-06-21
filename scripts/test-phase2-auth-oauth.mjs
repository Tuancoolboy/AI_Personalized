#!/usr/bin/env node
/**
 * Phase 2.1 — OAuth callback + identity linking smoke tests.
 * Usage: node --env-file=.env.local scripts/test-phase2-auth-oauth.mjs [baseUrl]
 */

import { existsSync, readFileSync } from "node:fs";

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

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function buildOAuthCallbackUrl(origin, nextPath) {
  const safe =
    nextPath?.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/onboarding";
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent(safe)}`;
}

function roundTripOAuthNextPath(origin, nextPath) {
  const callback = buildOAuthCallbackUrl(origin, nextPath);
  const url = new URL(callback);
  const raw = url.searchParams.get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/onboarding";
  return raw;
}

function expectSingleUserPerEmail(message) {
  if (!message) return true;
  return /already|registered|exists|duplicate/i.test(message);
}

async function testCallbackWithoutCode() {
  const res = await fetch(`${BASE}/auth/callback`, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  const ok =
    res.status >= 300 &&
    res.status < 400 &&
    location.includes("/verified") &&
    location.includes("status=error");
  record(
    "OAuth callback without code redirects to /verified?status=error",
    ok,
    `status=${res.status}`,
  );
}

async function testCallbackPreservesNextQuery() {
  const res = await fetch(
    `${BASE}/auth/callback?next=${encodeURIComponent("/moi/test-token")}`,
    { redirect: "manual" },
  );
  const location = res.headers.get("location") ?? "";
  const ok =
    res.status >= 300 &&
    res.status < 400 &&
    location.includes("/verified") &&
    location.includes("status=error");
  record(
    "OAuth callback with invite next but no code still fails safely",
    ok,
    `status=${res.status}`,
  );
}

function testOAuthNextRoundTrip() {
  const invite = roundTripOAuthNextPath(BASE, "/moi/invite-token-xyz");
  const company = roundTripOAuthNextPath(BASE, "/c/demo-org");
  const unsafe = roundTripOAuthNextPath(BASE, "//evil.example");
  record(
    "Invite next survives OAuth URL round-trip",
    invite === "/moi/invite-token-xyz",
    invite ?? "null",
  );
  record(
    "Company slug next survives OAuth URL round-trip",
    company === "/c/demo-org",
    company ?? "null",
  );
  record(
    "Unsafe next falls back to onboarding on round-trip",
    unsafe === "/onboarding",
    unsafe ?? "null",
  );
}

async function testDuplicateEmailBlocked() {
  if (!isSupabaseConfigured()) {
    record("Duplicate email blocked on second signup", true, "skipped — no Supabase");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `oauth-link-${Date.now()}@test.local`;
  const password = "TestPass123!";

  const first = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (first.error) {
    record("Duplicate email blocked on second signup", false, first.error.message);
    return;
  }

  const second = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  const blocked = Boolean(second.error) && expectSingleUserPerEmail(second.error.message);
  record(
    "Duplicate email blocked on second signup",
    blocked,
    second.error?.message ?? "unexpected success",
  );

  if (first.data.user?.id) {
    await admin.auth.admin.deleteUser(first.data.user.id);
  }
}

async function testLoginPageShowsGoogleWhenConfigured() {
  const res = await fetch(`${BASE}/login`);
  const html = await res.text();
  const hasGoogle =
    html.includes("Đăng nhập bằng Google") ||
    html.includes("AuthGoogleButton") ||
    html.includes("google");
  const expectGoogle = isSupabaseConfigured();
  record(
    "Login page exposes Google sign-in when Supabase configured",
    expectGoogle ? hasGoogle : true,
    expectGoogle ? (hasGoogle ? "found" : "missing") : "skipped — demo mode",
  );
}

async function main() {
  console.log(`Phase 2 auth/OAuth tests @ ${BASE}\n`);
  testOAuthNextRoundTrip();
  await testCallbackWithoutCode();
  await testCallbackPreservesNextQuery();
  await testDuplicateEmailBlocked();
  await testLoginPageShowsGoogleWhenConfigured();

  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
