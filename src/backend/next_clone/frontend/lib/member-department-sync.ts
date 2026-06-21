import { createSupabaseServiceClient } from "@/lib/supabase/server";

const LEGACY_DEPARTMENT_IDS = new Set([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
]);

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export function roleIdToLegacyDepartmentId(roleId: string): string | null {
  return LEGACY_DEPARTMENT_IDS.has(roleId) ? roleId : null;
}

export async function syncMemberDepartmentFromRole(
  supabase: SupabaseServiceClient,
  userId: string,
  roleId: string,
): Promise<{ updated: boolean; skippedReason?: string }> {
  const departmentId = roleIdToLegacyDepartmentId(roleId);
  if (!departmentId) {
    return { updated: false, skippedReason: "invalid-role" };
  }

  const { data: membership, error: readError } = await supabase
    .from("organization_members")
    .select("member_role, department_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (!membership) {
    return { updated: false, skippedReason: "no-membership" };
  }

  if (membership.member_role !== "employee") {
    return { updated: false, skippedReason: "not-employee" };
  }

  if (membership.department_id === departmentId) {
    return { updated: false, skippedReason: "already-synced" };
  }

  const { error: updateError } = await supabase
    .from("organization_members")
    .update({
      department_id: departmentId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("member_role", "employee");

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { updated: true };
}

export async function syncMemberDepartmentForUser(
  userId: string,
  roleId: string,
): Promise<{ updated: boolean; skippedReason?: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { updated: false, skippedReason: "no-service-role" };
  }

  const supabase = createSupabaseServiceClient();
  return syncMemberDepartmentFromRole(supabase, userId, roleId);
}
