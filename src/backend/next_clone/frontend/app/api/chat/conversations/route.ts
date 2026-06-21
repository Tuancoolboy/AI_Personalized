import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { listConversations } from "@/lib/chat-context";
import type { ChatAudience } from "@/lib/chat-types";
import { isManagerUser } from "@/lib/manager-auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return apiOk({ conversations: [] });
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const isManager = await isManagerUser();
  const audience: ChatAudience = isManager ? "manager" : "employee";

  try {
    const conversations = await listConversations(session.userId, audience);
    return apiOk({ conversations });
  } catch (err) {
    console.error("[chat-conversations]", err);
    return apiError("INTERNAL_ERROR", "Không đọc được danh sách hội thoại.");
  }
}
