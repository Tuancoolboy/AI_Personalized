import { describe, expect, it } from "vitest";
import {
  RECOMMENDER_ENGINE_VERSION,
  rankModules,
  type RecommendableModule,
  type RecommenderInput,
} from "./recommender";

const baseModules: RecommendableModule[] = [
  {
    id: "kinh-doanh-m1",
    roleId: "kinh-doanh",
    level: 1,
    sortOrder: 1,
    scope: "global",
    status: "published",
    prerequisites: [],
    goalTags: ["email"],
  },
  {
    id: "kinh-doanh-m2",
    roleId: "kinh-doanh",
    level: 2,
    sortOrder: 2,
    scope: "global",
    status: "published",
    prerequisites: ["kinh-doanh-m1"],
    goalTags: ["report"],
  },
  {
    id: "ke-toan-m1",
    roleId: "ke-toan",
    level: 1,
    sortOrder: 1,
    scope: "global",
    status: "published",
    prerequisites: [],
  },
  {
    id: "common-m1",
    roleId: "common",
    level: 1,
    sortOrder: 0,
    scope: "global",
    status: "published",
    prerequisites: [],
  },
];

function baseInput(
  overrides: Partial<RecommenderInput> = {},
): RecommenderInput {
  return {
    organizationId: null,
    roleId: "kinh-doanh",
    aiLevel: 1,
    masteredModuleIds: [],
    modules: baseModules,
    ...overrides,
  };
}

describe("pathRecommender rankModules", () => {
  it("prefers role match over other role modules", () => {
    const result = rankModules(baseInput());
    expect(result[0]?.moduleId).toBe("common-m1");
    expect(result.some((r) => r.moduleId === "kinh-doanh-m1")).toBe(true);
    expect(result.some((r) => r.moduleId === "ke-toan-m1")).toBe(false);
  });

  it("boosts assessment gap modules", () => {
    const mastered = ["common-m1", "kinh-doanh-m1"];
    const withoutGap = rankModules(
      baseInput({ masteredModuleIds: mastered }),
    );
    const withGap = rankModules(
      baseInput({
        masteredModuleIds: mastered,
        assessmentGapModuleIds: ["kinh-doanh-m2"],
      }),
    );
    const m2Without = withoutGap.find((r) => r.moduleId === "kinh-doanh-m2");
    const m2With = withGap.find((r) => r.moduleId === "kinh-doanh-m2");
    expect(m2With?.score ?? 0).toBeGreaterThan(m2Without?.score ?? 0);
    expect(m2With?.reasonCodes).toContain("assessment-gap");
  });

  it("removes candidates when prerequisite is unsatisfied", () => {
    const result = rankModules(baseInput());
    expect(result.some((r) => r.moduleId === "kinh-doanh-m2")).toBe(false);

    const unlocked = rankModules(
      baseInput({ masteredModuleIds: ["kinh-doanh-m1"] }),
    );
    expect(unlocked.some((r) => r.moduleId === "kinh-doanh-m2")).toBe(true);
  });

  it("removes already mastered modules", () => {
    const result = rankModules(
      baseInput({ masteredModuleIds: ["kinh-doanh-m1", "common-m1"] }),
    );
    expect(result.some((r) => r.moduleId === "kinh-doanh-m1")).toBe(false);
  });

  it("adds manager priority points", () => {
    const base = rankModules(
      baseInput({ masteredModuleIds: ["common-m1"] }),
    );
    const boosted = rankModules(
      baseInput({
        masteredModuleIds: ["common-m1"],
        managerPriorityModuleIds: ["kinh-doanh-m1"],
      }),
    );
    const baseScore = base.find((r) => r.moduleId === "kinh-doanh-m1")?.score ?? 0;
    const boostedScore =
      boosted.find((r) => r.moduleId === "kinh-doanh-m1")?.score ?? 0;
    expect(boostedScore).toBeGreaterThan(baseScore);
    expect(
      boosted.find((r) => r.moduleId === "kinh-doanh-m1")?.reasonCodes,
    ).toContain("manager-priority");
  });

  it("is deterministic for same input", () => {
    const input = baseInput({
      masteredModuleIds: ["common-m1"],
      assessmentGapModuleIds: ["kinh-doanh-m1"],
      goalTags: ["email"],
    });
    const first = rankModules(input);
    for (let i = 0; i < 100; i += 1) {
      expect(rankModules(input)).toEqual(first);
    }
  });

  it("exports stable engine version", () => {
    expect(RECOMMENDER_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
