import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { buildCompanyEntryPath } from "@/lib/organization-slug";
import {
  getOrganizationById,
  getUserOrganizationMembership,
  updateOrganizationForOwner,
} from "@/lib/organizations";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError(
      "FORBIDDEN",
      "API công ty chỉ khả dụng khi đã cấu hình Supabase.",
    );
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const supabase = createSupabaseServiceClient();
    const membership = await getUserOrganizationMembership(
      supabase,
      session.userId,
    );
    if (!membership) {
      return apiOk({ organization: null, membership: null });
    }

    const organization = await getOrganizationById(
      supabase,
      membership.organization_id,
    );

    return apiOk({
      organization,
      membership: {
        role: membership.member_role,
        organizationId: membership.organization_id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[organizations:current-get]", message);
    return apiError("INTERNAL_ERROR", "Không đọc được thông tin công ty.");
  }
}

type UpdateOrganizationPayload = {
  name?: unknown;
  logoUrl?: unknown;
  settings?: unknown;
};

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError(
      "FORBIDDEN",
      "API công ty chỉ khả dụng khi đã cấu hình Supabase.",
    );
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: UpdateOrganizationPayload;
  try {
    body = (await request.json()) as UpdateOrganizationPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  try {
    const supabase = createSupabaseServiceClient();
    const membership = await getUserOrganizationMembership(
      supabase,
      session.userId,
    );
    if (!membership) {
      return apiError("NOT_FOUND", "Bạn chưa thuộc công ty nào.");
    }

    const organization = await updateOrganizationForOwner({
      supabase,
      organizationId: membership.organization_id,
      userId: session.userId,
      name: typeof body.name === "string" ? body.name : undefined,
      logoUrl:
        typeof body.logoUrl === "string" || body.logoUrl === null
          ? (body.logoUrl as string | null)
          : undefined,
      settings:
        body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
          ? (body.settings as Record<string, unknown>)
          : undefined,
    });

    return apiOk({
      organization,
      entryPath: buildCompanyEntryPath(organization.slug),
      message: "Đã cập nhật công ty.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("FORBIDDEN:")) {
      return apiError("FORBIDDEN", message.replace("FORBIDDEN: ", ""));
    }
    if (message.startsWith("VALIDATION:")) {
      return apiError("VALIDATION_ERROR", message.replace("VALIDATION: ", ""));
    }
    console.error("[organizations:current-patch]", message);
    return apiError("INTERNAL_ERROR", "Không cập nhật được công ty.");
  }
}
