import { apiError, apiOk } from "@/lib/api-error";
import { requireManagerContext } from "@/lib/manager-auth";
import {
  DEMO_MANAGER_RECOMMENDATIONS,
  buildMemberRecommendationsView,
  isMissingRecommendationsSchema,
} from "@/lib/manager-recommendations";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type MemberRow = {
  user_id: string;
  department_id: string | null;
  member_role: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role_id: string | null;
};

type AssignmentRow = {
  user_id: string;
  status: string;
};

export async function GET() {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới xem được gợi ý lộ trình.");
  }

  if (!isSupabaseConfigured() || context.membership.organizationId === "demo") {
    return apiOk({
      members: DEMO_MANAGER_RECOMMENDATIONS,
      persisted: false,
      message:
        "Dữ liệu demo — nhân viên mở /lo-trinh để tạo snapshot gợi ý thật.",
    });
  }

  const supabase = createSupabaseServiceClient();
  const orgId = context.membership.organizationId;

  const { data: memberRows, error: memberError } = await supabase
    .from("organization_members")
    .select("user_id, department_id, member_role")
    .eq("organization_id", orgId)
    .eq("member_role", "employee")
    .order("created_at", { ascending: true });

  if (memberError) {
    console.error("[manager/recommendations members]", memberError.message);
    return apiError("INTERNAL_ERROR", "Không đọc được danh sách nhân viên.");
  }

  const employees = (memberRows ?? []) as MemberRow[];
  const userIds = employees.map((row) => row.user_id);

  if (userIds.length === 0) {
    return apiOk({
      members: [],
      persisted: true,
      message: "Chưa có nhân viên trong tổ chức.",
    });
  }

  const [
    { data: profiles, error: profilesError },
    { data: recRows, error: recError },
    { data: assignments, error: assignError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role_id")
      .in("id", userIds),
    supabase
      .from("learning_recommendations")
      .select(
        "user_id, candidate_module_id, score, reason_codes, engine_version, created_at",
      )
      .eq("organization_id", orgId)
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("learning_assignments")
      .select("user_id, status")
      .eq("organization_id", orgId)
      .in("user_id", userIds)
      .eq("status", "active"),
  ]);

  if (profilesError) {
    console.error("[manager/recommendations profiles]", profilesError.message);
    return apiError("INTERNAL_ERROR", "Không đọc được hồ sơ nhân viên.");
  }

  if (recError) {
    if (isMissingRecommendationsSchema(recError.message)) {
      return apiOk({
        members: DEMO_MANAGER_RECOMMENDATIONS,
        persisted: false,
        message: "Chưa có bảng gợi ý — chạy migration 0019.",
      });
    }
    console.error("[manager/recommendations]", recError.message);
    return apiError("INTERNAL_ERROR", "Không đọc được gợi ý lộ trình.");
  }

  if (assignError && !isMissingRecommendationsSchema(assignError.message)) {
    console.warn("[manager/recommendations assignments]", assignError.message);
  }

  const profileById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
  const recByUser = new Map<string, typeof recRows>();
  for (const row of recRows ?? []) {
    const uid = row.user_id as string;
    const list = recByUser.get(uid) ?? [];
    list.push(row);
    recByUser.set(uid, list);
  }

  const assignmentByUser = new Map<string, string>();
  for (const row of (assignments ?? []) as AssignmentRow[]) {
    assignmentByUser.set(row.user_id, row.status);
  }

  const members = employees.map((employee) => {
    const profile = profileById.get(employee.user_id);
    const assignStatus = assignmentByUser.get(employee.user_id);
    const assignmentStatus =
      assignStatus === "active"
        ? "active"
        : assignStatus === "completed"
          ? "completed"
          : "none";

    return buildMemberRecommendationsView({
      userId: employee.user_id,
      employeeName: profile?.full_name?.trim() || "Nhân viên",
      departmentId: employee.department_id,
      roleId: profile?.role_id ?? null,
      recommendationRows: (recByUser.get(employee.user_id) ?? []) as Parameters<
        typeof buildMemberRecommendationsView
      >[0]["recommendationRows"],
      assignmentStatus,
    });
  });

  members.sort((a, b) => {
    if (a.hasSnapshot !== b.hasSnapshot) return a.hasSnapshot ? -1 : 1;
    return a.employeeName.localeCompare(b.employeeName, "vi");
  });

  return apiOk({
    members,
    persisted: true,
    message:
      members.some((m) => m.hasSnapshot)
        ? undefined
        : "Nhân viên cần mở /lo-trinh ít nhất một lần để lưu gợi ý lộ trình.",
  });
}
