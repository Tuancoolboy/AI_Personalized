import { describe, expect, it } from "vitest";
import { calculateResult, type AssessmentAnswer } from "@/lib/assessment";
import { buildOnboardingAssessmentResultInsert } from "@/lib/onboarding-assessment-result";

describe("buildOnboardingAssessmentResultInsert", () => {
  it("keeps raw answers and computed survey result for database persistence", () => {
    const answers: AssessmentAnswer[] = [
      { questionId: "q1-position", value: "mid" },
      { questionId: "q2-industry", value: "service" },
      { questionId: "q3-daily-tasks", value: ["email", "report"] },
      { questionId: "q6-ai-tools", value: ["chatgpt"] },
    ];
    const result = calculateResult(answers);

    const row = buildOnboardingAssessmentResultInsert({
      roleId: "marketing",
      answers,
      result,
    });

    expect(row).toMatchObject({
      role_id: "marketing",
      total_score: result.totalScore,
      ai_level: result.aiLevel,
      daily_tasks: ["email", "report"],
      tools_tried: ["chatgpt"],
      industry: "service",
      position: "mid",
    });
    expect(row.answers).toEqual(answers);
    expect(row.result).toEqual(result);
  });
});
