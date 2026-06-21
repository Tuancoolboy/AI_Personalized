import { apiError, apiOk } from "@/lib/api-error";
import {
  mapInviteLink,
  rotateInviteLinkForManager,
} from "@/lib/company-invite-links";
import { requireManagerContext } from "@/lib/manager-auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới đổi được token mời.");
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError(
      "INTERNAL_ERROR",
      !isSupabaseConfigured()
        ? "Link mời thật cần cấu hình Supabase."
        : "Thiếu SUPABASE_SERVICE_ROLE_KEY nên chưa thể đổi token mời.",
    );
  }

  try {
    const supabase = createSupabaseServiceClient();
    const row = await rotateInviteLinkForManager(
      supabase,
      context.membership.organizationId,
      context.session.userId,
    );

    return apiOk({
      link: mapInviteLink(row, new URL(request.url).origin),
      organizationName: context.membership.organizationName,
      persisted: true,
      message: "Đã đổi token. Link cũ không còn hiệu lực.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[manager-invite-links:rotate]", message);
    return apiError("INTERNAL_ERROR", "Không đổi được token mời.");
  }
}
