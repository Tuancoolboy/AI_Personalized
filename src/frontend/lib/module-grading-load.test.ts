import { describe, expect, it } from "vitest";
import { mergePracticeReviews } from "./module-grading-load";
import type { PracticeReview } from "@/lib/client-api";

describe("mergePracticeReviews", () => {
  const submission: PracticeReview = {
    score: 72,
    feedback: "from image",
    strengths: [],
    improvements: [],
    reviewedAt: "2026-01-01T10:00:00Z",
    imageUrls: ["https://example.com/a.png"],
    imageCount: 1,
  };

  const grading: PracticeReview = {
    score: 68,
    feedback: "from grading table",
    strengths: [],
    improvements: ["Thêm tên khách hàng"],
    reviewedAt: "2026-01-02T10:00:00Z",
    managerReviewReason: "Email còn chung chung",
    grading: {
      rubricBreakdown: [],
      evidence: [],
      confidence: 0.62,
      reviewStatus: "needs-revision",
      rubricVersion: "practice-v1",
      model: "gpt-4o-mini",
    },
  };

  it("prefers newer grading row but keeps image urls", () => {
    const merged = mergePracticeReviews(submission, grading);
    expect(merged?.grading?.reviewStatus).toBe("needs-revision");
    expect(merged?.imageUrls).toEqual(["https://example.com/a.png"]);
    expect(merged?.managerReviewReason).toBe("Email còn chung chung");
  });
});
