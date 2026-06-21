import { describe, expect, it } from "vitest";
import {
  LEARNING_MODULES,
  getLearningModulesByRole,
  getNextModuleId,
} from "./learning-modules-data";

describe("learning-modules-data", () => {
  it("covers 6 roles, each with >=6 modules", () => {
    // Tổng module mở rộng dần (HR/Hành chính thêm bài) — kiểm tra tối thiểu,
    // không cứng số tổng để tránh stale khi kho bài tiếp tục mở rộng.
    const roles = [
      "nhan-su",
      "kinh-doanh",
      "ke-toan",
      "marketing",
      "van-hanh",
      "khac",
    ];
    let total = 0;
    for (const role of roles) {
      const count = getLearningModulesByRole(role).length;
      expect(count).toBeGreaterThanOrEqual(6);
      total += count;
    }
    expect(LEARNING_MODULES.length).toBe(total);
  });

  it("resolves next module in role order", () => {
    expect(getNextModuleId("marketing", "marketing-m1")).toBe("marketing-m2");
    expect(getNextModuleId("marketing", "marketing-m6")).toBeNull();
  });

  it("each module has sections and practice prompt", () => {
    for (const m of LEARNING_MODULES) {
      expect(m.sections.length).toBeGreaterThanOrEqual(4);
      expect(m.content.length).toBeGreaterThan(50);
      expect(m.practice_prompt.length).toBeGreaterThan(10);
    }
  });

  it("nhan-su practice modules expose downloadable sample files", () => {
    const hrWithFiles = LEARNING_MODULES.filter(
      (m) => m.role_id === "nhan-su" && m.attached_file,
    );
    expect(hrWithFiles.length).toBeGreaterThanOrEqual(14);
    for (const mod of hrWithFiles) {
      expect(mod.attached_file!.path.startsWith("/files/hr/")).toBe(true);
      expect(mod.attached_file!.name.length).toBeGreaterThan(3);
      expect(mod.attached_file!.desc.length).toBeGreaterThan(10);
    }
  });
});
