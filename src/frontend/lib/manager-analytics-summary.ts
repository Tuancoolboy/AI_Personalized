import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingGradingSchema } from "@/lib/manager-grading";

export type OrgAssessmentSignals = {
  managerReviewCount: number;
  needsRevisionCount: number;
  belowPassQuizCount: number;
  schemaAvailable: boolean;
};

const PASS_THRESHOLD = 70;

export function formatOrgAssessmentSignals(
  signals: OrgAssessmentSignals,
): string {
  if (!signals.schemaAvailable) {
    return "";
  }

  const lines = [
    "TỔNG QUAN ĐÁNH GIÁ & QUIZ:",
    `- Bài chờ quản lý chấm (manager-review): ${signals.managerReviewCount}`,
    `- Bài cần nhân viên nộp lại (needs-revision): ${signals.needsRevisionCount}`,
    `- Nhân viên có quiz tốt nhất dưới ${PASS_THRESHOLD}%: ${signals.belowPassQuizCount}`,
  ];

  return lines.join("\n");
}

export async function fetchOrgAssessmentSignals(
  supabase: SupabaseClient,
  organizationId: string,
  employeeIds: string[],
): Promise<OrgAssessmentSignals> {
  const empty: OrgAssessmentSignals = {
    managerReviewCount: 0,
    needsRevisionCount: 0,
    belowPassQuizCount: 0,
    schemaAvailable: false,
  };

  const [{ count: managerReviewCount, error: reviewError }, { count: revisionCount, error: revisionError }] =
    await Promise.all([
      supabase
        .from("grading_results")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("review_status", "manager-review"),
      supabase
        .from("grading_results")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("review_status", "needs-revision"),
    ]);

  const gradingError = reviewError ?? revisionError;
  if (gradingError && isMissingGradingSchema(gradingError.message)) {
    return empty;
  }

  let belowPassQuizCount = 0;
  if (employeeIds.length > 0) {
    const { data: quizRows } = await supabase
      .from("quiz_results")
      .select("user_id, score")
      .in("user_id", employeeIds);

    const bestByUser = new Map<string, number>();
    for (const row of quizRows ?? []) {
      const userId = row.user_id as string;
      const score = row.score as number;
      const prev = bestByUser.get(userId);
      if (prev === undefined || score > prev) {
        bestByUser.set(userId, score);
      }
    }

    for (const userId of employeeIds) {
      const best = bestByUser.get(userId);
      if (best !== undefined && best < PASS_THRESHOLD) {
        belowPassQuizCount += 1;
      }
    }
  }

  return {
    managerReviewCount: managerReviewCount ?? 0,
    needsRevisionCount: revisionCount ?? 0,
    belowPassQuizCount,
    schemaAvailable: true,
  };
}
