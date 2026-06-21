import { describe, expect, it } from "vitest";
import {
  groupLatestRecommendationsByUser,
  mapRecommendationRows,
} from "./manager-recommendations";

describe("manager-recommendations", () => {
  it("groups latest recommendation batch per user", () => {
    const rows = [
      {
        user_id: "u1",
        candidate_module_id: "kinh-doanh-m1",
        score: 80,
        reason_codes: ["role-match"],
        engine_version: "1.0.0",
        created_at: "2026-06-13T10:00:00.000Z",
      },
      {
        user_id: "u1",
        candidate_module_id: "kinh-doanh-m2",
        score: 90,
        reason_codes: ["level-fit"],
        engine_version: "1.0.0",
        created_at: "2026-06-13T10:00:01.000Z",
      },
      {
        user_id: "u1",
        candidate_module_id: "kinh-doanh-m3",
        score: 70,
        reason_codes: ["role-match"],
        engine_version: "1.0.0",
        created_at: "2026-06-13T09:00:00.000Z",
      },
    ];

    const grouped = groupLatestRecommendationsByUser(rows);
    const batch = grouped.get("u1") ?? [];
    expect(batch).toHaveLength(2);
    expect(batch[0].candidate_module_id).toBe("kinh-doanh-m2");
  });

  it("maps reason codes to Vietnamese labels", () => {
    const mapped = mapRecommendationRows([
      {
        user_id: "u1",
        candidate_module_id: "kinh-doanh-m1",
        score: 85,
        reason_codes: ["role-match", "level-fit"],
        engine_version: "1.0.0",
        created_at: "2026-06-13T10:00:00.000Z",
      },
    ]);
    expect(mapped[0].reasonLabels[0]).toContain("vai trò");
  });
});
