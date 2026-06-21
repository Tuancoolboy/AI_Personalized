import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { deleteConversation } from "@/lib/chat-context";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return apiError("NOT_FOUND", "Không tìm thấy hội thoại.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const { id } = await context.params;
  if (!id) {
    return apiError("VALIDATION_ERROR", "Thiếu id hội thoại.");
  }

  try {
    await deleteConversation(session.userId, id);
    return apiOk({ deleted: true });
  } catch (err) {
    console.error("[chat-conversation-delete]", err);
    return apiError("INTERNAL_ERROR", "Không xóa được hội thoại.");
  }
}
