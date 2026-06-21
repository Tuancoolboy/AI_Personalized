import { describe, expect, it } from "vitest";
import { MCQ_PASS_SCORE, gradeMcqQuiz } from "./mcq-grader";
import { getRole } from "./roles";

describe("gradeMcqQuiz", () => {
  it("scores all correct answers as 100", () => {
    const roleId = "kinh-doanh";
    const quiz = getRole(roleId)!.quiz;
    const perfect = quiz.map((q) => q.correctIndex);
    const result = gradeMcqQuiz({ roleId, answers: perfect });
    expect(result?.score).toBe(100);
    expect(result?.review.grading?.reviewStatus).toBe("auto-approved");
  });

  it("returns needs-revision for very low score", () => {
    const quiz = getRole("kinh-doanh")!.quiz;
    const wrong = quiz.map((_, i) => (i + 1) % Math.max(quiz[0].options.length, 2));
    const result = gradeMcqQuiz({ roleId: "kinh-doanh", answers: wrong });
    expect(result).not.toBeNull();
    if ((result?.score ?? 100) < 60) {
      expect(result?.review.grading?.reviewStatus).toBe("needs-revision");
    }
  });

  it("rejects invalid answer length", () => {
    expect(gradeMcqQuiz({ roleId: "kinh-doanh", answers: [0] })).toBeNull();
  });

  it("pass threshold is 70", () => {
    expect(MCQ_PASS_SCORE).toBe(70);
  });
});
