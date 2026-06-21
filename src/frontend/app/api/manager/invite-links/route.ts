import { apiError, apiOk } from "@/lib/api-error";
import {
  getActiveInviteLinkForManager,
  getOrCreateActiveInviteLinkForManager,
  mapInviteLink,
} from "@/lib/company-invite-links";
import { requireManagerContext } from "@/lib/manager-auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function missingSupabaseMessage(): string {
  if (!isSupabaseConfigured()) return "Link mời thật cần cấu hình Supabase.";
  return "Thiếu SUPABASE_SERVICE_ROLE_KEY nên chưa thể tạo link mời thật.";
}

export async function GET(request: Request) {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới xem được link mời.");
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiOk({
      link: null,
      organizationName: context.membership.organizationName,
      persisted: false,
      message: missingSupabaseMessage(),
    });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const row = await getActiveInviteLinkForManager(
      supabase,
      context.membership.organizationId,
      context.session.userId,
    );

    return apiOk({
      link: row ? mapInviteLink(row, new URL(request.url).origin) : null,
      organizationName: context.membership.organizationName,
      persisted: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[manager-invite-links:get]", message);
    return apiError("INTERNAL_ERROR", "Không tải được link mời.");
  }
}

export async function POST(request: Request) {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới tạo được link mời.");
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError("INTERNAL_ERROR", missingSupabaseMessage());
  }

  try {
    const supabase = createSupabaseServiceClient();
    const row = await getOrCreateActiveInviteLinkForManager(
      supabase,
      context.membership.organizationId,
      context.session.userId,
    );

    return apiOk({
      link: mapInviteLink(row, new URL(request.url).origin),
      organizationName: context.membership.organizationName,
      persisted: true,
      message: "Đã sẵn sàng link mời cho nhân viên.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[manager-invite-links:create]", message);
    return apiError("INTERNAL_ERROR", "Không tạo được link mời.");
  }
}
