import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  loadChatHistory,
  loadCoreContext,
  loadResumeLesson,
  resolveProfileBasics,
} from "@/lib/chat-context";
import type { ChatAudience, ResumeLesson } from "@/lib/chat-types";
import type { RoleId } from "@/lib/openai";
import { isManagerUser } from "@/lib/manager-auth";
import { ROLES } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

async function loadResumeLessonForAudience(
  userId: string,
  audience: ChatAudience,
): Promise<ResumeLesson | null> {
  if (audience !== "employee") return null;
  const profile = await resolveProfileBasics(userId);
  if (!profile.roleId || !(profile.roleId in ROLES)) return null;
  return loadResumeLesson(userId, profile.roleId as RoleId);
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiOk({
      conversationId: null,
      coreContext: null,
      resumeLesson: null,
      messages: [],
    });
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const isManager = await isManagerUser();
  const audience: ChatAudience = isManager ? "manager" : "employee";
  const { searchParams } = new URL(request.url);
  const draft = searchParams.get("draft") === "1";
  const conversationIdParam = searchParams.get("conversation_id");

  try {
    if (draft) {
      const [coreContext, resumeLesson] = await Promise.all([
        loadCoreContext(session.userId, audience),
        loadResumeLessonForAudience(session.userId, audience),
      ]);
      return apiOk({
        conversationId: null,
        coreContext: coreContext || null,
        resumeLesson,
        messages: [],
      });
    }

    const history = await loadChatHistory(
      session.userId,
      audience,
      conversationIdParam,
    );
    return apiOk(history);
  } catch (err) {
    console.error("[chat-history]", err);
    return apiError("INTERNAL_ERROR", "Không đọc được lịch sử chat.");
  }
}
