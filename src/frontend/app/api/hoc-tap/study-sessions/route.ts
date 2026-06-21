import { randomUUID } from "crypto";
import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { calculateStudyHeartbeatSeconds } from "@/lib/hoc-tap-overview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MODULE_ID_PATTERN = /^[a-z0-9-]{1,100}$/;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SESSION_SECONDS = 8 * 60 * 60;

type StudySessionBody = {
  action?: unknown;
  moduleId?: unknown;
  sessionId?: unknown;
};

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: StudySessionBody;
  try {
    body = (await request.json()) as StudySessionBody;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const action = typeof body.action === "string" ? body.action : "";
  if (action !== "start" && action !== "heartbeat" && action !== "end") {
    return apiError("VALIDATION_ERROR", "Hành động phiên học không hợp lệ.");
  }

  if (action === "start") {
    const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
    if (!MODULE_ID_PATTERN.test(moduleId)) {
      return apiError("VALIDATION_ERROR", "moduleId không hợp lệ.");
    }
    const id = randomUUID();
    const startedAt = new Date().toISOString();
    if (session.mode === "demo") {
      return apiOk({ sessionId: id, startedAt, durationSeconds: 0, persisted: false });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("learning_study_sessions").insert({
      id,
      user_id: session.userId,
      module_id: moduleId,
      started_at: startedAt,
      last_seen_at: startedAt,
    });
    if (error) {
      console.error("[study-session:start]", error.message);
      return apiError("INTERNAL_ERROR", "Không bắt đầu được phiên học.");
    }
    return apiOk({ sessionId: id, startedAt, durationSeconds: 0, persisted: true });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return apiError("VALIDATION_ERROR", "sessionId không hợp lệ.");
  }
  if (session.mode === "demo") {
    return apiOk({ sessionId, durationSeconds: 0, ended: action === "end", persisted: false });
  }

  const supabase = await createSupabaseServerClient();
  const { data: row, error: readError } = await supabase
    .from("learning_study_sessions")
    .select("duration_seconds, last_seen_at, ended_at")
    .eq("id", sessionId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (readError) {
    console.error("[study-session:read]", readError.message);
    return apiError("INTERNAL_ERROR", "Không cập nhật được phiên học.");
  }
  if (!row) {
    return apiError("NOT_FOUND", "Không tìm thấy phiên học.");
  }
  if (row.ended_at) {
    return apiOk({
      sessionId,
      durationSeconds: Number(row.duration_seconds),
      ended: true,
      persisted: true,
    });
  }

  const now = new Date();
  const increment = calculateStudyHeartbeatSeconds(row.last_seen_at, now);
  const durationSeconds = Math.min(
    MAX_SESSION_SECONDS,
    Number(row.duration_seconds) + increment,
  );
  const update = {
    duration_seconds: durationSeconds,
    last_seen_at: now.toISOString(),
    ...(action === "end" ? { ended_at: now.toISOString() } : {}),
  };
  const { error: updateError } = await supabase
    .from("learning_study_sessions")
    .update(update)
    .eq("id", sessionId)
    .eq("user_id", session.userId);

  if (updateError) {
    console.error("[study-session:update]", updateError.message);
    return apiError("INTERNAL_ERROR", "Không cập nhật được phiên học.");
  }
  return apiOk({
    sessionId,
    durationSeconds,
    ended: action === "end",
    persisted: true,
  });
}
