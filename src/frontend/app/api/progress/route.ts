import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const VALID_STATUS = new Set(["chua-hoc", "dang-hoc", "hoan-thanh"]);

export async function GET() {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API progress cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("module_progress")
    .select("module_id, status")
    .eq("user_id", session.userId);

  if (error) {
    console.error("[progress-get]", error.message);
    return apiError("INTERNAL_ERROR", "Không đọc được tiến độ.");
  }

  const progress: Record<string, string> = {};
  for (const row of data ?? []) {
    progress[row.module_id] = row.status;
  }

  return apiOk({ progress });
}

type ProgressPayload = {
  moduleId?: unknown;
  status?: unknown;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API progress cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: ProgressPayload;
  try {
    body = (await request.json()) as ProgressPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const moduleId =
    typeof body.moduleId === "string" ? body.moduleId.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";

  if (!moduleId) {
    return apiError("VALIDATION_ERROR", "Thiếu moduleId.");
  }
  if (!VALID_STATUS.has(status)) {
    return apiError("VALIDATION_ERROR", "Trạng thái không hợp lệ.");
  }

  const supabase = await createSupabaseServerClient();
  const completedAt = status === "hoan-thanh" ? new Date().toISOString() : null;

  const { error } = await supabase.from("module_progress").upsert(
    {
      user_id: session.userId,
      module_id: moduleId,
      status,
      completed_at: completedAt,
    },
    { onConflict: "user_id,module_id" },
  );

  if (error) {
    console.error("[progress-post]", error.message);
    return apiError("INTERNAL_ERROR", "Không lưu được tiến độ.");
  }

  const { data } = await supabase
    .from("module_progress")
    .select("module_id, status")
    .eq("user_id", session.userId);

  const progress: Record<string, string> = {};
  for (const row of data ?? []) {
    progress[row.module_id] = row.status;
  }

  return apiOk({ progress });
}
