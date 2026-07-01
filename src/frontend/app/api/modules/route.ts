import { NextResponse } from "next/server";
import { resolveApiSession } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { fetchModulesForRole } from "@/lib/learning-modules";
import { canAccessLearning, loadLearningActivationRecord } from "@/lib/learning-activation";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const VALID_ROLES = new Set([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
  "nhan-su",
]);

export async function GET(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }
  if (session.mode === "supabase" && isSupabaseConfigured()) {
    const access = await loadLearningActivationRecord(session.userId);
    if (!canAccessLearning(access)) {
      return apiError("FORBIDDEN", "ACCOUNT_NOT_ACTIVATED");
    }
  }

  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get("role_id")?.trim() ?? "";
  const aiLevel = Number(searchParams.get("ai_level") ?? "0");

  if (!roleId || !VALID_ROLES.has(roleId)) {
    return NextResponse.json(
      { ok: false, error: "role_id không hợp lệ." },
      { status: 400 },
    );
  }

  const modules = await fetchModulesForRole(roleId, aiLevel);
  return NextResponse.json({ ok: true, modules, source: "learning_modules" });
}
