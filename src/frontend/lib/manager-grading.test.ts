import { describe, expect, it } from "vitest";
import { resolveManagerReviewDecision } from "./manager-grading";

describe("manager-grading", () => {
  it("accept keeps score and approves", () => {
    expect(resolveManagerReviewDecision("accept", 72)).toEqual({
      reviewStatus: "auto-approved",
      finalScore: 72,
    });
  });

  it("adjust clamps score and approves", () => {
    expect(resolveManagerReviewDecision("adjust", 68, 75)).toEqual({
      reviewStatus: "auto-approved",
      finalScore: 75,
    });
    expect(resolveManagerReviewDecision("adjust", 68, 150).finalScore).toBe(100);
  });

  it("needs-revision keeps score", () => {
    expect(resolveManagerReviewDecision("needs-revision", 55)).toEqual({
      reviewStatus: "needs-revision",
      finalScore: 55,
    });
  });
});
