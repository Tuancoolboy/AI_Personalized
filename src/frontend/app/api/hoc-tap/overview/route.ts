import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  buildDemoHocTapOverview,
  buildHocTapOverviewRange,
  buildHocTapOverviewSummary,
  type HocTapDepartmentLeaderboardRow,
  type HocTapLeaderboardRow,
  isHocTapOverviewDays,
} from "@/lib/hoc-tap-overview";
import { resolveHocTapAudience } from "@/lib/hoc-tap-audience";
import {
  getHocTapDepartmentLabel,
  normalizeDepartmentId,
} from "@/lib/hoc-tap-departments";
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
  let audience;
  try {
    audience = await resolveHocTapAudience();
  } catch (audienceError) {
    console.error("[hoc-tap-overview:audience]", audienceError);
    return apiError(
      "INTERNAL_ERROR",
      "Không xác định được không gian Học tập.",
    );
  }
  const previousFrom = new Date(range.previousFromMs).toISOString();
  const toExclusive = new Date(range.toExclusiveMs).toISOString();

  const [quizResult, progressResult, sessionsResult, pointsResult, leaderboardResult] =
    await Promise.all([
    supabase
      .from("quiz_results")
      .select("created_at, quiz_id")
      .eq("user_id", session.userId)
      .eq("organization_id", audience.organizationId)
      .eq("quiz_source", "hoc-tap")
      .order("created_at", { ascending: false }),
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
    supabase
      .from("points_ledger")
      .select("points, created_at")
      .eq("user_id", session.userId)
      .eq("organization_id", audience.organizationId)
      .eq("source", "quiz")
      .order("created_at", { ascending: true }),
    supabase.rpc("get_hoc_tap_leaderboard"),
  ]);

  const queryError =
    quizResult.error ??
    progressResult.error ??
    sessionsResult.error ??
    pointsResult.error ??
    leaderboardResult.error;
  if (queryError) {
    console.error("[hoc-tap-overview]", queryError.message);
    return apiError("INTERNAL_ERROR", "Không đọc được dữ liệu Tổng quan.");
  }

  const leaderboard = buildLeaderboard(leaderboardResult.data);
  const currentRank =
    leaderboard.individuals.find((row) => row.isCurrentUser)?.rank ?? null;
  const overview = buildHocTapOverviewSummary({
    days: rawDays,
    quizzes: (quizResult.data ?? []).map((row) => ({
      createdAt: row.created_at,
      quizId: row.quiz_id,
    })),
    progress: (progressResult.data ?? []).map((row) => ({
      status: row.status,
      completedAt: row.completed_at,
    })),
    studySessions: (sessionsResult.data ?? []).map((row) => ({
      startedAt: row.started_at,
      durationSeconds: Number(row.duration_seconds),
    })),
    points: (pointsResult.data ?? []).map((row) => ({
      createdAt: row.created_at,
      points: Number(row.points),
    })),
    audience: {
      type: audience.type,
      organizationId: audience.organizationId,
      name: audience.organizationName,
    },
    rank: currentRank,
    leaderboard,
  });

  return apiOk({ ...overview, source: "supabase" });
}

function buildLeaderboard(value: unknown): {
  individuals: HocTapLeaderboardRow[];
  departments: HocTapDepartmentLeaderboardRow[];
} {
  const rows = Array.isArray(value) ? value : [];
  const individuals = rows
    .map((value): HocTapLeaderboardRow | null => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
      }
      const row = value as Record<string, unknown>;
      const userId = typeof row.user_id === "string" ? row.user_id : "";
      const name =
        typeof row.display_name === "string" ? row.display_name.trim() : "";
      const departmentId = normalizeDepartmentId(
        typeof row.department_id === "string" ? row.department_id : null,
      );
      const totalXp = Number(row.total_xp);
      const rank = Number(row.position_rank);
      if (
        !userId ||
        !name ||
        !Number.isFinite(totalXp) ||
        !Number.isFinite(rank)
      ) {
        return null;
      }
      return {
        userId,
        name,
        departmentId,
        departmentLabel: getHocTapDepartmentLabel(departmentId),
        totalXp: Math.max(0, Math.round(totalXp)),
        rank: Math.max(1, Math.round(rank)),
        isCurrentUser: row.is_current_user === true,
      };
    })
    .filter((row): row is HocTapLeaderboardRow => Boolean(row));

  const totals = new Map<
    string,
    { departmentLabel: string; totalXp: number; members: Set<string> }
  >();
  for (const row of individuals) {
    const current = totals.get(row.departmentId) ?? {
      departmentLabel: row.departmentLabel,
      totalXp: 0,
      members: new Set<string>(),
    };
    current.totalXp += row.totalXp;
    current.members.add(row.userId);
    totals.set(row.departmentId, current);
  }

  const departments = [...totals.entries()]
    .map(([departmentId, row]) => ({
      departmentId,
      departmentLabel: row.departmentLabel,
      totalXp: row.totalXp,
      memberCount: row.members.size,
      rank: 0,
    }))
    .sort(
      (left, right) =>
        right.totalXp - left.totalXp ||
        left.departmentLabel.localeCompare(right.departmentLabel, "vi"),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return { individuals, departments };
}
