import { describe, expect, it, vi } from "vitest";
import {
  buildRecommendationSummary,
  loadManagerPriorityModuleIds,
  loadRecommenderUserContext,
} from "./recommender-context";

function makeQueryResult<T>(data: T, error: null = null) {
  const result = { data, error };
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => chain,
    then: (resolve: (value: typeof result) => unknown) =>
      Promise.resolve(resolve(result)),
  };
  return chain;
}

describe("buildRecommendationSummary", () => {
  it("joins top reason labels into Vietnamese summary", () => {
    const summary = buildRecommendationSummary("Viết email bán hàng", [
      "Phù hợp vai trò công việc của bạn",
      "Bù khoảng trống từ bài đánh giá đầu vào",
    ]);
    expect(summary).toContain("Viết email bán hàng");
    expect(summary).toContain("Phù hợp vai trò");
  });
});

describe("loadManagerPriorityModuleIds", () => {
  it("uses the newest active assignment when multiple rows exist", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "learning_assignments") {
          return makeQueryResult(
            [
              { learning_path_id: "new-path", status: "active" },
              { learning_path_id: "old-path", status: "active" },
            ],
            null,
          );
        }
        if (table === "learning_path_modules") {
          return makeQueryResult(
            [
              { legacy_module_id: "m-new-1" },
              { legacy_module_id: "m-new-2" },
            ],
            null,
          );
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never;

    const ids = await loadManagerPriorityModuleIds(supabase, "user-1", []);

    expect(ids).toEqual(["m-new-1", "m-new-2"]);
  });
});

describe("loadRecommenderUserContext", () => {
  it("preserves nhan-su role from profile (không hạ về khac)", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return makeQueryResult({
            role_id: "nhan-su",
            ai_level: 2,
            assessment_result: { dailyTasks: ["tuyen-dung"] },
          });
        }
        if (table === "module_progress") {
          return makeQueryResult([]);
        }
        if (table === "organization_members") {
          return makeQueryResult(null);
        }
        if (table === "learning_assignments") {
          return makeQueryResult([]);
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never;

    const ctx = await loadRecommenderUserContext(supabase, "user-hr");

    expect(ctx.roleId).toBe("nhan-su");
    expect(ctx.goalTags).toEqual(["tuyen-dung"]);
  });
});
