import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { syncMemberDepartmentForUser } from "@/lib/member-department-sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return apiError(
      "FORBIDDEN",
      "API đồng bộ phòng ban chỉ khả dụng khi đã cấu hình Supabase.",
    );
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) {
    console.error("[member-sync-department:profile-read]", error.message);
    return apiError("INTERNAL_ERROR", "Không đọc được hồ sơ.");
  }

  const roleId = typeof data?.role_id === "string" ? data.role_id : null;
  if (!roleId) {
    return apiOk({ updated: false, skippedReason: "missing-role" });
  }

  try {
    const result = await syncMemberDepartmentForUser(session.userId, roleId);
    return apiOk(result);
  } catch (syncError) {
    const message =
      syncError instanceof Error ? syncError.message : String(syncError);
    console.error("[member-sync-department]", message);
    return apiError("INTERNAL_ERROR", "Không đồng bộ được phòng ban.");
  }
}
