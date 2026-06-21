import { describe, expect, it } from "vitest";
import {
  buildAllHocTapDepartmentOptions,
  buildDemoHocTapDepartmentOptions,
  buildHocTapDepartmentOptions,
  getHocTapDepartmentLabel,
  mergeHocTapDepartmentFilterOptions,
  normalizeDepartmentId,
} from "@/lib/hoc-tap-departments";

describe("hoc-tap departments", () => {
  it("builds department options from database ids and puts current department first", () => {
    const departments = buildHocTapDepartmentOptions(
      ["marketing", "kinh-doanh", "marketing", "ke-toan"],
      "marketing",
      "supabase",
    );

    expect(departments.map((department) => department.id)).toEqual([
      "marketing",
      "kinh-doanh",
      "ke-toan",
    ]);
    expect(departments[0]).toMatchObject({
      id: "marketing",
      label: "Marketing",
      memberCount: 2,
      isCurrentUserDepartment: true,
      source: "supabase",
    });
  });

  it("normalizes unknown or missing database department ids to khac", () => {
    expect(normalizeDepartmentId("dao-tao")).toBe("khac");
    expect(normalizeDepartmentId(null)).toBe("khac");

    const departments = buildHocTapDepartmentOptions(
      ["dao-tao", null, "van-hanh"],
      "dao-tao",
      "supabase",
    );

    expect(departments.map((department) => department.id)).toEqual([
      "khac",
      "van-hanh",
    ]);
    expect(departments[0]?.memberCount).toBe(2);
  });

  it("uses learning-role labels for hoc-tap department names", () => {
    expect(getHocTapDepartmentLabel("van-hanh")).toBe("Hành chính / HR");
    expect(getHocTapDepartmentLabel("khac")).toBe("Văn phòng / Khác");
  });

  it("merges real department counts with all canonical quiz departments", () => {
    const departments = mergeHocTapDepartmentFilterOptions(
      buildHocTapDepartmentOptions(
        ["marketing", "marketing", "van-hanh"],
        "marketing",
        "supabase",
      ),
      "marketing",
    );

    expect(departments.map((department) => department.id)).toEqual([
      "marketing",
      "kinh-doanh",
      "ke-toan",
      "van-hanh",
      "khac",
    ]);
    expect(departments[0]).toMatchObject({
      id: "marketing",
      memberCount: 2,
      isCurrentUserDepartment: true,
    });
    expect(departments.find((department) => department.id === "van-hanh"))
      .toMatchObject({
        label: "Hành chính / HR",
        memberCount: 1,
      });
    expect(departments.find((department) => department.id === "khac"))
      .toMatchObject({
        label: "Văn phòng / Khác",
        memberCount: 0,
      });
  });

  it("builds all fallback filter options when the API is unavailable", () => {
    const departments = buildAllHocTapDepartmentOptions("van-hanh");

    expect(departments.map((department) => department.id)).toEqual([
      "kinh-doanh",
      "ke-toan",
      "marketing",
      "van-hanh",
      "khac",
    ]);
    expect(departments[3]).toMatchObject({
      id: "van-hanh",
      label: "Hành chính / HR",
      isCurrentUserDepartment: true,
    });
  });

  it("builds demo fallback options from demo team departments", () => {
    const departments = buildDemoHocTapDepartmentOptions("van-hanh");

    expect(departments.map((department) => department.id)).toEqual([
      "van-hanh",
      "kinh-doanh",
      "ke-toan",
      "marketing",
    ]);
    expect(departments[0]).toMatchObject({
      id: "van-hanh",
      label: "Hành chính / HR",
      memberCount: 3,
      isCurrentUserDepartment: true,
      source: "demo",
    });
  });
});
