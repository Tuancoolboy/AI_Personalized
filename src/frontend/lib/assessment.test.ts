import { describe, expect, it } from "vitest";
import { calculateResult, type AssessmentAnswer } from "./assessment";

describe("assessment", () => {
  it("calculates result from likert answers", () => {
    const answers: AssessmentAnswer[] = [
      { questionId: "q1-position", value: "junior" },
      { questionId: "q2-industry", value: "retail" },
      { questionId: "q4-ai-frequency", value: "never" },
    ];
    const result = calculateResult(answers);
    expect(result.aiLevel).toBeGreaterThanOrEqual(0);
    expect(result.aiLevel).toBeLessThanOrEqual(5);
    expect(result.levelLabel).toBeTruthy();
    expect(result.position).toBe("junior");
    expect(result.industry).toBe("retail");
  });

  it("counts multi-chip answers capped at 5", () => {
    const answers: AssessmentAnswer[] = [
      {
        questionId: "q3-daily-tasks",
        value: ["email", "report", "meeting", "customer", "content", "process"],
      },
    ];
    const result = calculateResult(answers);
    expect(result.dailyTasks).toHaveLength(6);
    expect(result.totalScore).toBeGreaterThanOrEqual(5);
  });

  it("marks skipBasicModules at high level", () => {
    const answers: AssessmentAnswer[] = [
      { questionId: "q1-position", value: "manager" },
      { questionId: "q4-ai-frequency", value: "daily" },
      { questionId: "q5-ai-skill", value: "4" },
    ];
    const result = calculateResult(answers);
    expect(result.aiLevel).toBeGreaterThanOrEqual(3);
  });
});
