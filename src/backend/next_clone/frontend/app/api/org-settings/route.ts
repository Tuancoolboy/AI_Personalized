// API cài đặt tổ chức (mục 3): đọc/ghi organizations.ai_tool.
// GET: thành viên đọc tool chính của tổ chức. PUT: chỉ quản lý đổi.
// Demo mode (chưa có Supabase) → client tự dùng localStorage qua getOrgAiTool().

import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { isManagerUser } from "@/lib/manager-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { DEFAULT_PRIMARY_TOOL, isPrimaryTool } from "@/lib/ai-tools-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

async function resolveOrgId(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return apiOk({ aiTool: DEFAULT_PRIMARY_TOOL, persisted: false });
  }
  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiOk({ aiTool: DEFAULT_PRIMARY_TOOL, persisted: false });
  }

  try {
    const orgId = await resolveOrgId(session.userId);
    if (!orgId) return apiOk({ aiTool: DEFAULT_PRIMARY_TOOL, persisted: false });

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("organizations")
      .select("ai_tool")
      .eq("id", orgId)
      .maybeSingle();

    const aiTool =
      data?.ai_tool && isPrimaryTool(data.ai_tool)
        ? data.ai_tool
        : DEFAULT_PRIMARY_TOOL;
    return apiOk({ aiTool, persisted: true });
  } catch (err) {
    console.error("[org-settings-get]", err);
    return apiOk({ aiTool: DEFAULT_PRIMARY_TOOL, persisted: false });
  }
}

export async function PUT(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }
  // Chỉ quản lý được đổi tool của cả công ty (chặn ở route, không chỉ UI).
  if (!(await isManagerUser())) {
    return apiError("FORBIDDEN", "Chỉ quản lý được đổi công cụ AI của công ty.");
  }

  let body: { aiTool?: unknown };
  try {
    body = (await request.json()) as { aiTool?: unknown };
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }
  const aiTool = typeof body.aiTool === "string" ? body.aiTool : "";
  if (!isPrimaryTool(aiTool)) {
    return apiError("VALIDATION_ERROR", "Công cụ AI không hợp lệ.");
  }

  // Demo mode: không có DB → client tự lưu localStorage.
  if (session.mode === "demo" || !isSupabaseConfigured()) {
    return apiOk({ aiTool, persisted: false });
  }

  try {
    const orgId = await resolveOrgId(session.userId);
    if (!orgId) return apiError("NOT_FOUND", "Chưa thuộc tổ chức nào.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("organizations")
      .update({ ai_tool: aiTool, updated_at: new Date().toISOString() })
      .eq("id", orgId);
    if (error) throw error;
    // Audit hành động nhạy cảm (đổi tool công ty) — §0.2.
    await logAuditEvent(session.userId, "org.ai_tool.update", {
      organizationId: orgId,
      aiTool,
    });
    return apiOk({ aiTool, persisted: true });
  } catch (err) {
    console.error("[org-settings-put]", err);
    return apiError("INTERNAL_ERROR", "Chưa lưu được công cụ AI.");
  }
}
