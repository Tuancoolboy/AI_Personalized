import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  buildDemoHocTapDepartmentOptions,
  buildHocTapDepartmentOptions,
} from "@/lib/hoc-tap-departments";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  department_id: string | null;
};

type DepartmentRow = {
  department_id: string | null;
};

type ProfileRow = {
  role_id: string | null;
};

export async function GET() {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  if (!isSupabaseConfigured() || session.mode === "demo") {
    return apiOk({
      departments: buildDemoHocTapDepartmentOptions(),
      source: "demo",
      persisted: false,
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError(
      "FORBIDDEN",
      "API phòng ban cần cấu hình Supabase service role.",
    );
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, department_id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (membershipError) {
      console.error("[hoc-tap-departments:membership]", membershipError.message);
      return apiError("INTERNAL_ERROR", "Không đọc được phòng ban của bạn.");
    }

    if (!membership?.organization_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", session.userId)
        .maybeSingle();

      if (profileError) {
        console.error("[hoc-tap-departments:profile]", profileError.message);
        return apiError("INTERNAL_ERROR", "Không đọc được hồ sơ học tập.");
      }

      const roleId = (profile as ProfileRow | null)?.role_id ?? null;
      return apiOk({
        departments: roleId
          ? buildHocTapDepartmentOptions([roleId], roleId, "profile")
          : [],
        source: "profile",
        persisted: true,
      });
    }

    const currentMembership = membership as MembershipRow;
    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("department_id")
      .eq("organization_id", currentMembership.organization_id);

    if (membersError) {
      console.error("[hoc-tap-departments:members]", membersError.message);
      return apiError("INTERNAL_ERROR", "Không đọc được danh sách phòng ban.");
    }

    const departments = buildHocTapDepartmentOptions(
      ((members ?? []) as DepartmentRow[]).map((row) => row.department_id),
      currentMembership.department_id,
      "supabase",
    );

    return apiOk({
      departments,
      source: "supabase",
      persisted: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hoc-tap-departments]", message);
    return apiError("INTERNAL_ERROR", "Không tải được danh sách phòng ban.");
  }
}
