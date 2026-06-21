import { apiError, apiOk } from "@/lib/api-error";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import { requireManagerContext } from "@/lib/manager-auth";
import {
  DEMO_MANAGER_GRADING_QUEUE,
  isMissingGradingSchema,
  mapGradingRowToQueueItem,
} from "@/lib/manager-grading";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export async function GET() {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới xem được hàng đợi chấm điểm.");
  }

  if (!isSupabaseConfigured() || context.membership.organizationId === "demo") {
    return apiOk({
      items: DEMO_MANAGER_GRADING_QUEUE,
      persisted: false,
      message: "Dữ liệu demo — bật Supabase + migration 0020 để dùng queue thật.",
    });
  }

  const supabase = createSupabaseServiceClient();
  const orgId = context.membership.organizationId;

  const { data, error } = await supabase
    .from("grading_results")
    .select(
      `
      id,
      user_id,
      score,
      confidence,
      review_status,
      feedback,
      rubric_breakdown,
      evidence,
      strengths,
      improvements,
      created_at,
      model,
      submission_id,
      assessment_submissions ( legacy_module_id )
    `,
    )
    .eq("organization_id", orgId)
    .eq("review_status", "manager-review")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingGradingSchema(error.message)) {
      return apiOk({
        items: DEMO_MANAGER_GRADING_QUEUE,
        persisted: false,
        message:
          "Chưa có bảng grading — chạy migration 0020_assessment_grading_schema.sql.",
      });
    }
    console.error("[manager/grading GET]", error.message);
    return apiError("INTERNAL_ERROR", "Không đọc được hàng đợi chấm điểm.");
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id as string))];
  const profileMap = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, profile.full_name);
    }
  }

  const items = rows.map((row) => {
    const rawSubmission = (
      row as { assessment_submissions?: unknown }
    ).assessment_submissions;
    const submission =
      Array.isArray(rawSubmission) ? rawSubmission[0] : rawSubmission;
    const moduleId =
      submission &&
      typeof submission === "object" &&
      "legacy_module_id" in submission
        ? ((submission as { legacy_module_id?: string | null })
            .legacy_module_id ?? null)
        : null;
    const mod = moduleId ? getLearningModuleById(moduleId) : null;
    return mapGradingRowToQueueItem(
      {
        id: row.id as string,
        user_id: row.user_id as string,
        score: row.score as number,
        confidence: row.confidence as number,
        review_status: row.review_status as Parameters<
          typeof mapGradingRowToQueueItem
        >[0]["review_status"],
        feedback: row.feedback as string,
        rubric_breakdown: row.rubric_breakdown as Parameters<
          typeof mapGradingRowToQueueItem
        >[0]["rubric_breakdown"],
        evidence: row.evidence as string[] | null,
        strengths: row.strengths as string[] | null,
        improvements: row.improvements as string[] | null,
        created_at: row.created_at as string,
        model: row.model as string | null,
        profiles: { full_name: profileMap.get(row.user_id as string) ?? null },
        assessment_submissions: moduleId ? { legacy_module_id: moduleId } : null,
      },
      mod?.title ?? null,
    );
  });

  return apiOk({
    items,
    persisted: true,
    message: items.length === 0 ? "Không có bài chờ duyệt." : undefined,
  });
}
