import { apiError, apiOk } from "@/lib/api-error";
import { getPublicOrganizationBySlug } from "@/lib/organizations";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type PublicRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: PublicRouteContext) {
  const { slug } = await context.params;

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError(
      "FORBIDDEN",
      "Trang công ty cần cấu hình Supabase.",
    );
  }

  try {
    const organization = await getPublicOrganizationBySlug(
      createSupabaseServiceClient(),
      slug,
    );

    if (!organization) {
      return apiError("NOT_FOUND", "Không tìm thấy công ty.");
    }

    return apiOk({ organization });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[organizations:public-get]", message);
    return apiError("INTERNAL_ERROR", "Không đọc được thông tin công ty.");
  }
}
