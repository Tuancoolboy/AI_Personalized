import { describe, expect, it } from "vitest";
import {
  formatOrgAssessmentSignals,
  type OrgAssessmentSignals,
} from "./manager-analytics-summary";

describe("formatOrgAssessmentSignals", () => {
  it("returns empty string when grading schema unavailable", () => {
    expect(
      formatOrgAssessmentSignals({
        managerReviewCount: 0,
        needsRevisionCount: 0,
        belowPassQuizCount: 0,
        schemaAvailable: false,
      }),
    ).toBe("");
  });

  it("formats org-level assessment signals in Vietnamese", () => {
    const text = formatOrgAssessmentSignals({
      managerReviewCount: 3,
      needsRevisionCount: 1,
      belowPassQuizCount: 2,
      schemaAvailable: true,
    });

    expect(text).toContain("manager-review");
    expect(text).toContain("needs-revision");
    expect(text).toContain("3");
    expect(text).toContain("dưới 70%");
  });
});

describe("manager analytics empty team (P2-EVAL-02 slice)", () => {
  it("zero counts still produce valid summary block", () => {
    const signals: OrgAssessmentSignals = {
      managerReviewCount: 0,
      needsRevisionCount: 0,
      belowPassQuizCount: 0,
      schemaAvailable: true,
    };
    const text = formatOrgAssessmentSignals(signals);
    expect(text).toContain("0");
    expect(text).not.toContain("undefined");
  });
});
