import type { GradingReviewStatus, RubricBreakdownItem } from "@/lib/agents/grader-types";

export type ManagerGradingQueueItem = {
  id: string;
  userId: string;
  employeeName: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  score: number;
  confidence: number;
  reviewStatus: GradingReviewStatus;
  feedback: string;
  rubricBreakdown: RubricBreakdownItem[];
  evidence: string[];
  strengths: string[];
  improvements: string[];
  submittedAt: string;
  model: string | null;
};

export type ManagerReviewAction = "accept" | "adjust" | "needs-revision";

export type ManagerReviewDecision = {
  reviewStatus: GradingReviewStatus;
  finalScore: number;
};

export function resolveManagerReviewDecision(
  action: ManagerReviewAction,
  currentScore: number,
  adjustedScore?: number,
): ManagerReviewDecision {
  if (action === "accept") {
    return { reviewStatus: "auto-approved", finalScore: currentScore };
  }
  if (action === "needs-revision") {
    return { reviewStatus: "needs-revision", finalScore: currentScore };
  }

  const nextScore =
    typeof adjustedScore === "number" && Number.isFinite(adjustedScore)
      ? Math.min(100, Math.max(0, Math.round(adjustedScore)))
      : currentScore;

  return { reviewStatus: "auto-approved", finalScore: nextScore };
}

export const DEMO_MANAGER_GRADING_QUEUE: ManagerGradingQueueItem[] = [
  {
    id: "demo-grade-1",
    userId: "demo-user-1",
    employeeName: "Nguyễn Văn A",
    moduleId: "kinh-doanh-m2",
    moduleTitle: "Viết email chốt sale bằng AI",
    score: 68,
    confidence: 0.62,
    reviewStatus: "manager-review",
    feedback:
      "Bài có dùng AI nhưng email còn chung chung, thiếu thông tin khách hàng cụ thể.",
    rubricBreakdown: [
      {
        criterion: "Đã dùng AI / nội dung liên quan bài học",
        points: 30,
        maxPoints: 40,
        note: "Có output AI",
      },
      {
        criterion: "Phù hợp vai trò kinh doanh",
        points: 22,
        maxPoints: 30,
        note: "Thiếu CTA rõ",
      },
    ],
    evidence: ["Thấy email mẫu chưa có tên khách"],
    strengths: ["Đã thử prompt theo bài học"],
    improvements: ["Thêm tên công ty và lợi ích cụ thể"],
    submittedAt: new Date(Date.now() - 3600_000).toISOString(),
    model: "gpt-4o-mini",
  },
];

type GradingResultRow = {
  id: string;
  user_id: string;
  score: number;
  confidence: number;
  review_status: GradingReviewStatus;
  feedback: string;
  rubric_breakdown: RubricBreakdownItem[] | null;
  evidence: string[] | null;
  strengths: string[] | null;
  improvements: string[] | null;
  created_at: string;
  model: string | null;
  assessment_submissions?: { legacy_module_id: string | null } | null;
  profiles?: { full_name: string | null } | null;
};

export function mapGradingRowToQueueItem(
  row: GradingResultRow,
  moduleTitle?: string | null,
): ManagerGradingQueueItem {
  return {
    id: row.id,
    userId: row.user_id,
    employeeName: row.profiles?.full_name ?? null,
    moduleId: row.assessment_submissions?.legacy_module_id ?? null,
    moduleTitle: moduleTitle ?? null,
    score: row.score,
    confidence: Number(row.confidence),
    reviewStatus: row.review_status,
    feedback: row.feedback,
    rubricBreakdown: row.rubric_breakdown ?? [],
    evidence: row.evidence ?? [],
    strengths: row.strengths ?? [],
    improvements: row.improvements ?? [],
    submittedAt: row.created_at,
    model: row.model,
  };
}

export function isMissingGradingSchema(message: string): boolean {
  return /grading_results|does not exist/i.test(message);
}
