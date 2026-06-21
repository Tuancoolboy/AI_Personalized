import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  buildDemoHocTapOverview,
  buildHocTapOverviewRange,
  buildHocTapOverviewSummary,
  isHocTapOverviewDays,
} from "@/lib/hoc-tap-overview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const rawDays = Number(new URL(request.url).searchParams.get("days") ?? "7");
  if (!isHocTapOverviewDays(rawDays)) {
    return apiError("VALIDATION_ERROR", "Khoảng thời gian chỉ hỗ trợ 7 hoặc 30 ngày.");
  }

  if (session.mode === "demo") {
    const demo = buildDemoHocTapOverview(rawDays);
    return apiOk({ ...demo, source: "demo" });
  }

  const range = buildHocTapOverviewRange(rawDays);
  const supabase = await createSupabaseServerClient();
  const previousFrom = new Date(range.previousFromMs).toISOString();
  const toExclusive = new Date(range.toExclusiveMs).toISOString();

  const [quizResult, progressResult, sessionsResult] = await Promise.all([
    supabase
      .from("quiz_results")
      .select("created_at")
      .eq("user_id", session.userId)
      .gte("created_at", previousFrom)
      .lt("created_at", toExclusive),
    supabase
      .from("module_progress")
      .select("status, completed_at")
      .eq("user_id", session.userId),
    supabase
      .from("learning_study_sessions")
      .select("started_at, duration_seconds")
      .eq("user_id", session.userId)
      .gte("started_at", previousFrom)
      .lt("started_at", toExclusive),
  ]);

  const queryError = quizResult.error ?? progressResult.error ?? sessionsResult.error;
  if (queryError) {
    console.error("[hoc-tap-overview]", queryError.message);
    return apiError("INTERNAL_ERROR", "Không đọc được dữ liệu Tổng quan.");
  }

  const overview = buildHocTapOverviewSummary({
    days: rawDays,
    quizzes: (quizResult.data ?? []).map((row) => ({
      createdAt: row.created_at,
    })),
    progress: (progressResult.data ?? []).map((row) => ({
      status: row.status,
      completedAt: row.completed_at,
    })),
    studySessions: (sessionsResult.data ?? []).map((row) => ({
      startedAt: row.started_at,
      durationSeconds: Number(row.duration_seconds),
    })),
  });

  return apiOk({ ...overview, source: "supabase" });
}
