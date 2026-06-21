import { describe, expect, it } from "vitest";
import {
  deriveReviewStatus,
  normalizeGradingResult,
} from "./grader-types";

describe("assignment grader", () => {
  it("normalizes structured grading payload", () => {
    const result = normalizeGradingResult(
      {
        score: 78,
        feedback: "Làm tốt.",
        rubricBreakdown: [
          {
            criterion: "Đã dùng AI",
            points: 35,
            maxPoints: 40,
            note: "Có output AI rõ",
          },
        ],
        evidence: ["Thấy email mẫu trong ảnh"],
        strengths: ["Rõ ràng"],
        improvements: ["Thêm CTA"],
        confidence: 0.82,
      },
      "gpt-4o-mini",
    );

    expect(result).toMatchObject({
      score: 78,
      reviewStatus: "auto-approved",
      rubricVersion: "practice-v1",
      model: "gpt-4o-mini",
    });
  });

  it("routes low confidence to manager review", () => {
    expect(deriveReviewStatus(75, 0.55)).toBe("manager-review");
  });

  it("routes near pass boundary to manager review", () => {
    expect(deriveReviewStatus(72, 0.9)).toBe("manager-review");
  });

  it("routes low score to needs revision", () => {
    expect(deriveReviewStatus(55, 0.9)).toBe("needs-revision");
  });

  it("builds open-text grader prompt with role context", async () => {
    const { buildOpenTextGraderPrompt } = await import("./grader");
    const prompt = buildOpenTextGraderPrompt(
      "kinh-doanh",
      "Viết email chốt sale cho khách B2B",
      "Email AI cho sales",
    );
    expect(prompt).toContain("kinh doanh");
    expect(prompt).toContain("Email AI cho sales");
  });
});
