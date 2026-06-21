import type { PracticeReview } from "@/lib/client-api";
import type {
  GradingReviewStatus,
  RubricBreakdownItem,
} from "@/lib/agents/grader-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GradingRow = {
  id: string;
  score: number;
  feedback: string;
  strengths: string[] | null;
  improvements: string[] | null;
  rubric_breakdown: RubricBreakdownItem[] | null;
  evidence: string[] | null;
  confidence: number;
  review_status: GradingReviewStatus;
  rubric_version: string;
  model: string | null;
  created_at: string;
  submission_id: string;
};

function isMissingGradingTable(message: string): boolean {
  return /grading_results|assessment_submissions|does not exist/i.test(message);
}

function mapGradingRow(
  row: GradingRow,
  managerReviewReason?: string | null,
): PracticeReview {
  return {
    id: row.id,
    score: row.score,
    feedback: row.feedback,
    strengths: row.strengths ?? [],
    improvements: row.improvements ?? [],
    reviewedAt: row.created_at,
    gradingResultId: row.id,
    gradingPersisted: true,
    managerReviewReason: managerReviewReason ?? undefined,
    grading: {
      rubricBreakdown: row.rubric_breakdown ?? [],
      evidence: row.evidence ?? [],
      confidence: Number(row.confidence),
      reviewStatus: row.review_status,
      rubricVersion: row.rubric_version,
      model: row.model,
    },
  };
}

export async function loadLatestModuleGrading(
  userId: string,
  moduleId: string,
): Promise<PracticeReview | null> {
  const supabase = await createSupabaseServerClient();

  const { data: submissions, error: subError } = await supabase
    .from("assessment_submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("legacy_module_id", moduleId)
    .order("submitted_at", { ascending: false })
    .limit(10);

  if (subError) {
    if (isMissingGradingTable(subError.message)) return null;
    throw subError;
  }

  const submissionIds = (submissions ?? []).map((s) => s.id as string);
  if (submissionIds.length === 0) return null;

  const { data: grades, error: gradeError } = await supabase
    .from("grading_results")
    .select(
      "id, score, feedback, strengths, improvements, rubric_breakdown, evidence, confidence, review_status, rubric_version, model, created_at, submission_id",
    )
    .eq("user_id", userId)
    .in("submission_id", submissionIds)
    .order("created_at", { ascending: false })
    .limit(1);

  if (gradeError) {
    if (isMissingGradingTable(gradeError.message)) return null;
    throw gradeError;
  }

  const row = (grades ?? [])[0] as GradingRow | undefined;
  if (!row) return null;

  let managerReviewReason: string | null = null;
  if (row.review_status === "needs-revision") {
    const { data: reviews } = await supabase
      .from("grading_reviews")
      .select("reason, created_at")
      .eq("grading_result_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1);
    managerReviewReason = (reviews?.[0]?.reason as string | undefined) ?? null;
  }

  return mapGradingRow(row, managerReviewReason);
}

export function mergePracticeReviews(
  fromSubmission: PracticeReview | null,
  fromGrading: PracticeReview | null,
): PracticeReview | null {
  if (!fromSubmission && !fromGrading) return null;
  if (!fromSubmission) return fromGrading;
  if (!fromGrading) return fromSubmission;

  const submissionTime = fromSubmission.reviewedAt
    ? new Date(fromSubmission.reviewedAt).getTime()
    : 0;
  const gradingTime = fromGrading.reviewedAt
    ? new Date(fromGrading.reviewedAt).getTime()
    : 0;

  const primary = gradingTime >= submissionTime ? fromGrading : fromSubmission;
  const secondary = gradingTime >= submissionTime ? fromSubmission : fromGrading;

  return {
    ...primary,
    imageUrls: secondary.imageUrls ?? primary.imageUrls,
    imageCount: secondary.imageCount ?? primary.imageCount,
    grading: primary.grading ?? secondary.grading,
    improvements:
      primary.improvements.length > 0
        ? primary.improvements
        : secondary.improvements,
    managerReviewReason:
      primary.managerReviewReason ?? secondary.managerReviewReason,
    gradingResultId: primary.gradingResultId ?? secondary.gradingResultId,
    gradingPersisted:
      primary.gradingPersisted ?? secondary.gradingPersisted,
  };
}
