import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { buildCompanyEntryPath } from "@/lib/organization-slug";
import { createOrganizationForOwner } from "@/lib/organizations";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type CreateOrganizationPayload = {
  name?: unknown;
  slug?: unknown;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError(
      "FORBIDDEN",
      "Tạo công ty thật cần cấu hình Supabase và service role.",
    );
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: CreateOrganizationPayload;
  try {
    body = (await request.json()) as CreateOrganizationPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : undefined;
  if (!name) {
    return apiError("VALIDATION_ERROR", "Vui lòng nhập tên công ty.");
  }

  try {
    const organization = await createOrganizationForOwner({
      supabase: createSupabaseServiceClient(),
      userId: session.userId,
      name,
      slug,
    });

    return apiOk({
      organization,
      entryPath: buildCompanyEntryPath(organization.slug),
      message: "Đã tạo công ty thành công.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("CONFLICT:")) {
      return apiError("CONFLICT", message.replace("CONFLICT: ", ""));
    }
    if (message.startsWith("VALIDATION:")) {
      return apiError("VALIDATION_ERROR", message.replace("VALIDATION: ", ""));
    }
    console.error("[organizations:create]", message);
    return apiError("INTERNAL_ERROR", "Không tạo được công ty.");
  }
}
