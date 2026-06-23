import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HocTapAudienceType = "community" | "company";

export type HocTapAudience = {
  organizationId: string;
  organizationName: string;
  type: HocTapAudienceType;
  departmentId: string;
};

type HocTapAudienceRpcRow = {
  organization_id?: unknown;
  organization_name?: unknown;
  audience_type?: unknown;
  department_id?: unknown;
};

export async function resolveHocTapAudience(): Promise<HocTapAudience> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_hoc_tap_audience");

  if (error) {
    throw new Error(error.message);
  }

  return parseHocTapAudience(data);
}

export function parseHocTapAudience(value: unknown): HocTapAudience {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Không xác định được không gian Học tập.");
  }

  const row = value as HocTapAudienceRpcRow;
  const organizationId =
    typeof row.organization_id === "string" ? row.organization_id : "";
  const organizationName =
    typeof row.organization_name === "string" ? row.organization_name : "";
  const type =
    row.audience_type === "company" ? "company" : row.audience_type === "community"
      ? "community"
      : null;
  const departmentId =
    typeof row.department_id === "string" && row.department_id
      ? row.department_id
      : "khac";

  if (!organizationId || !organizationName || !type) {
    throw new Error("Không xác định được không gian Học tập.");
  }

  return {
    organizationId,
    organizationName,
    type,
    departmentId,
  };
}
