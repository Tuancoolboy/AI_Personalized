// POST /api/leads — nhận email từ landing page, lưu vào bảng leads (Supabase).
// GET  /api/leads — quản lý xem danh sách (service role, chỉ manager đăng nhập).
// Rate-limit 10 req/giờ/IP để chống spam cơ bản (Phase 4 — KISS, GĐ2 chuyển sang Upstash).

import { NextResponse } from "next/server";
import { apiError, apiOk } from "@/lib/api-error";
import { requireManagerApiSession } from "@/lib/manager-auth";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit-memory";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 giờ

type LeadPayload = {
  email?: unknown;
  name?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  // 1. Rate-limit theo IP
  const ip = getClientIp(request);
  const limit = checkRateLimit(`leads:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } },
    );
  }

  // 2. Parse body
  let body: LeadPayload;
  try {
    body = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const source = typeof body.source === "string" ? body.source.trim() : "landing";

  // 3. Validate email
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Email không hợp lệ." },
      { status: 400 },
    );
  }

  // 4. Insert vào Supabase. Anon client + policy "leads_insert_anyone" cho phép.
  // Nếu Supabase env chưa cấu hình → trả 503 (gracefully degrade, không crash app).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[lead] Supabase env chưa cấu hình — log only, không persist.");
    console.log("[lead:no-db]", { email, name, source });
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .insert({ email, name: name || null, source });

    if (error) {
      console.error("[lead] Supabase insert error:", error.message);
      // KHÔNG expose detail cho client — chỉ generic message.
      return NextResponse.json(
        { ok: false, error: "Không lưu được, thử lại sau." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    console.error("[lead] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Lỗi hệ thống." },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await requireManagerApiSession();
  if (!session) {
    return apiError(
      "FORBIDDEN",
      "Chỉ quản lý mới xem được danh sách đăng ký.",
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return apiOk({
      leads: [],
      total: 0,
      persisted: false,
      message: "Cần cấu hình Supabase để xem lead thật.",
    });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select("id, email, name, source, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[lead] Supabase select error:", error.message);
      return apiError("INTERNAL_ERROR", "Không tải được danh sách.");
    }

    const leads = (data ?? []).map((row) => ({
      id: row.id as string,
      email: row.email as string,
      name: (row.name as string | null) ?? null,
      source: (row.source as string | null) ?? "landing",
      createdAt: row.created_at as string,
    }));

    return apiOk({ leads, total: leads.length, persisted: true });
  } catch (err) {
    console.error("[lead] GET unexpected error:", err);
    return apiError("INTERNAL_ERROR", "Lỗi hệ thống.");
  }
}
