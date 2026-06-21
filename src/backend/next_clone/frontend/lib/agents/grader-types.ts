export const GRADER_RUBRIC_VERSION = "practice-v1";

export type GradingReviewStatus =
  | "auto-approved"
  | "manager-review"
  | "needs-revision";

export type RubricBreakdownItem = {
  criterion: string;
  points: number;
  maxPoints: number;
  note: string;
};

export type GradingResult = {
  score: number;
  feedback: string;
  rubricBreakdown: RubricBreakdownItem[];
  evidence: string[];
  strengths: string[];
  improvements: string[];
  confidence: number;
  reviewStatus: GradingReviewStatus;
  rubricVersion: string;
  model: string | null;
};

export type RawGraderPayload = {
  score?: number;
  feedback?: string;
  rubricBreakdown?: Array<Partial<RubricBreakdownItem>>;
  evidence?: string[];
  strengths?: string[];
  improvements?: string[];
  confidence?: number;
};

export type PracticeImagePayload = {
  base64: string;
  mimeType: string;
};

export const PRACTICE_RUBRIC_CRITERIA = [
  { criterion: "Đã dùng AI / nội dung liên quan bài học", maxPoints: 40 },
  { criterion: "Phù hợp vai trò công việc", maxPoints: 30 },
  { criterion: "Có chỉnh sửa / cá nhân hóa", maxPoints: 20 },
  { criterion: "Hướng tới dùng được trong công việc", maxPoints: 10 },
] as const;

export function deriveReviewStatus(
  score: number,
  confidence: number,
  passBoundary = 70,
): GradingReviewStatus {
  if (confidence < 0.7) return "manager-review";
  if (score >= passBoundary - 5 && score <= passBoundary + 4) {
    return "manager-review";
  }
  if (score < 60) return "needs-revision";
  return "auto-approved";
}

export function normalizeGradingResult(
  raw: RawGraderPayload,
  model: string | null,
): GradingResult | null {
  const score =
    typeof raw.score === "number"
      ? Math.min(100, Math.max(0, Math.round(raw.score)))
      : null;
  if (score === null || typeof raw.feedback !== "string") return null;

  const strengths = Array.isArray(raw.strengths)
    ? raw.strengths.filter((s): s is string => typeof s === "string").slice(0, 5)
    : [];
  const improvements = Array.isArray(raw.improvements)
    ? raw.improvements
        .filter((s): s is string => typeof s === "string")
        .slice(0, 5)
    : [];
  const evidence = Array.isArray(raw.evidence)
    ? raw.evidence.filter((s): s is string => typeof s === "string").slice(0, 8)
    : [];

  const rubricBreakdown = Array.isArray(raw.rubricBreakdown)
    ? raw.rubricBreakdown
        .map((item) => ({
          criterion: String(item.criterion ?? "").trim(),
          points: Math.max(0, Math.round(Number(item.points ?? 0))),
          maxPoints: Math.max(1, Math.round(Number(item.maxPoints ?? 1))),
          note: String(item.note ?? "").trim(),
        }))
        .filter((item) => item.criterion.length > 0)
        .slice(0, 8)
    : [];

  const confidence =
    typeof raw.confidence === "number"
      ? Math.min(1, Math.max(0, raw.confidence))
      : estimateConfidence(score, rubricBreakdown, evidence);

  return {
    score,
    feedback: raw.feedback.trim(),
    rubricBreakdown,
    evidence,
    strengths,
    improvements,
    confidence,
    reviewStatus: deriveReviewStatus(score, confidence),
    rubricVersion: GRADER_RUBRIC_VERSION,
    model,
  };
}

function estimateConfidence(
  score: number,
  rubricBreakdown: RubricBreakdownItem[],
  evidence: string[],
): number {
  let confidence = 0.55;
  if (rubricBreakdown.length >= 3) confidence += 0.15;
  if (evidence.length >= 1) confidence += 0.15;
  if (score >= 40 && score <= 95) confidence += 0.1;
  return Math.min(0.95, confidence);
}

export function toLegacyPracticeReview(result: GradingResult): {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
} {
  return {
    score: result.score,
    feedback: result.feedback,
    strengths: result.strengths,
    improvements: result.improvements,
  };
}
